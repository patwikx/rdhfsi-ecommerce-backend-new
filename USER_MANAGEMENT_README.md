# User Management System

A comprehensive user management system for ADMIN, STAFF, and MANAGER roles.

## Features

### 1. User List Page (`/admin/users`)
- View all users with pagination
- Search by name or email
- Filter by role (CUSTOMER, CORPORATE, STAFF, MANAGER, ADMIN)
- Filter by status (Active/Inactive)
- Display user statistics (orders count)
- Quick actions: Edit, Activate/Deactivate, Delete

### 2. Create User Page (`/admin/users/new`)
- Create new user accounts
- Set user role
- Set initial password
- Set account status (Active/Inactive)
- Form validation

### 3. Edit User Page (`/admin/users/[id]`)
- Update user information
- Change user role
- Reset password (optional)
- Toggle account status
- View user statistics (orders, reviews, member since)

## Authorization

Only users with the following roles can access the user management system:
- **ADMIN**: Full access to all features, including managing other admins
- **MANAGER**: Can manage all users except admins
- **STAFF**: Can manage all users except admins and managers

### Permission Rules

1. **Creating Users**
   - Only ADMIN can create ADMIN users
   - MANAGER and STAFF can create CUSTOMER, CORPORATE, and STAFF users

2. **Updating Users**
   - Only ADMIN can update ADMIN users
   - Only ADMIN can assign ADMIN role
   - MANAGER and STAFF can update other user types

3. **Deleting Users**
   - Only ADMIN can delete ADMIN users
   - Users cannot delete themselves
   - Deletion is a soft delete (sets isActive to false)

4. **Status Toggle**
   - Only ADMIN can toggle ADMIN user status
   - Users cannot change their own status

## Server Actions

All operations are handled through server actions in `app/actions/user-management.ts`:

- `getUsers()` - Fetch users with pagination and filters
- `getUserById()` - Get single user details
- `createUser()` - Create new user
- `updateUser()` - Update user information
- `deleteUser()` - Soft delete user (deactivate)
- `toggleUserStatus()` - Toggle active/inactive status

## Activity Logging

All user management actions are logged in the `ActivityLog` table:
- CREATE_USER
- UPDATE_USER
- DELETE_USER
- TOGGLE_USER_STATUS

## UI Components Used

- Button
- Input
- Select
- Table
- Pagination
- Badge
- Switch
- Card
- AlertDialog
- DropdownMenu
- Toast notifications (sonner)

## Navigation

Add a link to the user management page in your admin navigation:

```tsx
<Link href="/admin/users">
  <Users className="w-4 h-4 mr-2" />
  User Management
</Link>
```

## Security

- All server actions check user authorization
- Passwords are hashed using bcryptjs
- Email uniqueness is enforced
- Form validation using Zod schemas
- Protection against self-deletion and self-status-change

## Styling

The UI follows your existing design system:
- Consistent with other admin pages
- Responsive layout
- Theme-aware components
- Proper spacing and typography
- Loading states and error handling
