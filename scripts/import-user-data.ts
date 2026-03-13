import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Starting data import...");

  // Import inventory items from NDA invoice
  const almondOil = await prisma.inventoryItem.create({
    data: {
      name: "Almond Sweet Australian Refined Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 20.69,
    },
  });

  const castorOil = await prisma.inventoryItem.create({
    data: {
      name: "Castor Refined Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 100,
      purchaseUnit: "ML",
      purchaseCostAud: 7.52,
    },
  });

  const jojobaOil = await prisma.inventoryItem.create({
    data: {
      name: "Jojoba American Virgin Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 68.95,
    },
  });

  const macadamiaOil = await prisma.inventoryItem.create({
    data: {
      name: "Macadamia Refined Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 5000,
      purchaseUnit: "ML",
      purchaseCostAud: 131.64,
    },
  });

  const vitaminE = await prisma.inventoryItem.create({
    data: {
      name: "Vitamin E Synthetic",
      category: "CONSUMABLE",
      unitType: "ML",
      purchaseSize: 100,
      purchaseUnit: "ML",
      purchaseCostAud: 27.58,
    },
  });

  const sunflowerOil = await prisma.inventoryItem.create({
    data: {
      name: "Sunflower Virgin Certified Organic Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 22.56,
    },
  });

  const coconutOil = await prisma.inventoryItem.create({
    data: {
      name: "Coconut Refined Certified Organic Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 31.34,
    },
  });

  const sheaButter = await prisma.inventoryItem.create({
    data: {
      name: "Shea Butter Refined",
      category: "BUTTER",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 17.56,
    },
  });

  const calendulaPetals = await prisma.inventoryItem.create({
    data: {
      name: "Calendula Petals - Certified Organic",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 100,
      purchaseUnit: "G",
      purchaseCostAud: 25.07,
    },
  });

  const goatMilkSoapBase = await prisma.inventoryItem.create({
    data: {
      name: "Melt & Pour Goat Milk Soap Base",
      category: "SOAP_BASE",
      unitType: "G",
      purchaseSize: 1000,
      purchaseUnit: "G",
      purchaseCostAud: 29.78,
    },
  });

  const tamanuOil = await prisma.inventoryItem.create({
    data: {
      name: "Tamanu Certified Organic Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 100,
      purchaseUnit: "ML",
      purchaseCostAud: 20.07,
    },
  });

  const apricotOil = await prisma.inventoryItem.create({
    data: {
      name: "Apricot Kernel Virgin Certified Organic Oil",
      category: "CARRIER_OIL",
      unitType: "ML",
      purchaseSize: 1000,
      purchaseUnit: "ML",
      purchaseCostAud: 50.15,
    },
  });

  // Clays from Merlion & NDA
  const greenClay = await prisma.inventoryItem.create({
    data: {
      name: "Green French Argile Clay",
      category: "CLAY",
      unitType: "G",
      purchaseSize: 100,
      purchaseUnit: "G",
      purchaseCostAud: 14.99,
    },
  });

  const yellowClay = await prisma.inventoryItem.create({
    data: {
      name: "Yellow Australian Clay",
      category: "CLAY",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 7.49,
    },
  });

  const pinkClay = await prisma.inventoryItem.create({
    data: {
      name: "Pink Australian Clay",
      category: "CLAY",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 14.99,
    },
  });

  const kaolinClay = await prisma.inventoryItem.create({
    data: {
      name: "Kaolin White Australian Clay",
      category: "CLAY",
      unitType: "G",
      purchaseSize: 500,
      purchaseUnit: "G",
      purchaseCostAud: 8.24,
    },
  });

  // Botanicals/Powders from Merlion
  const spirulinaPowder = await prisma.inventoryItem.create({
    data: {
      name: "Spirulina Powder",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 200,
      purchaseUnit: "G",
      purchaseCostAud: 19.57,
    },
  });

  const rosePetalsPowder = await prisma.inventoryItem.create({
    data: {
      name: "Rose Petals Powder",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 200,
      purchaseUnit: "G",
      purchaseCostAud: 16.30,
    },
  });

  const charcoalPowder = await prisma.inventoryItem.create({
    data: {
      name: "Activated Charcoal Powder",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 200,
      purchaseUnit: "G",
      purchaseCostAud: 16.30,
    },
  });

  const indigoLeavesPowder = await prisma.inventoryItem.create({
    data: {
      name: "Indigo Leaves Powder",
      category: "BOTANICAL",
      unitType: "G",
      purchaseSize: 200,
      purchaseUnit: "G",
      purchaseCostAud: 16.30,
    },
  });

  // Soap bases
  const shampooBase = await prisma.inventoryItem.create({
    data: {
      name: "Melt and Pour Shampoo Base",
      category: "SOAP_BASE",
      unitType: "G",
      purchaseSize: 1000,
      purchaseUnit: "G",
      purchaseCostAud: 16.48,
    },
  });

  const almondMilkSoapBase = await prisma.inventoryItem.create({
    data: {
      name: "Almond Milk Melt and Pour Soap Base",
      category: "SOAP_BASE",
      unitType: "G",
      purchaseSize: 5000,
      purchaseUnit: "G",
      purchaseCostAud: 98.17,
    },
  });

  const aloeVeraSoapBase = await prisma.inventoryItem.create({
    data: {
      name: "Aloe Vera Melt and Pour Soap Base",
      category: "SOAP_BASE",
      unitType: "G",
      purchaseSize: 5000,
      purchaseUnit: "G",
      purchaseCostAud: 98.17,
    },
  });

  // Colorants
  const ultramarineBlue = await prisma.inventoryItem.create({
    data: {
      name: "Ultramarine Blue",
      category: "COLORANT",
      unitType: "G",
      purchaseSize: 10,
      purchaseUnit: "G",
      purchaseCostAud: 5.82,
    },
  });

  const indigoBlueExtract = await prisma.inventoryItem.create({
    data: {
      name: "Indigo Blue Natural Extract",
      category: "COLORANT",
      unitType: "ML",
      purchaseSize: 15,
      purchaseUnit: "ML",
      purchaseCostAud: 11.59,
    },
  });

  const safflowerYellow = await prisma.inventoryItem.create({
    data: {
      name: "Safflower Yellow Natural Extract",
      category: "COLORANT",
      unitType: "ML",
      purchaseSize: 15,
      purchaseUnit: "ML",
      purchaseCostAud: 11.59,
    },
  });

  const ultramarineViolet = await prisma.inventoryItem.create({
    data: {
      name: "Ultramarine Violet Pink",
      category: "COLORANT",
      unitType: "G",
      purchaseSize: 10,
      purchaseUnit: "G",
      purchaseCostAud: 5.82,
    },
  });

  // Packaging from Temu
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Navy Blue Organza Gift Bags (8x10cm)",
        category: "PACKAGING",
        unitType: "EACH",
        purchaseSize: 50,
        purchaseUnit: "EACH",
        purchaseCostAud: 2.86,
      },
      {
        name: "White Breathable Mesh Organza Bags",
        category: "PACKAGING",
        unitType: "EACH",
        purchaseSize: 50,
        purchaseUnit: "EACH",
        purchaseCostAud: 4.45,
      },
    ],
  });

  // Molds from Temu
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Silicone Flower-Shaped Cake Mold (Green)",
        category: "MOLD",
        unitType: "EACH",
        purchaseSize: 1,
        purchaseUnit: "EACH",
        purchaseCostAud: 5.47,
      },
      {
        name: "Silicone Sun & Moon Mold (Y-537)",
        category: "MOLD",
        unitType: "EACH",
        purchaseSize: 1,
        purchaseUnit: "EACH",
        purchaseCostAud: 5.41,
      },
      {
        name: "Sun & Moon Star Goddess Silicone Mold",
        category: "MOLD",
        unitType: "EACH",
        purchaseSize: 1,
        purchaseUnit: "EACH",
        purchaseCostAud: 11.62,
      },
      {
        name: "Tai Chi Yin Yang Silicone Mold",
        category: "MOLD",
        unitType: "EACH",
        purchaseSize: 1,
        purchaseUnit: "EACH",
        purchaseCostAud: 3.86,
      },
      {
        name: "Lotus Flower Silicone Mold",
        category: "MOLD",
        unitType: "EACH",
        purchaseSize: 1,
        purchaseUnit: "EACH",
        purchaseCostAud: 4.90,
      },
    ],
  });

  // Create prepared ingredient for carrier blend
  const carrierBlend = await prisma.preparedIngredient.create({
    data: {
      name: "Repellent Carrier Oil Base v2",
      yieldAmount: 100,
      yieldUnit: "ML",
      inputs: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: sunflowerOil.id,
            quantity: 50,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: macadamiaOil.id,
            quantity: 25,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: apricotOil.id,
            quantity: 15,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: jojobaOil.id,
            quantity: 10,
            unit: "ML",
          },
        ],
      },
    },
  });

  // Create Calendula Vanilla Infused Oil
  const calendulaInfusion = await prisma.preparedIngredient.create({
    data: {
      name: "Calendula Vanilla Infused Oil",
      yieldAmount: 525,
      yieldUnit: "ML",
      inputs: {
        create: [
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: sunflowerOil.id,
            quantity: 375,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: macadamiaOil.id,
            quantity: 100,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: apricotOil.id,
            quantity: 50,
            unit: "ML",
          },
          {
            sourceType: "INVENTORY_ITEM",
            sourceInventoryItemId: calendulaPetals.id,
            quantity: 20,
            unit: "G",
          },
        ],
      },
    },
  });

  // Create default pricing profile
  await prisma.pricingProfile.create({
    data: {
      name: "Default",
      laborRatePerHour: 30.0,
      laborMinutesPerBatch: 15,
      overheadPercent: 20,
      targetMarginPercent: 60,
      estimatedUnitsPerMonth: 50,
    },
  });

  // Create overhead costs
  await prisma.overheadCost.createMany({
    data: [
      {
        name: "Rent/Workspace",
        amount: 200,
        period: "MONTHLY",
        active: true,
      },
      {
        name: "Utilities",
        amount: 50,
        period: "MONTHLY",
        active: true,
      },
      {
        name: "Marketing",
        amount: 100,
        period: "MONTHLY",
        active: true,
      },
    ],
  });

  console.log("✅ Data import completed successfully!");
  console.log(`- Imported ${await prisma.inventoryItem.count()} inventory items`);
  console.log(`- Created ${await prisma.preparedIngredient.count()} prepared ingredients`);
  console.log(`- Created pricing profile and overhead costs`);
}

main()
  .catch((e) => {
    console.error("Error importing data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
