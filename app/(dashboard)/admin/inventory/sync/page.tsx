'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, CheckCircle2, AlertCircle, Database, TrendingUp, Package, Warehouse, Clock, XCircle } from 'lucide-react';
import type { SyncResult, SyncHistoryEntry, Site } from '@/types/inventory-sync';
import { format } from 'date-fns';

const STORAGE_KEY = 'inventory_sync_history';

export default function InventorySyncPage() {
  const [sites] = useState<Site[]>([
    { code: '007', name: 'Santiago Branch' },
    { code: '026', name: 'SANTIAGO - MARKDOWN SITE' },
    { code: '001', name: 'Main Warehouse' },
    { code: '028', name: 'M-Warehouse - MARKDOWN SITE' }
  ]);
  
  const [selectedSite, setSelectedSite] = useState<string>('007');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  }>({ current: 0, total: 0, message: '' });

  // Load sync history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Array<Omit<SyncHistoryEntry, 'timestamp'> & { timestamp: string }>;
        // Convert timestamp strings back to Date objects
        const history: SyncHistoryEntry[] = parsed.map((entry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setSyncHistory(history);
      } catch (error) {
        console.error('Failed to load sync history:', error);
      }
    }
  }, []);

  // Save sync history to localStorage whenever it changes
  useEffect(() => {
    if (syncHistory.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syncHistory));
    }
  }, [syncHistory]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setProgress({ current: 0, total: 0, message: 'Starting sync...' });

    try {
      const response = await fetch('/api/inventory/sync-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteCode: selectedSite }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'progress') {
              setProgress({
                current: data.current,
                total: data.total,
                message: data.message
              });
              
              if (data.stats) {
                setSyncResult({
                  success: true,
                  stats: data.stats,
                  errors: []
                });
              }
            } else if (data.type === 'complete') {
              const finalResult: SyncResult = {
                success: true,
                stats: data.stats,
                errors: data.errors || []
              };
              
              setSyncResult(finalResult);
              setProgress({
                current: data.total,
                total: data.total,
                message: data.message
              });

              // Add to history
              const siteName = sites.find(s => s.code === selectedSite)?.name || selectedSite;
              setSyncHistory(prev => [
                {
                  timestamp: new Date(),
                  siteCode: selectedSite,
                  siteName,
                  result: finalResult
                },
                ...prev.slice(0, 9)
              ]);
            } else if (data.type === 'error') {
              setSyncResult({
                success: false,
                stats: {
                  totalFetched: 0,
                  productsCreated: 0,
                  productsUpdated: 0,
                  inventoriesCreated: 0,
                  inventoriesUpdated: 0,
                  categoriesCreated: 0,
                  sitesCreated: 0,
                  errors: 1
                },
                errors: data.errors || [data.message]
              });
            }
          }
        }
      }

    } catch (error) {
      setSyncResult({
        success: false,
        stats: {
          totalFetched: 0,
          productsCreated: 0,
          productsUpdated: 0,
          inventoriesCreated: 0,
          inventoriesUpdated: 0,
          categoriesCreated: 0,
          sitesCreated: 0,
          errors: 1
        },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Sync</h1>
          <p className="text-muted-foreground">
            Sync regular items (non-consignment) from legacy system
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Database className="w-4 h-4" />
          Legacy → PostgreSQL
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sync Control */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sync Control Panel */}
          <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sync Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Syncing regular items only (excludes consignment products)
            </p>
          </div>
          <Badge>Multiple Sites Available</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="site">Select Site</Label>
            <Select
              value={selectedSite}
              onValueChange={setSelectedSite}
              disabled={isSyncing}
            >
              <SelectTrigger id="site">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.code} value={site.code}>
                    {site.code} - {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full gap-2"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Start Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {isSyncing && (
          <div className="bg-muted p-4 rounded-md space-y-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">Syncing in progress...</p>
                <p className="text-sm text-muted-foreground">
                  {progress.message}
                </p>
              </div>
              {progress.total > 0 && (
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {progress.current} / {progress.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(progressPercentage)}%
                  </p>
                </div>
              )}
            </div>
            
            {progress.total > 0 && (
              <Progress value={progressPercentage} className="h-2" />
            )}
          </div>
        )}
      </div>

      {/* Sync History - Show when not syncing and no results */}
      {!isSyncing && !syncResult && syncHistory.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Sync History</h2>
            <p className="text-sm text-muted-foreground">Last {syncHistory.length} sync operations</p>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Items Fetched</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Inventories</TableHead>
                <TableHead className="text-right">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncHistory.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {entry.result.success ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.siteName}</div>
                      <div className="text-sm text-muted-foreground">{entry.siteCode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(entry.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {entry.result.stats.totalFetched}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <div className="font-medium">
                        {entry.result.stats.productsCreated + entry.result.stats.productsUpdated}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.result.stats.productsCreated}↑ {entry.result.stats.productsUpdated}↻
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <div className="font-medium">
                        {entry.result.stats.inventoriesCreated + entry.result.stats.inventoriesUpdated}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.result.stats.inventoriesCreated}↑ {entry.result.stats.inventoriesUpdated}↻
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.result.stats.errors > 0 ? (
                      <Badge variant="destructive">{entry.result.stats.errors}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sync Results */}
          {syncResult && (
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sync Results</h2>
                {syncResult.success ? (
                  <Badge className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Failed
                  </Badge>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-muted-foreground">Total Fetched</p>
                  </div>
                  <p className="text-2xl font-bold">{syncResult.stats.totalFetched}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-muted-foreground">Products</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {syncResult.stats.productsCreated + syncResult.stats.productsUpdated}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {syncResult.stats.productsCreated} new, {syncResult.stats.productsUpdated} updated
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-muted-foreground">Inventories</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {syncResult.stats.inventoriesCreated + syncResult.stats.inventoriesUpdated}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {syncResult.stats.inventoriesCreated} new, {syncResult.stats.inventoriesUpdated} updated
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  </div>
                  <p className="text-2xl font-bold">{syncResult.stats.categoriesCreated}</p>
                  <p className="text-xs text-muted-foreground">
                    {syncResult.stats.sitesCreated} sites created
                  </p>
                </div>
              </div>

              {/* Errors */}
              {syncResult.stats.errors > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {syncResult.stats.errors} Error{syncResult.stats.errors > 1 ? 's' : ''} Occurred
                      </p>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {syncResult.errors.map((error, index) => (
                          <p key={index} className="text-sm text-muted-foreground">
                            • {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Information Guide */}
        <div className="space-y-6">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">How It Works</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">1. Data Source</p>
                <p className="text-muted-foreground">
                  Connects to legacy system database to fetch inventory data
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">2. Filtering</p>
                <p className="text-muted-foreground">
                  Only syncs regular items, excluding consignment products
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">3. Processing</p>
                <p className="text-muted-foreground">
                  Creates or updates products, categories, and inventory records
                </p>
              </div>

              <div>
                <p className="font-medium mb-1">4. Real-time Updates</p>
                <p className="text-muted-foreground">
                  Progress is streamed live during the sync operation
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">What Gets Synced</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Products</p>
                  <p className="text-muted-foreground">SKU, name, description, pricing, UOM</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">Categories</p>
                  <p className="text-muted-foreground">Product classifications and groupings</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Warehouse className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Inventory</p>
                  <p className="text-muted-foreground">Stock quantities per site location</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Sites</p>
                  <p className="text-muted-foreground">Warehouse and branch locations</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 bg-muted/50">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold">Important Notes</h3>
              </div>
            </div>
            
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Sync may take several minutes for large datasets</li>
              <li>• Existing records will be updated, not duplicated</li>
              <li>• Consignment items are automatically excluded</li>
              <li>• History is saved locally in your browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
