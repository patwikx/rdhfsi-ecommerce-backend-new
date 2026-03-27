'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/lib/actions/password-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProfileUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  phone: string | null;
  alternativePhone: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  companyName: string | null;
  taxId: string | null;
};

type Props = {
  user: ProfileUser;
};

export function ProfileSettingsForm({ user }: Props) {
  const { update } = useSession();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    alternativePhone: user.alternativePhone || '',
    streetAddress: user.streetAddress || '',
    city: user.city || '',
    province: user.province || '',
    postalCode: user.postalCode || '',
    companyName: user.companyName || '',
    taxId: user.taxId || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const resetPasswordFields = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          alternativePhone: profile.alternativePhone.trim(),
          streetAddress: profile.streetAddress.trim(),
          city: profile.city.trim(),
          province: profile.province.trim(),
          postalCode: profile.postalCode.trim(),
          companyName: profile.companyName.trim(),
          taxId: profile.taxId.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      await update();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update password');
        return;
      }

      resetPasswordFields();
      setPasswordDialogOpen(false);
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account information and password.</p>
        </div>

        <Dialog
          open={passwordDialogOpen}
          onOpenChange={(open) => {
            setPasswordDialogOpen(open);
            if (!open) {
              resetPasswordFields();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Use a strong password with at least 8 characters.</DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(event) =>
                    setPasswordData((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(event) => setPasswordData((prev) => ({ ...prev, newPassword: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(event) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    resetPasswordFields();
                  }}
                  disabled={isSavingPassword}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Update your profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={profile.role} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="09XXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternativePhone">Alternative phone</Label>
                <Input
                  id="alternativePhone"
                  value={profile.alternativePhone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, alternativePhone: event.target.value }))}
                  placeholder="Alternative contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(event) => setProfile((prev) => ({ ...prev, companyName: event.target.value }))}
                  placeholder="Company"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="streetAddress">Street address</Label>
                <Input
                  id="streetAddress"
                  value={profile.streetAddress}
                  onChange={(event) => setProfile((prev) => ({ ...prev, streetAddress: event.target.value }))}
                  placeholder="Street and building"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={profile.province}
                  onChange={(event) => setProfile((prev) => ({ ...prev, province: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  value={profile.postalCode}
                  onChange={(event) => setProfile((prev) => ({ ...prev, postalCode: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  value={profile.taxId}
                  onChange={(event) => setProfile((prev) => ({ ...prev, taxId: event.target.value }))}
                  placeholder="Tax identification number"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
