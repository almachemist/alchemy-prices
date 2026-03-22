/**
 * Add Tropical Green Soap recipe to the system
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

async function getOrCreateItem(name: string, data: any) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { name: { contains: name.split(" ")[0] } },
    include: { essentialOilSpec: true }
  });
  if (existing) return existing;
  return prisma.inventoryItem.create({ data, include: { essentialOilSpec: true } });
}

async function main() {
  console.log("🧼 Adding Tropical Green Soap recipe...\n");

  // Get or create inventory items
  const coconutOil = await getOrCreateItem("Coconut", {
    name: "Coconut Oil (Virgin)",
    category: "CARRIER_OIL",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 1000,
    purchaseCostAud: 15.0,
  });

  const oliveOil = await getOrCreateItem("Olive", {
    name: "Olive Oil (Extra Virgin)",
    category: "CARRIER_OIL",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 1000,
    purchaseCostAud: 12.0,
  });

  const macadamiaOil = await getOrCreateItem("Macadamia", {
    name: "Macadamia Nut Oil",
    category: "CARRIER_OIL",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 500,
    purchaseCostAud: 18.0,
  });

  const naoh = await getOrCreateItem("Sodium", {
    name: "Sodium Hydroxide (NaOH) - Lye",
    category: "CONSUMABLE",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 1000,
    purchaseCostAud: 10.0,
  });

  const distilledWater = await getOrCreateItem("Distilled", {
    name: "Distilled Water",
    category: "CONSUMABLE",
    unitType: "ML",
    purchaseUnit: "ML",
    purchaseSize: 1000,
    purchaseCostAud: 2.0,
  });

  const spirulina = await getOrCreateItem("Spirulina", {
    name: "Spirulina Powder (Green Colorant)",
    category: "COLORANT",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 100,
    purchaseCostAud: 15.0,
  });

  const indigo = await getOrCreateItem("Indigo", {
    name: "Indigo Leaf Powder (Blue-Green Colorant)",
    category: "COLORANT",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 100,
    purchaseCostAud: 18.0,
  });

  const kaolin = await getOrCreateItem("Kaolin", {
    name: "Kaolin White Clay",
    category: "CLAY",
    unitType: "G",
    purchaseUnit: "G",
    purchaseSize: 500,
    purchaseCostAud: 12.0,
  });

  const sweetOrange = await getOrCreateItem("Sweet Orange", {
    name: "Sweet Orange Essential Oil",
    category: "ESSENTIAL_OIL",
    unitType: "ML",
    purchaseUnit: "ML",
    purchaseSize: 10,
    purchaseCostAud: 8.0,
    essentialOilSpec: {
      create: { dropsPerMl: 20 }
    }
  });

  const coriander = await getOrCreateItem("Coriander", {
    name: "Coriander Seed Essential Oil",
    category: "ESSENTIAL_OIL",
    unitType: "ML",
    purchaseUnit: "ML",
    purchaseSize: 10,
    purchaseCostAud: 12.0,
    essentialOilSpec: {
      create: { dropsPerMl: 20 }
    }
  });

  const neroli = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Neroli" } },
    include: { essentialOilSpec: true }
  });

  console.log("✓ Inventory items ready\n");

  // Create recipe
  const notes = `**Tropical Green Soap - Version 1.0 (2026-03-23)**
**Authors:** Mariana & José Miguel (adapted)

**Batch Details:**
- Total oil weight: 500g
- Superfatting: 9%
- Water: 30% of oil weight (150g) - reduced for tropical humidity
- Divided into 3 parts (~166g each) with different colors and scents

**AS MADE (with oil swap mistake):**
- Coconut Oil: 50% (250g) ⚠️ Should be 30%
- Olive Oil: 30% (150g) ⚠️ Should be 50%
- Macadamia Nut Oil: 20% (100g) ✓ Correct
- NaOH (Lye): 66g (approximate)
- Distilled Water: 150g

**CORRECTED RECIPE for next batch:**
- Olive Oil: 50% (250g)
- Coconut Oil: 30% (150g)
- Macadamia Nut Oil: 20% (100g)
- Recalculate lye with soap calculator after fixing oil percentages

**Colorants (each part):**
1. Spirulina Green: 2g spirulina + 1 tbsp kaolin → Sweet Orange EO (10 drops)
2. Indigo Green: 3g indigo + 1 tbsp kaolin → Neroli EO (10 drops)
3. Blended Green: Mix of parts 1 & 2 → Coriander Seed EO (10 drops)

**Kaolin Clay Instructions:**
- Purpose: Accelerates hardening, reduces sweating, adds silkiness
- Dose: ~10g per tablespoon
- Dilution: 1 part clay to 2 parts water (use from measured distilled water)
- Add at light trace - works quickly!

**Tropical Curing Notes:**
Environment: Tropical climate, ~80% humidity

Recommendations:
- Keep water at 30% or lower to reduce sweating
- Cool oils to 35-40°C before adding lye
- Do NOT insulate mold (ambient heat is enough)
- Unmold early: 24-36 hours instead of 48
- Cure in fan-ventilated, shaded spot
- Never cure on rainy days
- Don't wrap until fully cured (4-6 weeks minimum)

**Known Issues This Batch:**
Olive and coconut oil percentages were accidentally swapped. Higher coconut (50%) without correct lye recalculation likely caused slower hardening than expected.

**Next Batch Fix:**
Use corrected recipe above and recalculate lye with SoapCalc or Brambleberry calculator.`;

  const recipe = await prisma.recipe.create({
    data: {
      name: "Tropical Green Soap",
      batchSize: 500,
      batchUnit: "G",
      notes,
    },
  });

  console.log(`✓ Created recipe: ${recipe.name} (ID: ${recipe.id})\n`);

  // Add line items
  console.log("Adding recipe line items...");

  const lineItems = [
    { item: coconutOil, quantity: 250, unit: "G", note: "50% (swapped)" },
    { item: oliveOil, quantity: 150, unit: "G", note: "30% (swapped)" },
    { item: macadamiaOil, quantity: 100, unit: "G", note: "20%" },
    { item: naoh, quantity: 66, unit: "G", note: "Lye - verify with calculator" },
    { item: distilledWater, quantity: 150, unit: "ML", note: "30% of oil weight" },
    { item: spirulina, quantity: 2, unit: "G", note: "Part 1" },
    { item: indigo, quantity: 3, unit: "G", note: "Part 2" },
    { item: kaolin, quantity: 30, unit: "G", note: "~3 tbsp total" },
    { item: sweetOrange, quantity: 10, unit: "DROPS", note: "Part 1" },
    ...(neroli ? [{ item: neroli, quantity: 10, unit: "DROPS", note: "Part 2" }] : []),
    { item: coriander, quantity: 10, unit: "DROPS", note: "Part 3" },
  ];

  for (const { item, quantity, unit, note } of lineItems) {
    if (!item) continue;
    
    await prisma.recipeLineItem.create({
      data: {
        recipeId: recipe.id,
        sourceInventoryItemId: item.id,
        sourceType: "INVENTORY_ITEM",
        quantity,
        unit: unit as any,
      },
    });
    
    console.log(`  + ${item.name}: ${quantity} ${unit} (${note})`);
  }

  console.log("\n✅ Tropical Green Soap recipe added successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
