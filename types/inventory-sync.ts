// Inventory Sync Types

export interface LegacyInventoryItem {
  barcode: string;
  productCode: string;
  name: string;
  retailPrice: number;
  onHandQuantity: number;
  baseUnitCode: string;
  categoryName: string;
  categoryId: string;
  siteCode: string;
  siteName: string;
}

export interface SyncStats {
  totalFetched: number;
  productsCreated: number;
  productsUpdated: number;
  inventoriesCreated: number;
  inventoriesUpdated: number;
  categoriesCreated: number;
  sitesCreated: number;
  errors: number;
}

export interface SyncResult {
  success: boolean;
  stats: SyncStats;
  errors: string[];
}

export interface SyncRequest {
  siteCode: string;
}

export interface SyncHistoryEntry {
  timestamp: Date;
  siteCode: string;
  siteName: string;
  result: SyncResult;
}

export interface Site {
  code: string;
  name: string;
}
