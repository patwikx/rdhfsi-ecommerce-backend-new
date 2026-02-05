import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database';
import { prisma } from '@/lib/prisma';

interface LegacyInventoryItem {
  barcode: string;
  productCode: string;
  name: string;
  retailPrice: number;
  wholesalePrice: number;
  poPrice: number;
  onHandQuantity: number;
  baseUnitCode: string;
  categoryName: string;
  categoryId: string;
  siteCode: string;
  siteName: string;
}

interface ProgressUpdate {
  type: 'progress' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  stats?: {
    totalFetched: number;
    productsCreated: number;
    productsUpdated: number;
    inventoriesCreated: number;
    inventoriesUpdated: number;
    categoriesCreated: number;
    sitesCreated: number;
    errors: number;
  };
  errors?: string[];
}

export async function POST(request: NextRequest) {
  const { siteCode } = await request.json();

  if (!siteCode) {
    return new Response('Site code is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: ProgressUpdate) => {
        const data = `data: ${JSON.stringify(update)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        await syncWithProgress(siteCode, sendUpdate);
        controller.close();
      } catch (error) {
        sendUpdate({
          type: 'error',
          current: 0,
          total: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function syncWithProgress(
  siteCode: string,
  sendUpdate: (update: ProgressUpdate) => void
): Promise<void> {
  const stats = {
    totalFetched: 0,
    productsCreated: 0,
    productsUpdated: 0,
    inventoriesCreated: 0,
    inventoriesUpdated: 0,
    categoriesCreated: 0,
    sitesCreated: 0,
    errors: 0
  };
  const errors: string[] = [];

  // Fetch data
  sendUpdate({
    type: 'progress',
    current: 0,
    total: 0,
    message: 'Fetching data from legacy system...'
  });

  const legacyData = await fetchLegacyInventory(siteCode);
  stats.totalFetched = legacyData.length;

  sendUpdate({
    type: 'progress',
    current: 0,
    total: legacyData.length,
    message: `Found ${legacyData.length} items to sync`,
    stats
  });

  // Process items
  for (let i = 0; i < legacyData.length; i++) {
    const item = legacyData[i];
    
    try {
      await syncSingleItem(item, stats);
      
      // Send progress update every item
      sendUpdate({
        type: 'progress',
        current: i + 1,
        total: legacyData.length,
        message: `Syncing: ${item.name.substring(0, 50)}...`,
        stats
      });
      
    } catch (error) {
      stats.errors++;
      const errorMsg = `Error syncing ${item.barcode}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
    }
  }

  // Update category item counts
  sendUpdate({
    type: 'progress',
    current: legacyData.length,
    total: legacyData.length,
    message: 'Updating category counts...',
    stats
  });

  await updateCategoryCounts();

  // Send completion
  sendUpdate({
    type: 'complete',
    current: legacyData.length,
    total: legacyData.length,
    message: 'Sync completed successfully!',
    stats,
    errors
  });
}

async function updateCategoryCounts(): Promise<void> {
  const categories = await prisma.category.findMany({
    where: { isActive: true }
  });

  for (const category of categories) {
    const count = await prisma.product.count({
      where: {
        categoryId: category.id,
        isActive: true,
        isPublished: true
      }
    });

    await prisma.category.update({
      where: { id: category.id },
      data: { itemCount: count }
    });
  }
}

async function fetchLegacyInventory(siteCode: string): Promise<LegacyInventoryItem[]> {
  const pool = await getConnection();

  const query = `
select a.productCode as productCode,
       a.Barcode as Barcode, 
       a.name as Description, 
       a.retailPrice as SRP, 
       a.wholesalePrice as [Wholesale Price], 
	   a.price4 as [PO Price],
       iq.onHandQuantity as Quantity, 
       a.baseUnitCode as UoM, 
       c.categoryId as categoryId,
       c.name as Category,
       s.siteCode as siteCode,
       s.name as Site 
from Product as a
left join dbo.InventoryQuantity as iq 
    on a.productCode = iq.productCode
left join dbo.Site as s 
    on iq.siteCode = s.siteCode
left join dbo.Category as c 
    on a.departmentId = c.categoryId
    WHERE iq.siteCode = @siteCode
      AND a.isConcession = '0'
      AND a.status = 'A'
      AND iq.onHandQuantity > 0
      AND c.name NOT LIKE '%Consignment%'
    ORDER BY iq.updateDate DESC
  `;

  const result = await pool.request()
    .input('siteCode', siteCode)
    .query(query);

  return result.recordset.map(row => ({
    barcode: row.Barcode || '',
    productCode: row.productCode || '',
    name: row.Description || '',
    retailPrice: parseFloat(row.SRP) || 0,
    wholesalePrice: parseFloat(row['Wholesale Price']) || 0,
    poPrice: parseFloat(row['PO Price']) || 0,
    onHandQuantity: parseFloat(row.Quantity) || 0,
    baseUnitCode: row.UoM || 'PC',
    categoryName: row.Category || 'Uncategorized',
    categoryId: row.categoryId || '',
    siteCode: row.siteCode || '',
    siteName: row.Site || ''
  }));
}

async function syncSingleItem(
  item: LegacyInventoryItem,
  stats: {
    productsCreated: number;
    productsUpdated: number;
    inventoriesCreated: number;
    inventoriesUpdated: number;
    categoriesCreated: number;
    sitesCreated: number;
  }
): Promise<void> {
  // 1. Ensure Site exists
  const site = await ensureSite(item.siteCode, item.siteName);
  if (!site.existed) {
    stats.sitesCreated++;
  }

  // 2. Ensure Category exists
  const category = await ensureCategory(item.categoryName);
  if (!category.existed) {
    stats.categoriesCreated++;
  }

  // 3. Upsert Product
  const product = await upsertProduct(item, category.id, site.shouldEnableOnSale);
  if (product.created) {
    stats.productsCreated++;
  } else {
    stats.productsUpdated++;
  }

  // 4. Upsert Inventory
  const inventory = await upsertInventory(product.id, site.id, item.onHandQuantity);
  if (inventory.created) {
    stats.inventoriesCreated++;
  } else {
    stats.inventoriesUpdated++;
  }
}

async function ensureSite(siteCode: string, siteName: string) {
  const existing = await prisma.site.findUnique({
    where: { code: siteCode }
  });

  // Only site 026 (SANTIAGO - MARKDOWN SITE) should enable isOnSale
  const shouldEnableOnSale = siteCode === '026';

  if (existing) {
    return { id: existing.id, existed: true, isMarkdown: existing.isMarkdown, shouldEnableOnSale };
  }

  // Determine if this is a markdown site based on name
  const isMarkdownSite = siteName.toUpperCase().includes('MARKDOWN');
  
  // Determine site type based on code and name
  let siteType: 'WAREHOUSE' | 'STORE' = 'STORE';
  if (siteCode === '001' || siteName.toUpperCase().includes('WAREHOUSE')) {
    siteType = 'WAREHOUSE';
  }

  const newSite = await prisma.site.create({
    data: {
      code: siteCode,
      name: siteName,
      type: siteType,
      isMarkdown: isMarkdownSite,
      isActive: true
    }
  });

  return { id: newSite.id, existed: false, isMarkdown: isMarkdownSite, shouldEnableOnSale };
}

async function ensureCategory(categoryName: string) {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const existing = await prisma.category.findUnique({
    where: { slug }
  });

  if (existing) {
    return { id: existing.id, existed: true };
  }

  const newCategory = await prisma.category.create({
    data: {
      name: categoryName,
      slug,
      isActive: true,
      itemCount: 0
    }
  });

  return { id: newCategory.id, existed: false };
}

async function upsertProduct(item: LegacyInventoryItem, categoryId: string, shouldEnableOnSale: boolean) {
  const slug = `${item.barcode}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.substring(0, 100);

  const existing = await prisma.product.findUnique({
    where: { barcode: item.barcode }
  });

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: item.name,
        retailPrice: item.retailPrice,
        wholesalePrice: item.wholesalePrice,
        poPrice: item.poPrice,
        baseUom: item.baseUnitCode,
        categoryId,
        legacyProductCode: item.productCode,
        isOnSale: shouldEnableOnSale ? true : existing.isOnSale,
        lastSyncedAt: new Date()
      }
    });

    return { id: existing.id, created: false };
  }

  const newProduct = await prisma.product.create({
    data: {
      sku: item.productCode || item.barcode,
      barcode: item.barcode,
      name: item.name,
      slug,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
      poPrice: item.poPrice,
      baseUom: item.baseUnitCode,
      categoryId,
      legacyProductCode: item.productCode,
      isActive: true,
      isPublished: true,
      isOnSale: shouldEnableOnSale
    }
  });

  return { id: newProduct.id, created: true };
}

async function upsertInventory(productId: string, siteId: string, quantity: number) {
  const existing = await prisma.inventory.findUnique({
    where: {
      productId_siteId: {
        productId,
        siteId
      }
    }
  });

  const quantityDecimal = Number(quantity);
  const availableQty = quantityDecimal;

  if (existing) {
    await prisma.inventory.update({
      where: { id: existing.id },
      data: {
        quantity: quantityDecimal,
        availableQty,
        lastSyncedAt: new Date()
      }
    });

    return { id: existing.id, created: false };
  }

  const newInventory = await prisma.inventory.create({
    data: {
      productId,
      siteId,
      quantity: quantityDecimal,
      reservedQty: 0,
      availableQty,
      lastSyncedAt: new Date()
    }
  });

  return { id: newInventory.id, created: true };
}
