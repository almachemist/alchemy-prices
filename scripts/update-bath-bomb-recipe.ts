/**
 * Update Bath Bomb recipe with actual ingredients and prices from production test.
 * 
 * 1kg batch yielded:
 *   - 1 large (85g)
 *   - 1 medium (60g) 
 *   - 2 small (35g each)
 *   - 1 yin-yang (53g)
 *   - 6 shells (30g each)
 *   Total: 85 + 60 + 70 + 53 + 180 = 448g (rest was waste/testing)
 * 
 * Each unit needs 1 silica gel sachet (2g, $0.1299 each)
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  PrismaClient,
  InventoryCategory,
  UnitType,
  Unit,
  SourceType,
} from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🛁 Updating Bath Bomb recipe with actual ingredients and prices...\n");

  // ── 1. Find or create inventory items with real prices ──────────────────

  console.log("Inventory items:");

  // Magnesium Flakes + MSM
  let magnesium = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Magnesium" } },
  });
  if (!magnesium) {
    magnesium = await prisma.inventoryItem.create({
      data: {
        name: "Salt & Co Magnesium Flakes + MSM",
        category: InventoryCategory.BOTANICAL,
        unitType: UnitType.G,
        purchaseUnit: Unit.G,
        purchaseSize: 750,
        purchaseCostAud: 8.00,
      },
    });
    console.log(`  + created "${magnesium.name}"`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: magnesium.id },
      data: { purchaseSize: 750, purchaseCostAud: 8.00 },
    });
    console.log(`  ✓ updated "${magnesium.name}" (750g, $8.00)`);
  }

  // Bi Carbonate Soda
  let biCarb = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Baking Soda" } },
  });
  if (!biCarb) {
    biCarb = await prisma.inventoryItem.create({
      data: {
        name: "Coles Bi Carbonate Soda",
        category: InventoryCategory.CONSUMABLE,
        unitType: UnitType.G,
        purchaseUnit: Unit.G,
        purchaseSize: 500,
        purchaseCostAud: 2.45,
      },
    });
    console.log(`  + created "${biCarb.name}"`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: biCarb.id },
      data: { 
        name: "Coles Bi Carbonate Soda",
        purchaseSize: 500, 
        purchaseCostAud: 2.45 
      },
    });
    console.log(`  ✓ updated "${biCarb.name}" (500g, $2.45)`);
  }

  // Citric Acid
  let citric = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Citric Acid" } },
  });
  if (!citric) {
    citric = await prisma.inventoryItem.create({
      data: {
        name: "Citric Acid - Bulk - Northern Chemicals",
        category: InventoryCategory.CONSUMABLE,
        unitType: UnitType.G,
        purchaseUnit: Unit.G,
        purchaseSize: 2000,
        purchaseCostAud: 14.85,
      },
    });
    console.log(`  + created "${citric.name}"`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: citric.id },
      data: { 
        name: "Citric Acid - Bulk - Northern Chemicals",
        purchaseSize: 2000, 
        purchaseCostAud: 14.85 
      },
    });
    console.log(`  ✓ updated "${citric.name}" (2kg, $14.85)`);
  }

  // Cornstarch
  let cornstarch = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Cornstarch" } },
  });
  if (!cornstarch) {
    cornstarch = await prisma.inventoryItem.create({
      data: {
        name: "Cornstarch",
        category: InventoryCategory.CONSUMABLE,
        unitType: UnitType.G,
        purchaseUnit: Unit.G,
        purchaseSize: 500,
        purchaseCostAud: 5.50,
      },
    });
    console.log(`  + created "${cornstarch.name}"`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: cornstarch.id },
      data: { purchaseSize: 500, purchaseCostAud: 5.50 },
    });
    console.log(`  ✓ updated "${cornstarch.name}" (500g, $5.50)`);
  }

  // Lavender Petals
  let lavenderPetals = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Lavender" }, category: InventoryCategory.BOTANICAL },
  });
  if (!lavenderPetals) {
    lavenderPetals = await prisma.inventoryItem.create({
      data: {
        name: "Lavender Petals",
        category: InventoryCategory.BOTANICAL,
        unitType: UnitType.G,
        purchaseUnit: Unit.G,
        purchaseSize: 500,
        purchaseCostAud: 24.61,
      },
    });
    console.log(`  + created "${lavenderPetals.name}"`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: lavenderPetals.id },
      data: { purchaseSize: 500, purchaseCostAud: 24.61 },
    });
    console.log(`  ✓ updated "${lavenderPetals.name}" (500g, $24.61)`);
  }

  // Jojoba Oil (carrier oil - should already exist)
  const jojoba = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Jojoba" } },
  });
  if (!jojoba) {
    console.log("  ⚠ Jojoba Oil not found - please add it manually in Inventory");
  } else {
    console.log(`  ✓ found "${jojoba.name}"`);
  }

  // Lavender Essential Oil (should already exist)
  const lavenderEO = await prisma.inventoryItem.findFirst({
    where: { 
      name: { contains: "Lavender" }, 
      category: InventoryCategory.ESSENTIAL_OIL 
    },
    include: { essentialOilSpec: true },
  });
  if (!lavenderEO) {
    console.log("  ⚠ Lavender Essential Oil not found - please add it manually in Inventory");
  } else {
    console.log(`  ✓ found "${lavenderEO.name}"`);
  }

  // Silica Gel Sachets (2g, 100 units for $12.99)
  let silicaGel = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Silica Gel" } },
  });
  if (!silicaGel) {
    silicaGel = await prisma.inventoryItem.create({
      data: {
        name: "Silica Gel Sachets (2g)",
        category: InventoryCategory.PACKAGING,
        unitType: UnitType.EACH,
        purchaseUnit: Unit.EACH,
        purchaseSize: 100,
        purchaseCostAud: 12.99,
      },
    });
    console.log(`  + created "${silicaGel.name}" (100 units, $12.99 = $0.1299 each)`);
  } else {
    await prisma.inventoryItem.update({
      where: { id: silicaGel.id },
      data: { purchaseSize: 100, purchaseCostAud: 12.99 },
    });
    console.log(`  ✓ updated "${silicaGel.name}" (100 units, $12.99 = $0.1299 each)`);
  }

  // ── 2. Update Bath Bomb recipe ──────────────────────────────────────────

  const recipe = await prisma.recipe.findFirst({
    where: { name: { contains: "Bath Bomb" } },
    include: { lineItems: true },
  });

  if (!recipe) {
    console.log("\n⚠ Bath Bomb recipe not found - cannot update");
    return;
  }

  console.log(`\n📝 Updating recipe "${recipe.name}"...`);

  // Delete old line items
  await prisma.recipeLineItem.deleteMany({
    where: { recipeId: recipe.id },
  });
  console.log("  - deleted old ingredients");

  // Update recipe metadata
  await prisma.recipe.update({
    where: { id: recipe.id },
    data: {
      name: "Bath Bomb - Lavender Magnesium",
      batchSize: 1000,
      batchUnit: Unit.G,
      outputUnits: null, // Will vary by mold - calculate per variant
      notes: "1kg batch. Freeze for 30 minutes to solidify in molds. Yields vary by mold size: Large 85g, Medium 60g, Small 35g, Yin-Yang 53g, Shell 30g. Each unit needs 1 silica gel sachet.",
    },
  });

  // Add new ingredients (actual recipe from production)
  // Note: Using placeholder quantities - user should adjust based on actual 1kg recipe
  const ingredients = [
    { item: magnesium, qty: 250, unit: Unit.G },      // Magnesium flakes (replaces sea salt)
    { item: biCarb, qty: 220, unit: Unit.G },         // Bi carb soda
    { item: citric, qty: 192, unit: Unit.G },         // Citric acid
    { item: cornstarch, qty: 128, unit: Unit.G },     // Cornstarch
    { item: lavenderPetals, qty: 10, unit: Unit.G },  // Lavender petals (decorative)
  ];

  if (jojoba) {
    ingredients.push({ item: jojoba, qty: 5, unit: Unit.ML }); // Jojoba oil (carrier)
  }

  if (lavenderEO) {
    ingredients.push({ item: lavenderEO, qty: 20, unit: Unit.DROPS }); // Lavender EO
  }

  for (const ing of ingredients) {
    await prisma.recipeLineItem.create({
      data: {
        recipeId: recipe.id,
        sourceType: SourceType.INVENTORY_ITEM,
        sourceInventoryItemId: ing.item.id,
        quantity: ing.qty,
        unit: ing.unit,
      },
    });
  }

  console.log(`  + added ${ingredients.length} ingredients`);
  console.log("\n✅ Recipe updated!");
  console.log("\n📊 Next steps:");
  console.log("  1. Review ingredient quantities in the app (Recipes page)");
  console.log("  2. Adjust quantities to match your actual 1kg recipe");
  console.log("  3. Use Batch Calculator to see cost per gram");
  console.log("  4. Create product variants for each mold size:");
  console.log("     - Large (85g) + 1 silica gel");
  console.log("     - Medium (60g) + 1 silica gel");
  console.log("     - Small (35g) + 1 silica gel");
  console.log("     - Yin-Yang (53g) + 1 silica gel");
  console.log("     - Shell (30g) + 1 silica gel");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
