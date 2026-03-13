import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Adding missing inventory items and creating recipes...");

  // Add missing inventory items for bath bombs and other recipes
  const bakingSoda = await prisma.inventoryItem.create({
    data: {
      name: "Baking Soda",
      category: "CONSUMABLE",
      unitType: "G",
      purchaseSize: 1000,
      purchaseUnit: "G",
      purchaseCostAud: 5.0, // Estimated
    },
  });

  const citricAcid = await prisma.inventoryItem.create({
    data: {
      name: "Citric Acid",
      category: "CONSUMABLE",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 8.0, // Estimated
    },
  });

  const cornstarch = await prisma.inventoryItem.create({
    data: {
      name: "Cornstarch",
      category: "CONSUMABLE",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 4.0, // Estimated
    },
  });

  const epsomSalt = await prisma.inventoryItem.create({
    data: {
      name: "Epsom Salt",
      category: "CONSUMABLE",
      unitType: "G",
      purchaseSize: 1000,
      purchaseUnit: "G",
      purchaseCostAud: 6.0, // Estimated
    },
  });

  const driedLavender = await prisma.inventoryItem.create({
    data: {
      name: "Dried Lavender",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 100,
      purchaseUnit: "G",
      purchaseCostAud: 12.0, // Estimated
    },
  });

  const oatmeal = await prisma.inventoryItem.create({
    data: {
      name: "Oatmeal (Colloidal)",
      category: "CONSUMABLE",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 5.0, // Estimated
    },
  });

  const lavenderEO = await prisma.inventoryItem.create({
    data: {
      name: "Lavender Essential Oil",
      category: "ESSENTIAL_OIL",
      unitType: "ML",
      purchaseSize: 10,
      purchaseUnit: "ML",
      purchaseCostAud: 15.0, // Estimated
    },
  });

  const jasmineEO = await prisma.inventoryItem.create({
    data: {
      name: "Jasmine Essential Oil",
      category: "ESSENTIAL_OIL",
      unitType: "ML",
      purchaseSize: 5,
      purchaseUnit: "ML",
      purchaseCostAud: 25.0, // Estimated
    },
  });

  const roseHydrosol = await prisma.inventoryItem.create({
    data: {
      name: "Rose Hydrosol",
      category: "CONSUMABLE",
      unitType: "ML",
      purchaseSize: 100,
      purchaseUnit: "ML",
      purchaseCostAud: 18.0, // Estimated
    },
  });

  const driedRosePetals = await prisma.inventoryItem.create({
    data: {
      name: "Dried Rose Petals",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 50,
      purchaseUnit: "G",
      purchaseCostAud: 10.0, // Estimated
    },
  });

  const vanillaBeans = await prisma.inventoryItem.create({
    data: {
      name: "Vanilla Beans",
      category: "BOTANICAL",
      unitType: "EACH",
      purchaseSize: 1,
      purchaseUnit: "EACH",
      purchaseCostAud: 8.0, // Estimated per bean
    },
  });

  // Byproduct ingredients (distillation byproducts)
  const wsOils = await prisma.inventoryItem.create({
    data: {
      name: "WS Botanical Oils (Gin Distillation Byproduct)",
      category: "CONSUMABLE",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 5.0, // $5/L as per your notes
    },
  });

  const sdOils = await prisma.inventoryItem.create({
    data: {
      name: "SD Botanical Oils (Gin Distillation Byproduct)",
      category: "CONSUMABLE",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 5.0, // $5/L as per your notes
    },
  });

  const mintAlcohol = await prisma.inventoryItem.create({
    data: {
      name: "Mint Alcohol Infusion",
      category: "CONSUMABLE",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 5.0, // $5/L as per your notes
    },
  });

  // Get existing items
  const coconutOil = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Coconut" } },
  });
  const goatMilkSoap = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Goat Milk" } },
  });
  const sunflowerOil = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Sunflower" } },
  });
  const macadamiaOil = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Macadamia" } },
  });
  const apricotOil = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Apricot" } },
  });
  const calendulaPetals = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Calendula" } },
  });
  const jojobaOil = await prisma.inventoryItem.findFirst({
    where: { name: { contains: "Jojoba" } },
  });

  console.log("Creating recipes...");

  // Recipe 1: WS Natural Repellent
  const wsRepellent = await prisma.recipe.create({
    data: {
      name: "WS Natural Repellent",
      batchSize: 50,
      batchUnit: "ML",
      notes: "Natural insect repellent with WS botanical oils",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: coconutOil!.id,
            quantity: 20,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: wsOils.id,
            quantity: 20,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: mintAlcohol.id,
            quantity: 10,
            unit: "ML",
          },
        ],
      },
    },
  });

  // Recipe 2: Signature Natural Repellent
  const signatureRepellent = await prisma.recipe.create({
    data: {
      name: "Signature Natural Repellent",
      batchSize: 60,
      batchUnit: "ML",
      notes: "Premium natural repellent with WS and SD botanical oils",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: coconutOil!.id,
            quantity: 20,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: wsOils.id,
            quantity: 20,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: sdOils.id,
            quantity: 10,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: mintAlcohol.id,
            quantity: 10,
            unit: "ML",
          },
        ],
      },
    },
  });

  // Recipe 3: Soap Flowers Batch 1
  const soapFlowers1 = await prisma.recipe.create({
    data: {
      name: "Soap Flowers Batch 1",
      batchSize: 4,
      batchUnit: "EACH",
      notes: "4 soap flowers with jasmine",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: goatMilkSoap!.id,
            quantity: 230,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: jasmineEO.id,
            quantity: 0.25, // ~5 drops = 0.25ml
            unit: "ML",
          },
        ],
      },
    },
  });

  // Recipe 4: Soap Flowers Batch 2
  const soapFlowers2 = await prisma.recipe.create({
    data: {
      name: "Soap Flowers Batch 2",
      batchSize: 3,
      batchUnit: "EACH",
      notes: "2 small flowers + half moon soap",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: goatMilkSoap!.id,
            quantity: 115,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: jasmineEO.id,
            quantity: 0.15, // ~3 drops = 0.15ml
            unit: "ML",
          },
        ],
      },
    },
  });

  // Recipe 5: Calendula Vanilla Infused Oil (as prepared ingredient)
  const calendulaOil = await prisma.preparedIngredient.create({
    data: {
      name: "Calendula Vanilla Infused Oil",
      yieldAmount: 525,
      yieldUnit: "ML",
      inputs: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: sunflowerOil!.id,
            quantity: 375,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: macadamiaOil!.id,
            quantity: 100,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: apricotOil!.id,
            quantity: 50,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: calendulaPetals!.id,
            quantity: 20,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: vanillaBeans.id,
            quantity: 1,
            unit: "EACH",
          },
        ],
      },
    },
  });

  // Recipe 6: Lavender Shower Steamer
  const lavenderSteamer = await prisma.recipe.create({
    data: {
      name: "Lavender Shower Steamer / Bath Bomb",
      batchSize: 1,
      batchUnit: "EACH",
      notes: "Bath bomb or shower steamer with lavender",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: bakingSoda.id,
            quantity: 240, // 1 cup ≈ 240g
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: citricAcid.id,
            quantity: 120, // 1/2 cup ≈ 120g
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: cornstarch.id,
            quantity: 120,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: epsomSalt.id,
            quantity: 60, // 1/4 cup ≈ 60g
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: driedLavender.id,
            quantity: 15, // 1/4 cup ≈ 15g
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: lavenderEO.id,
            quantity: 0.5, // 10 drops ≈ 0.5ml
            unit: "ML",
          },
        ],
      },
    },
  });

  // Recipe 7: Rose Lavender Oatmeal Bath Bomb
  const roseOatmealBomb = await prisma.recipe.create({
    data: {
      name: "Rose Lavender Oatmeal Bath Bomb",
      batchSize: 4,
      batchUnit: "EACH",
      notes: "4 medium bath bombs with rose and lavender",
      lineItems: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: bakingSoda.id,
            quantity: 240,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: citricAcid.id,
            quantity: 120,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: epsomSalt.id,
            quantity: 120,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: cornstarch.id,
            quantity: 120,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: oatmeal.id,
            quantity: 60,
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: jojobaOil!.id,
            quantity: 5, // 1 tsp ≈ 5ml
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: lavenderEO.id,
            quantity: 0.5,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: roseHydrosol.id,
            quantity: 2, // ~12 sprays ≈ 2ml
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: driedRosePetals.id,
            quantity: 2, // decorative
            unit: "G",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: driedLavender.id,
            quantity: 2, // decorative
            unit: "G",
          },
        ],
      },
    },
  });

  console.log("✅ Recipes created successfully!");
  console.log(`- Created ${await prisma.recipe.count()} recipes`);
  console.log(`- Total inventory items: ${await prisma.inventoryItem.count()}`);
  console.log(`- Total prepared ingredients: ${await prisma.preparedIngredient.count()}`);
}

main()
  .catch((e) => {
    console.error("Error creating recipes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
