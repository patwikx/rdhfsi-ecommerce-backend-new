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
import { MoreHorizontal, Edit, Trash2, Power } from 'lucide-react';
import { deleteSite, toggleSiteStatus } from '@/app/actions/site-actions';
import { toast } from 'sonner';

type Site = {
  id: string;
  code: string;
  name: string;
  type: string;
  isMarkdown: boolean;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type SiteListProps = {
  sites: Site[];
  userRole: string;
};

export function SiteList({ sites, userRole }: SiteListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    const result = await toggleSiteStatus(id);
    setLoading(null);

    if (result.success) {
      toast.success('Site status updated');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(id);
    const result = await deleteSite(id);
    setLoading(null);

    if (result.success) {
      toast.success('Site deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete site');
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contact</TableHead>
            {userRole === 'ADMIN' && <TableHead className="w-[70px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No sites found
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-mono">{site.code}</TableCell>
                <TableCell className="font-medium">{site.name}</TableCell>
                <TableCell>
                  <Badge variant={site.isMarkdown ? 'destructive' : 'default'}>
                    {site.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={site.isActive ? 'default' : 'secondary'}>
                    {site.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {site.phone || site.email || '-'}
                </TableCell>
                {userRole === 'ADMIN' && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={loading === site.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/sites/${site.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(site.id)}>
                          <Power className="h-4 w-4 mr-2" />
                          {site.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(site.id, site.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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
