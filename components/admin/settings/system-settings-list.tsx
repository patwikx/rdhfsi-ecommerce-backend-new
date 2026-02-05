'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Lock } from 'lucide-react';
import { deleteSystemSetting } from '@/app/actions/system-settings-actions';
import { toast } from 'sonner';
import type { SystemSettingListItem } from '@/app/actions/system-settings-actions';

type SystemSettingsListProps = {
  settings: SystemSettingListItem[];
  userRole: string;
};

export function SystemSettingsList({ settings, userRole }: SystemSettingsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(settings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSettings = settings.slice(startIndex, endIndex);

  // Group settings by category
  const groupedSettings = currentSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSettingListItem[]>);

  const handleDelete = async (id: string, key: string) => {
    if (!confirm(`Are you sure you want to delete setting "${key}"?`)) return;

    const result = await deleteSystemSetting(id);
    if (result.success) {
      toast.success('Setting deleted successfully');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to delete setting');
    }
  };

  const getDataTypeBadge = (dataType: string) => {
    const colors: Record<string, string> = {
      STRING: 'bg-blue-50 text-blue-700',
      NUMBER: 'bg-green-50 text-green-700',
      BOOLEAN: 'bg-purple-50 text-purple-700',
      JSON: 'bg-orange-50 text-orange-700',
      DATE: 'bg-pink-50 text-pink-700',
    };
    return <Badge variant="outline" className={colors[dataType]}>{dataType}</Badge>;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (showEllipsis) {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    } else {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return (
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, settings.length)} of {settings.length} settings
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {pages.map((page, index) =>
            typeof page === 'number' ? (
              <Button
                key={index}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-3 py-2 text-muted-foreground">
                {page}
              </span>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  if (settings.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No System Settings</h3>
        <p className="text-muted-foreground mb-4">
          Get started by creating your first system setting
        </p>
        {userRole === 'ADMIN' && (
          <Link href="/admin/settings/new">
            <Button>Create Setting</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold capitalize">{category}</h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Public</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {setting.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{setting.label}</div>
                      {setting.description && (
                        <div className="text-sm text-muted-foreground">{setting.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{setting.value}</div>
                    </TableCell>
                    <TableCell>{getDataTypeBadge(setting.dataType)}</TableCell>
                    <TableCell>
                      {setting.isPublic ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {setting.isEditable ? (
                          <>
                            <Link href={`/admin/settings/${setting.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            {userRole === 'ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(setting.id, setting.key)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            <Lock className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {renderPagination()}
    </div>
  );
}
