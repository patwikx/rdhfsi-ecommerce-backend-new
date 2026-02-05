'use client';

import { useEffect, useState } from 'react';
import { CategoryList } from '@/components/admin/categories/category-list';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAllCategories } from '@/app/actions/category-actions';
import { useCurrentSite } from '@/hooks/use-current-site';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  itemCount: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  parent: { name: string } | null;
  _count: { children: number; products: number };
  siteProductCount?: number;
};

type CategoriesPageClientProps = {
  userRole: string;
};

export function CategoriesPageClient({ userRole }: CategoriesPageClientProps) {
  const { siteId, isLoading: siteLoading } = useCurrentSite();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      if (!siteId) return;
      
      setIsLoading(true);
      const result = await getAllCategories(siteId);
      
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        toast.error(result.error || 'Failed to load categories');
      }
      setIsLoading(false);
    }

    loadCategories();
  }, [siteId]);

  if (siteLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate stats
  const activeCount = categories.filter(c => c.isActive).length;
  const featuredCount = categories.filter(c => c.isFeatured).length;
  const parentCount = categories.filter(c => !c.parentId).length;
  const totalProducts = categories.reduce((sum, c) => sum + (c.siteProductCount || c._count.products), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories and subcategories
          </p>
        </div>
        {['ADMIN', 'MANAGER'].includes(userRole) && (
          <Button asChild>
            <Link href="/admin/categories/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Categories</p>
          </div>
          <p className="text-2xl font-bold">{categories.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Featured</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{featuredCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Products at Site</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{totalProducts}</p>
        </div>
      </div>

      <CategoryList categories={categories} userRole={userRole} />
    </div>
  );
}
