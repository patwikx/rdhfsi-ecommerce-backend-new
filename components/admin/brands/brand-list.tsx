'use client';

import { useState } from 'react';
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
import { MoreHorizontal, Edit, Trash2, Power, ExternalLink } from 'lucide-react';
import { deleteBrand, toggleBrandStatus } from '@/app/actions/brand-actions';
import { toast } from 'sonner';
import Image from 'next/image';

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  website: string | null;
  isFeatured: boolean;
  isActive: boolean;
  _count: { products: number };
};

type BrandListProps = {
  brands: Brand[];
  userRole: string;
};

export function BrandList({ brands, userRole }: BrandListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    const result = await toggleBrandStatus(id);
    setLoading(null);

    if (result.success) {
      toast.success('Brand status updated');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(id);
    const result = await deleteBrand(id);
    setLoading(null);

    if (result.success) {
      toast.success('Brand deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete brand');
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Products</TableHead>
            <TableHead>Website</TableHead>
            {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead className="w-[70px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No brands found
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>
                  {brand.logo ? (
                    <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No Logo
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {brand.slug}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {brand.isFeatured && <Badge variant="outline">Featured</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-center">{brand._count.products}</TableCell>
                <TableCell>
                  {brand.website ? (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                {['ADMIN', 'MANAGER'].includes(userRole) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={loading === brand.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/brands/${brand.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(brand.id)}>
                          <Power className="h-4 w-4 mr-2" />
                          {brand.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {userRole === 'ADMIN' && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(brand.id, brand.name)}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
