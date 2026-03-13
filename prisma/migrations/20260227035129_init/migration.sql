-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "purchaseSize" REAL NOT NULL,
    "purchaseUnit" TEXT NOT NULL,
    "purchaseCostAud" REAL NOT NULL,
    "wastePercentDefault" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EssentialOilSpec" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventoryItemId" INTEGER NOT NULL,
    "dropsPerMl" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EssentialOilSpec_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreparedIngredient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "yieldAmount" REAL NOT NULL,
    "yieldUnit" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PreparedIngredientInput" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "preparedIngredientId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceInventoryItemId" INTEGER,
    "sourcePreparedId" INTEGER,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "wastePercentOverride" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreparedIngredientInput_preparedIngredientId_fkey" FOREIGN KEY ("preparedIngredientId") REFERENCES "PreparedIngredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PreparedIngredientInput_sourceInventoryItemId_fkey" FOREIGN KEY ("sourceInventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PreparedIngredientInput_sourcePreparedId_fkey" FOREIGN KEY ("sourcePreparedId") REFERENCES "PreparedIngredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "batchSize" REAL NOT NULL,
    "batchUnit" TEXT NOT NULL,
    "notes" TEXT,
    "packagingSetId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_packagingSetId_fkey" FOREIGN KEY ("packagingSetId") REFERENCES "PackagingSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeLineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipeId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceInventoryItemId" INTEGER,
    "sourcePreparedId" INTEGER,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "wastePercentOverride" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecipeLineItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecipeLineItem_sourceInventoryItemId_fkey" FOREIGN KEY ("sourceInventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecipeLineItem_sourcePreparedId_fkey" FOREIGN KEY ("sourcePreparedId") REFERENCES "PreparedIngredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackagingSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "unitsPerBatchFormula" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PackagingLineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packagingSetId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantityPerUnit" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackagingLineItem_packagingSetId_fkey" FOREIGN KEY ("packagingSetId") REFERENCES "PackagingSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PackagingLineItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "laborRatePerHour" REAL NOT NULL,
    "laborMinutesPerBatch" REAL NOT NULL,
    "overheadPercent" REAL NOT NULL,
    "targetMarginPercent" REAL NOT NULL,
    "roundingRule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EssentialOilSpec_inventoryItemId_key" ON "EssentialOilSpec"("inventoryItemId");
