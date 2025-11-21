'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Authorization check
async function checkAuthorization() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
    throw new Error('Unauthorized: Insufficient permissions')
  }

  return { userId: session.user.id, role: user.role }
}

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  companyName: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CUSTOMER', 'CORPORATE', 'ADMIN', 'MANAGER', 'STAFF']),
  isActive: z.boolean().default(true),
})

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
  companyName: z.string().optional(),
  role: z.enum(['CUSTOMER', 'CORPORATE', 'ADMIN', 'MANAGER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
})

// Get user statistics
export async function getUserStats() {
  try {
    await checkAuthorization()

    const [totalUsers, activeUsers, adminCount, managerCount, staffCount] = await Promise.all([
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'MANAGER', 'STAFF'] }
        }
      }),
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'MANAGER', 'STAFF'] },
          isActive: true
        }
      }),
      prisma.user.count({
        where: { role: 'ADMIN' }
      }),
      prisma.user.count({
        where: { role: 'MANAGER' }
      }),
      prisma.user.count({
        where: { role: 'STAFF' }
      }),
    ])

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminCount,
        managerCount,
        staffCount,
      },
    }
  } catch (error) {
    console.error('Get user stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user stats',
    }
  }
}

// Get all users with pagination and filters
export async function getUsers(params: {
  page?: number
  limit?: number
  search?: string
  role?: string
  isActive?: boolean
}) {
  try {
    await checkAuthorization()

    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    const where: {
      OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>
      role?: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF' | { in: Array<'ADMIN' | 'MANAGER' | 'STAFF'> }
      isActive?: boolean
    } = {
      // Only show ADMIN, MANAGER, and STAFF users
      role: { in: ['ADMIN', 'MANAGER', 'STAFF'] }
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    if (params.role && ['ADMIN', 'MANAGER', 'STAFF'].includes(params.role)) {
      where.role = params.role as 'ADMIN' | 'MANAGER' | 'STAFF'
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return {
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error('Get users error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    }
  }
}

// Get single user by ID
export async function getUserById(userId: string) {
  try {
    await checkAuthorization()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        alternativePhone: true,
        companyName: true,
        taxId: true,
        role: true,
        isActive: true,
        image: true,
        streetAddress: true,
        city: true,
        province: true,
        postalCode: true,
        creditLimit: true,
        paymentTerms: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    console.error('Get user error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    }
  }
}

// Create new user
export async function createUser(formData: z.infer<typeof createUserSchema>) {
  try {
    const { userId, role } = await checkAuthorization()

    // Only ADMIN can create ADMIN users
    if (formData.role === 'ADMIN' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only administrators can create admin users',
      }
    }

    const validatedFields = createUserSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      }
    }

    const { name, email, phone, companyName, password, role: userRole, isActive } = validatedFields.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Email already registered',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        companyName,
        password: hashedPassword,
        role: userRole,
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_USER',
        description: `Created user: ${newUser.name} (${newUser.email})`,
        metadata: { createdUserId: newUser.id },
      },
    })

    revalidatePath('/admin/users')

    return {
      success: true,
      data: newUser,
      message: 'User created successfully',
    }
  } catch (error) {
    console.error('Create user error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    }
  }
}

// Update user
export async function updateUser(userId: string, formData: z.infer<typeof updateUserSchema>) {
  try {
    const { userId: currentUserId, role } = await checkAuthorization()

    // Only ADMIN can update ADMIN users
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only administrators can update admin users',
      }
    }

    if (formData.role === 'ADMIN' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only administrators can assign admin role',
      }
    }

    const validatedFields = updateUserSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      }
    }

    const updateData: {
      name?: string
      email?: string
      phone?: string
      companyName?: string
      role?: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF'
      isActive?: boolean
      password?: string
    } = {}

    if (validatedFields.data.name) updateData.name = validatedFields.data.name
    if (validatedFields.data.email) updateData.email = validatedFields.data.email
    if (validatedFields.data.phone) updateData.phone = validatedFields.data.phone
    if (validatedFields.data.companyName !== undefined) updateData.companyName = validatedFields.data.companyName
    if (validatedFields.data.role) updateData.role = validatedFields.data.role
    if (validatedFields.data.isActive !== undefined) updateData.isActive = validatedFields.data.isActive

    // Hash password if provided
    if (validatedFields.data.password) {
      updateData.password = await bcrypt.hash(validatedFields.data.password, 10)
    }

    // Check if email is already taken by another user
    if (updateData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.email },
      })

      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Email already in use',
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE_USER',
        description: `Updated user: ${updatedUser.name} (${updatedUser.email})`,
        metadata: { updatedUserId: updatedUser.id, changes: updateData },
      },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    }
  } catch (error) {
    console.error('Update user error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    }
  }
}

// Delete user (soft delete by setting isActive to false)
export async function deleteUser(userId: string) {
  try {
    const { userId: currentUserId, role } = await checkAuthorization()

    // Prevent self-deletion
    if (userId === currentUserId) {
      return {
        success: false,
        error: 'Cannot delete your own account',
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, email: true },
    })

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Only ADMIN can delete ADMIN users
    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only administrators can delete admin users',
      }
    }

    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE_USER',
        description: `Deactivated user: ${targetUser.name} (${targetUser.email})`,
        metadata: { deletedUserId: userId },
      },
    })

    revalidatePath('/admin/users')

    return {
      success: true,
      message: 'User deactivated successfully',
    }
  } catch (error) {
    console.error('Delete user error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    }
  }
}

// Update user profile picture
export async function updateUserProfilePicture(userId: string, imageFileName: string | null) {
  try {
    const { userId: currentUserId } = await checkAuthorization()

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: imageFileName },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE_USER_PICTURE',
        description: `${imageFileName ? 'Updated' : 'Removed'} profile picture for: ${updatedUser.name} (${updatedUser.email})`,
        metadata: { updatedUserId: updatedUser.id, imageFileName },
      },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)

    return {
      success: true,
      data: updatedUser,
      message: `Profile picture ${imageFileName ? 'updated' : 'removed'} successfully`,
    }
  } catch (error) {
    console.error('Update profile picture error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile picture',
    }
  }
}

// Toggle user active status
export async function toggleUserStatus(userId: string) {
  try {
    const { userId: currentUserId, role } = await checkAuthorization()

    // Prevent self-deactivation
    if (userId === currentUserId) {
      return {
        success: false,
        error: 'Cannot change your own status',
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, name: true, email: true },
    })

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Only ADMIN can toggle ADMIN users
    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Only administrators can change admin user status',
      }
    }

    const newStatus = !targetUser.isActive

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'TOGGLE_USER_STATUS',
        description: `${newStatus ? 'Activated' : 'Deactivated'} user: ${targetUser.name} (${targetUser.email})`,
        metadata: { targetUserId: userId, newStatus },
      },
    })

    revalidatePath('/admin/users')

    return {
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
    }
  } catch (error) {
    console.error('Toggle user status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle user status',
    }
  }
}
