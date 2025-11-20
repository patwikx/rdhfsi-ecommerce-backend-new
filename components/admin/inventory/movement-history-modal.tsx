'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getInventoryMovements } from '@/app/actions/inventory-actions';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

type Inventory = {
  id: string;
  product: {
    name: string;
    sku: string;
    baseUom: string;
  };
  site: {
    name: string;
  };
};

type Movement = {
  id: string;
  movementType: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
};

type MovementHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  inventory: Inventory;
};

export function MovementHistoryModal({ open, onClose, inventory }: MovementHistoryModalProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadMovements();
    }
  }, [open]);

  const loadMovements = async () => {
    setLoading(true);
    const result = await getInventoryMovements(inventory.id);
    if (result.success) {
      setMovements(result.data || []);
    }
    setLoading(false);
  };

  const getMovementColor = (type: string) => {
    if (type.includes('IN') || type === 'STOCK_IN') return 'default';
    if (type.includes('OUT') || type === 'STOCK_OUT') return 'secondary';
    if (type === 'DAMAGE' || type === 'THEFT') return 'destructive';
    return 'outline';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movement History</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg p-3 bg-muted/50 space-y-1 mb-4">
          <p className="font-semibold">{inventory.product.name}</p>
          <p className="text-sm text-muted-foreground">SKU: {inventory.product.sku}</p>
          <p className="text-sm text-muted-foreground">Site: {inventory.site.name}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No movement history found
          </div>
        ) : (
          <div className="space-y-3">
            {movements.map((movement) => (
              <div key={movement.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getMovementColor(movement.movementType)}>
                      {movement.movementType.replace(/_/g, ' ')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {movement.quantityChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${movement.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange} {inventory.product.baseUom}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(movement.createdAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Before: {movement.quantityBefore}</span>
                  <span>→</span>
                  <span>After: {movement.quantityAfter}</span>
                </div>

                {movement.reason && (
                  <p className="text-sm">
                    <span className="font-medium">Reason:</span> {movement.reason}
                  </p>
                )}

                {movement.notes && (
                  <p className="text-sm text-muted-foreground">
                    {movement.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
