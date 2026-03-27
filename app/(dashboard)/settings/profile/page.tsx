import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      phone: true,
      alternativePhone: true,
      streetAddress: true,
      city: true,
      province: true,
      postalCode: true,
      companyName: true,
      taxId: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  return <ProfileSettingsForm user={user} />;
}
