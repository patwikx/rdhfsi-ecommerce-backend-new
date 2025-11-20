'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Power, ChevronRight } from 'lucide-react';
import { deleteCategory, toggleCategoryStatus } from '@/app/actions/category-actions';
import { toast } from 'sonner';

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  parent: { name: string } | null;
  _count: { children: number; products: number };
};

type CategoryListProps = {
  categories: Category[];
  userRole: string;
};

export function CategoryList({ categories, userRole }: CategoryListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    const result = await toggleCategoryStatus(id);
    setLoading(null);

    if (result.success) {
      toast.success('Category status updated');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(id);
    const result = await deleteCategory(id);
    setLoading(null);

    if (result.success) {
      toast.success('Category deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete category');
    }
  };

  // Build tree structure
  const rootCategories = categories.filter(c => !c.parentId);
  const childMap = new Map<string, Category[]>();
  
  categories.forEach(cat => {
    if (cat.parentId) {
      if (!childMap.has(cat.parentId)) {
        childMap.set(cat.parentId, []);
      }
      childMap.get(cat.parentId)!.push(cat);
    }
  });

  const renderCategory = (category: Category, level: number = 0): React.ReactNode => {
    const children = childMap.get(category.id) || [];
    
    return (
      <React.Fragment key={category.id}>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {children.length > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium">{category.name}</span>
            </div>
          </TableCell>
          <TableCell className="font-mono text-sm text-muted-foreground">
            {category.slug}
          </TableCell>
          <TableCell>
            {category.parent ? (
              <span className="text-sm text-muted-foreground">{category.parent.name}</span>
            ) : (
              <Badge variant="outline">Root</Badge>
            )}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Badge variant={category.isActive ? 'default' : 'secondary'}>
                {category.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {category.isFeatured && <Badge variant="outline">Featured</Badge>}
            </div>
          </TableCell>
          <TableCell className="text-center">{category._count.products}</TableCell>
          <TableCell className="text-center">{category._count.children}</TableCell>
          {['ADMIN', 'MANAGER'].includes(userRole) && (
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={loading === category.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/admin/categories/${category.id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleStatus(category.id)}>
                    <Power className="h-4 w-4 mr-2" />
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  {userRole === 'ADMIN' && (
                    <DropdownMenuItem
                      onClick={() => handleDelete(category.id, category.name)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          )}
        </TableRow>
        {children.map(child => (
          <React.Fragment key={child.id}>
            {renderCategory(child, level + 1)}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Products</TableHead>
            <TableHead className="text-center">Subcategories</TableHead>
            {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead className="w-[70px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No categories found
              </TableCell>
            </TableRow>
          ) : (
            rootCategories.map(category => renderCategory(category))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
