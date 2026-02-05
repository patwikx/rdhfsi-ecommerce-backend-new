'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Eye, EyeOff, Loader, Mail, Phone, Building2, Calendar, ShoppingBag, MessageSquare, Key, Upload, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { getUserById, updateUser, updateUserProfilePicture } from '@/app/actions/user-management'
import { toast } from 'sonner'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type UserData = {
  id: string
  name: string | null
  email: string
  phone: string | null
  companyName: string | null
  role: string
  isActive: boolean
  image: string | null
  createdAt: Date
  _count: {
    orders: number
    reviews: number
  }
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF',
    isActive: true,
  })

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const result = await getUserById(userId)

        if (result.success && result.data) {
          setUserData(result.data)
          setFormData({
            name: result.data.name || '',
            email: result.data.email,
            phone: result.data.phone || '',
            companyName: result.data.companyName || '',
            role: result.data.role as 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF',
            isActive: result.data.isActive,
          })
        } else {
          toast.error(result.error || 'Failed to fetch user')
          router.push('/admin/users')
        }
      } catch (error) {
        toast.error('An error occurred while fetching user')
        router.push('/admin/users')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const result = await updateUser(userId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName,
        role: formData.role,
        isActive: formData.isActive,
      })

      if (result.success) {
        toast.success(result.message)
        // Refresh user data
        const refreshResult = await getUserById(userId)
        if (refreshResult.success && refreshResult.data) {
          setUserData(refreshResult.data)
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An error occurred while updating user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsResettingPassword(true)

    try {
      const result = await updateUser(userId, {
        password: newPassword,
      })

      if (result.success) {
        toast.success('Password reset successfully')
        setResetPasswordOpen(false)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An error occurred while resetting password')
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploadingImage(true)

    try {
      // Upload to MinIO
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      // Update user profile picture
      const result = await updateUserProfilePicture(userId, uploadResult.fileName)

      if (result.success) {
        toast.success(result.message)
        // Refresh user data
        const refreshResult = await getUserById(userId)
        if (refreshResult.success && refreshResult.data) {
          setUserData(refreshResult.data)
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to upload image')
      console.error('Image upload error:', error)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      const result = await updateUserProfilePicture(userId, null)

      if (result.success) {
        toast.success(result.message)
        // Refresh user data
        const refreshResult = await getUserById(userId)
        if (refreshResult.success && refreshResult.data) {
          setUserData(refreshResult.data)
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to remove image')
    }
  }

  const getImageUrl = (imageFileName: string | null | undefined): string | null => {
    if (!imageFileName) return null
    // If it's already a full URL, return it
    if (imageFileName.startsWith('http')) return imageFileName
    // Otherwise, construct the public URL manually (client-side safe)
    const protocol = process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true' ? 'https' : 'http'
    const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 's3-api.rdrealty.com.ph'
    const port = process.env.NEXT_PUBLIC_MINIO_PORT && 
                 process.env.NEXT_PUBLIC_MINIO_PORT !== '80' && 
                 process.env.NEXT_PUBLIC_MINIO_PORT !== '443'
      ? `:${process.env.NEXT_PUBLIC_MINIO_PORT}`
      : ''
    const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || 'pms-bucket'
    
    return `${protocol}://${endpoint}${port}/${bucket}/${imageFileName}`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!userData) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">User Profile</h1>
          </div>
          <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter a new password for this user account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetPasswordOpen(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  disabled={isResettingPassword}
                >
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={isResettingPassword}>
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex gap-6 items-start">
            {/* Profile Image - Square/Rectangle */}
            <div className="relative group">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border-2 border-border overflow-hidden">
                {getImageUrl(userData.image) ? (
                  <Image
                    src={getImageUrl(userData.image)!}
                    alt={userData.name || 'User'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : userData.name ? (
                  <span className="text-5xl font-bold text-primary">
                    {userData.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span className="text-5xl font-bold text-primary">U</span>
                )}
              </div>
              
              {/* Upload/Remove Buttons */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
                {userData.image && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={isUploadingImage}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{userData.name}</h2>
                <Badge variant={formData.isActive ? 'default' : 'secondary'}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant={
                  formData.role === 'ADMIN' ? 'destructive' :
                  formData.role === 'MANAGER' ? 'default' :
                  formData.role === 'STAFF' ? 'secondary' : 'outline'
                }>
                  {formData.role}
                </Badge>
              </div>
              
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{userData.email}</span>
                </div>
                {userData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{userData.phone}</span>
                  </div>
                )}
                {userData.companyName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{userData.companyName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Member since {new Date(userData.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-2">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{userData._count.orders}</div>
                <div className="text-sm text-muted-foreground">Orders</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{userData._count.reviews}</div>
                <div className="text-sm text-muted-foreground">Reviews</div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 912 345 6789"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company Inc."
                />
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="role">
                  User Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Account Status</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
