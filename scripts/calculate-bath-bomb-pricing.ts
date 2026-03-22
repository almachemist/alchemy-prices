/**
 * Calculate Bath Bomb pricing for each mold variant.
 * 
 * Formula: (batch_cost / 1000g) × weight_g + silica_gel_cost
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

// Product variants from 1kg batch
const VARIANTS = [
  { name: "Bath Bomb - Large", weight: 85, quantity: 1 },
  { name: "Bath Bomb - Medium", weight: 60, quantity: 1 },
  { name: "Bath Bomb - Small", weight: 35, quantity: 2 },
  { name: "Bath Bomb - Yin Yang", weight: 53, quantity: 1 },
  { name: "Bath Bomb - Shell", weight: 30, quantity: 6 },
];

async function main() {
  console.log("💰 Calculating Bath Bomb pricing...\n");

  // ── 1. Get recipe and calculate batch cost ──────────────────────────────

  const recipe = await prisma.recipe.findFirst({
    where: { name: { contains: "Bath Bomb" } },
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
      },
    },
  });

  if (!recipe) {
    console.log("⚠ Bath Bomb recipe not found");
    return;
  }

  console.log(`📝 Recipe: ${recipe.name}`);
  console.log(`   Batch size: ${recipe.batchSize}g\n`);

  // Calculate ingredient costs
  let batchCost = 0;
  console.log("Ingredients:");
  
  for (const line of recipe.lineItems) {
    const inv = line.sourceInventoryItem;
    if (!inv) continue;

    const unitCost = inv.purchaseCostAud / inv.purchaseSize;
    let lineCost = 0;

    switch (line.unit) {
      case "ML":
      case "G":
      case "EACH":
        lineCost = line.quantity * unitCost;
        break;
      case "DROPS":
        if (inv.essentialOilSpec) {
          const costPerDrop = unitCost / inv.essentialOilSpec.dropsPerMl;
          lineCost = line.quantity * costPerDrop;
        }
        break;
    }

    batchCost += lineCost;
    console.log(`  ${inv.name}: ${line.quantity} ${line.unit} = AU$${lineCost.toFixed(4)}`);
  }

  console.log(`\n💵 Total batch cost: AU$${batchCost.toFixed(2)}`);
  
  const costPerGram = batchCost / recipe.batchSize;
  console.log(`   Cost per gram: AU$${costPerGram.toFixed(4)}/g\n`);

  // ── 2. Get silica gel cost ──────────────────────────────────────────────

  const silicaGel = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Silica Gel" } },
  });

  const silicaCost = silicaGel 
    ? silicaGel.purchaseCostAud / silicaGel.purchaseSize 
    : 0;

  console.log(`🧊 Silica gel sachet: AU$${silicaCost.toFixed(4)} each\n`);

  // ── 3. Calculate pricing for each variant ──────────────────────────────

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("PRODUCT VARIANTS - COST BREAKDOWN");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let totalUnits = 0;
  let totalRevenue50 = 0;
  let totalRevenue65 = 0;

  for (const variant of VARIANTS) {
    const ingredientCost = costPerGram * variant.weight;
    const unitCost = ingredientCost + silicaCost;
    
    // Suggested pricing with 50% and 65% margins
    const wholesale = unitCost / (1 - 0.50);  // 50% margin
    const retail = unitCost / (1 - 0.65);     // 65% margin

    console.log(`${variant.name} (${variant.weight}g)`);
    console.log(`  Qty from 1kg batch: ${variant.quantity}`);
    console.log(`  Ingredients: AU$${ingredientCost.toFixed(4)}`);
    console.log(`  + Silica gel: AU$${silicaCost.toFixed(4)}`);
    console.log(`  ─────────────────────────────`);
    console.log(`  Total cost: AU$${unitCost.toFixed(2)}`);
    console.log(`  `);
    console.log(`  💰 Wholesale (50% margin): AU$${wholesale.toFixed(2)}`);
    console.log(`  💎 Retail (65% margin): AU$${retail.toFixed(2)}`);
    console.log(``);

    totalUnits += variant.quantity;
    totalRevenue50 += wholesale * variant.quantity;
    totalRevenue65 += retail * variant.quantity;
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`BATCH SUMMARY (1kg = ${totalUnits} units)`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Batch cost: AU$${batchCost.toFixed(2)}`);
  console.log(`Wholesale revenue (50%): AU$${totalRevenue50.toFixed(2)}`);
  console.log(`Retail revenue (65%): AU$${totalRevenue65.toFixed(2)}`);
  console.log(`Wholesale profit: AU$${(totalRevenue50 - batchCost).toFixed(2)}`);
  console.log(`Retail profit: AU$${(totalRevenue65 - batchCost).toFixed(2)}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("✅ Pricing calculated!");
  console.log("\n📋 To create these products in the system:");
  console.log("   1. Go to Orders → New Order");
  console.log("   2. Create custom line items for each variant");
  console.log("   3. Or add them as Recipe variants with outputUnits set");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
