/**
 * Seed the 3 production recipes from the Alchemy Studio brief.
 * Run with:  npx ts-node --project tsconfig.scripts.json scripts/seed-production-recipes.ts
 *
 * Cup/tbsp/tsp conversions used for Bath Bomb (approximate, common cosmetic reference):
 *   1 cup  baking soda   ≈ 220 g
 *   1 cup  citric acid   ≈ 192 g  (1 cup = 240 ml × ~0.80 g/ml)
 *   1 cup  cornstarch    ≈ 128 g  (1 cup = 240 ml × ~0.53 g/ml)
 *   1 cup  sea salt      ≈ 288 g  (1 cup = 240 ml × ~1.20 g/ml)
 *   1 tbsp kaolin clay  ≈   9 g
 *   1 tsp  carrier oil  ≈   5 ml
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Find an inventory item by partial/case-insensitive name match, or create it. */
async function findOrCreate(
  name: string,
  defaults: {
    category: InventoryCategory;
    unitType: UnitType;
    purchaseUnit: Unit;
    purchaseSize?: number;
    purchaseCostAud?: number;
    dropsPerMl?: number; // set for EOs
  },
) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { name: { contains: name } },
    include: { essentialOilSpec: true },
  });
  if (existing) {
    console.log(`  ✓ found  "${existing.name}"`);
    return existing;
  }

  const item = await prisma.inventoryItem.create({
    data: {
      name,
      category: defaults.category,
      unitType: defaults.unitType,
      purchaseUnit: defaults.purchaseUnit,
      purchaseSize: defaults.purchaseSize ?? 1,
      purchaseCostAud: defaults.purchaseCostAud ?? 0,
    },
    include: { essentialOilSpec: true },
  });
  console.log(`  + created "${item.name}" (placeholder prices — update in Inventory)`);

  if (defaults.dropsPerMl) {
    await prisma.essentialOilSpec.create({
      data: { inventoryItemId: item.id, dropsPerMl: defaults.dropsPerMl },
    });
  }
  return item;
}

type IngredientSpec = {
  item: { id: number };
  quantity: number;
  unit: Unit;
};

async function createRecipe(
  name: string,
  batchSize: number,
  batchUnit: Unit,
  outputUnits: number | null,
  notes: string | null,
  ingredients: IngredientSpec[],
) {
  const existing = await prisma.recipe.findFirst({ where: { name } });
  if (existing) {
    console.log(`\n⚠ Recipe "${name}" already exists — skipping.`);
    return;
  }
  const recipe = await prisma.recipe.create({
    data: {
      name,
      batchSize,
      batchUnit,
      outputUnits,
      notes,
      lineItems: {
        create: ingredients.map((ing) => ({
          sourceType: SourceType.INVENTORY_ITEM,
          sourceInventoryItemId: ing.item.id,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      },
    },
  });
  console.log(`\n✅ Created recipe "${recipe.name}" (${ingredients.length} ingredients, ${outputUnits ?? "?"} units/batch)`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌿  Seeding production recipes…\n");

  // ── Inventory items ──────────────────────────────────────────────────────

  console.log("Inventory items:");

  const aloeBase = await findOrCreate("Aloe Vera Melt & Pour Soap Base", {
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 19.60,
  });

  const almondBase = await findOrCreate("Almond Melt & Pour Soap Base", {
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 19.60,
  });

  const tangerineEO = await findOrCreate("Tangerine Essential Oil", {
    category: InventoryCategory.ESSENTIAL_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 50,
    purchaseCostAud: 12.00,
    dropsPerMl: 20,
  });

  const ylangEO = await findOrCreate("Ylang Ylang Essential Oil", {
    category: InventoryCategory.ESSENTIAL_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 10,
    purchaseCostAud: 8.00,
    dropsPerMl: 20,
  });

  const jasmineEO = await findOrCreate("Jasmine Essential Oil", {
    category: InventoryCategory.ESSENTIAL_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 10,
    purchaseCostAud: 15.00,
    dropsPerMl: 20,
  });

  const safflower = await findOrCreate("Safflower Colourant", {
    category: InventoryCategory.COLORANT,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 30,
    purchaseCostAud: 6.00,
    dropsPerMl: 20,
  });

  const bakingSoda = await findOrCreate("Baking Soda", {
    category: InventoryCategory.CONSUMABLE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 3.00,
  });

  const citricAcid = await findOrCreate("Citric Acid", {
    category: InventoryCategory.CONSUMABLE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 8.00,
  });

  const starch = await findOrCreate("Cornstarch", {
    category: InventoryCategory.CONSUMABLE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 500,
    purchaseCostAud: 3.50,
  });

  const seaSalt = await findOrCreate("Sea Salt Fine", {
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 4.00,
  });

  const kaolinClay = await findOrCreate("Kaolin Clay", {
    category: InventoryCategory.CLAY,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 500,
    purchaseCostAud: 9.00,
  });

  const carrierOil = await findOrCreate("Carrier Oil (Bath Bomb)", {
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 250,
    purchaseCostAud: 8.00,
  });

  const genericEO = await findOrCreate("Essential Oil (Bath Bomb)", {
    category: InventoryCategory.ESSENTIAL_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 10,
    purchaseCostAud: 8.00,
    dropsPerMl: 20,
  });

  // ── Recipes ──────────────────────────────────────────────────────────────

  // 1. Aloe Vera Soap Shells — 500g base → 50 units
  await createRecipe(
    "Aloe Vera Soap Shells",
    500,
    Unit.G,
    50,
    "500g batch → 45 mini shells + 4 large shells + 1 yin-yang = 50 units",
    [
      { item: aloeBase,    quantity: 500, unit: Unit.G     },
      { item: tangerineEO, quantity: 10,  unit: Unit.DROPS },
    ],
  );

  // 2. Sacral Chakra Flower Soap — 1kg base → 24 flower soaps
  await createRecipe(
    "Sacral Chakra Flower Soap",
    1000,
    Unit.G,
    24,
    "Full 1kg batch → 24 flower soaps. EO blend: tangerine 15g + ylang ylang 8 drops + jasmine 9 drops. Safflower colourant 24 drops.",
    [
      { item: almondBase,  quantity: 1000, unit: Unit.G     },
      { item: tangerineEO, quantity: 15,   unit: Unit.G     },
      { item: ylangEO,     quantity: 8,    unit: Unit.DROPS },
      { item: jasmineEO,   quantity: 9,    unit: Unit.DROPS },
      { item: safflower,   quantity: 24,   unit: Unit.DROPS },
    ],
  );

  // 3. Bath Bomb Tropical Formula — cups converted to grams/ml
  //   1 cup  baking soda  = 220g
  //   0.5 cup citric acid = 96g  (192g/cup × 0.5)
  //   0.5 cup cornstarch  = 64g  (128g/cup × 0.5)
  //   0.25 cup sea salt   = 72g  (288g/cup × 0.25)
  //   1 tbsp kaolin clay  = 9g
  //   0.5 tsp carrier oil = 2.5ml (5ml/tsp × 0.5)
  //   10 drops EO         = DROPS
  await createRecipe(
    "Bath Bomb Tropical Formula",
    461,          // total grams: 220+96+64+72+9 = 461g dry (+ ~2.5ml oil)
    Unit.G,
    4,
    "Makes 4 medium bath bombs. Dry: 1 cup baking soda (220g), ½ cup citric acid (96g), ½ cup cornstarch (64g), ¼ cup sea salt (72g), 1 tbsp kaolin clay (9g). Wet: ½ tsp carrier oil (2.5ml), 10 drops EO, alcohol spray as needed.",
    [
      { item: bakingSoda,  quantity: 220,  unit: Unit.G     },
      { item: citricAcid,  quantity: 96,   unit: Unit.G     },
      { item: starch,      quantity: 64,   unit: Unit.G     },
      { item: seaSalt,     quantity: 72,   unit: Unit.G     },
      { item: kaolinClay,  quantity: 9,    unit: Unit.G     },
      { item: carrierOil,  quantity: 2.5,  unit: Unit.ML    },
      { item: genericEO,   quantity: 10,   unit: Unit.DROPS },
    ],
  );

  console.log("\n✨ Done! Open Recipes in the app to review and set real purchase prices in Inventory.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
