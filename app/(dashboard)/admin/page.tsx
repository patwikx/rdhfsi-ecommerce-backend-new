import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Building2, FolderTree, Package, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const adminSections = [
    {
      title: 'Sites',
      description: 'Manage warehouse and store locations',
      icon: Building2,
      href: '/admin/sites',
      color: 'text-blue-500',
    },
    {
      title: 'Categories',
      description: 'Organize products into categories',
      icon: FolderTree,
      href: '/admin/categories',
      color: 'text-green-500',
    },
    {
      title: 'Brands',
      description: 'Manage product brands',
      icon: Package,
      href: '/admin/brands',
      color: 'text-amber-500',
    },
    {
      title: 'Products',
      description: 'Manage product catalog',
      icon: Package,
      href: '/admin/products',
      color: 'text-purple-500',
    },
    {
      title: 'Users',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage your e-commerce platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.href} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <Icon className={`h-8 w-8 ${section.color} mb-4`} />
              <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
              <Button asChild className="w-full">
                <Link href={section.href}>
                  Manage {section.title}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
