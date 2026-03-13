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

async function main() {
  // Helper to create inventory items with minimal required fields.
  const createInventory = async ({
    name,
    category,
    unitType,
    purchaseUnit,
  }: {
    name: string;
    category: InventoryCategory;
    unitType: UnitType;
    purchaseUnit: Unit;
  }) => {
    return prisma.inventoryItem.create({
      data: {
        name,
        category,
        unitType,
        purchaseSize: 1, // placeholder, can be edited later
        purchaseUnit,
        purchaseCostAud: 0, // placeholder until real prices are added
      },
    });
  };

  // Carrier oils / butters / botanicals
  const sweetAlmond = await createInventory({
    name: "Sweet Almond Oil (Refined)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const jojoba = await createInventory({
    name: "Jojoba Oil (American Virgin)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const macadamia = await createInventory({
    name: "Macadamia Oil (Refined)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const apricot = await createInventory({
    name: "Apricot Kernel Oil (Refined)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const sunflower = await createInventory({
    name: "Sunflower Oil (Virgin, Organic)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const coconut = await createInventory({
    name: "Coconut Oil (Refined, Organic)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const castor = await createInventory({
    name: "Castor Oil (Refined)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const tamanu = await createInventory({
    name: "Tamanu Oil (Organic)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const vitaminE = await createInventory({
    name: "Vitamin E (Tocopherol)",
    category: InventoryCategory.CONSUMABLE,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const shea = await createInventory({
    name: "Shea Butter (Refined)",
    category: InventoryCategory.BUTTER,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
  });
  const calendulaPetals = await createInventory({
    name: "Calendula Petals (dried)",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
  });

  // Distillery blends / bases
  const distillBlendA = await createInventory({
    name: "Distillery Botanical Blend A",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const distillBlendB = await createInventory({
    name: "Distillery Botanical Blend B",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const mintAlcoholInfusion = await createInventory({
    name: "Mint Alcohol Infusion",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });

  // Packaging (basic set)
  const amberBottle100 = await createInventory({
    name: "Amber bottle 100 mL",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
  });
  const pumpTop = await createInventory({
    name: "Pump top",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
  });
  const sprayTop = await createInventory({
    name: "Spray top",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
  });
  const label = await createInventory({
    name: "Label",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
  });
  const shrinkBand = await createInventory({
    name: "Shrink band / seal",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
  });

  // Essential oils & related
  const EO_NAMES = [
    "Amazon grass",
    "Cedarwood",
    "Vetiver",
    "Clove",
    "Palmarosa",
    "Eucalyptus",
    "Citronella",
    "Jasmine",
    "Thyme",
    "Citrus EO",
    "Lavender",
    "Vanilla (EO/absolute)",
    "Jurema Branca",
    "Breu Branco",
    "Patchouli",
    "Coriander seed",
    "Ylang-ylang",
    "Tea tree",
    "Ginger",
    "Lemongrass",
    "Neroli",
    "Geranium",
  ];

  const eoInventoryItems = [];
  for (const eoName of EO_NAMES) {
    const item = await createInventory({
      name: eoName,
      category: InventoryCategory.ESSENTIAL_OIL,
      unitType: UnitType.DROPS_ONLY,
      purchaseUnit: Unit.ML, // purchased by mL, used as drops
    });
    eoInventoryItems.push(item);
    await prisma.essentialOilSpec.create({
      data: {
        inventoryItemId: item.id,
        dropsPerMl: 20, // default, can be calibrated per bottle
      },
    });
  }

  // Witch Hazel & Blue Lotus as ml-based bases (not pure EOs)
  const witchHazel = await createInventory({
    name: "Witch hazel (distillate/extract)",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });
  const blueLotus = await createInventory({
    name: "Blue lotus extract/infusion",
    category: InventoryCategory.CARRIER_OIL,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
  });

  // Prepared ingredients: Calendula & Urucum infused oils
  const calendulaInfused = await prisma.preparedIngredient.create({
    data: {
      name: "Calendula Infused Sunflower Oil",
      yieldAmount: 92,
      yieldUnit: Unit.ML,
      inputs: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: sunflower.id,
            quantity: 100,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: calendulaPetals.id,
            quantity: 10,
            unit: Unit.G,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 0.5,
            unit: Unit.ML,
          },
        ],
      },
    },
  });

  const urucumSeeds = await createInventory({
    name: "Urucum seeds (semi-dried)",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
  });

  const urucumInfused = await prisma.preparedIngredient.create({
    data: {
      name: "Urucum Infused Sunflower Oil",
      yieldAmount: 90,
      yieldUnit: Unit.ML,
      inputs: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: sunflower.id,
            quantity: 100,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: urucumSeeds.id,
            quantity: 20,
            unit: Unit.G,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 0.5,
            unit: Unit.ML,
          },
        ],
      },
    },
  });

  // Helper map for recipes
  const findEO = (label: string) =>
    eoInventoryItems.find((eo) => eo.name.toLowerCase().startsWith(label.toLowerCase()));

  // Recipe 01 — Tropical Baby Oil v1 (100 mL)
  await prisma.recipe.create({
    data: {
      name: "Tropical Baby Oil v1",
      batchSize: 100,
      batchUnit: Unit.ML,
      lineItems: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: macadamia.id,
            quantity: 50,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: jojoba.id,
            quantity: 25,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: apricot.id,
            quantity: 15,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: sweetAlmond.id,
            quantity: 9,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 1,
            unit: Unit.ML,
          },
          // Optional Lavender EO — 6 drops
          ...(findEO("Lavender")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Lavender")!.id,
                  quantity: 6,
                  unit: Unit.DROPS,
                },
              ]
            : []),
        ],
      },
    },
  });

  // Recipe 02 — After-Sun Repair Oil v1 (100 mL)
  await prisma.recipe.create({
    data: {
      name: "After-Sun Repair Oil v1",
      batchSize: 100,
      batchUnit: Unit.ML,
      lineItems: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: macadamia.id,
            quantity: 45,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: jojoba.id,
            quantity: 25,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: apricot.id,
            quantity: 15,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.PREPARED_INGREDIENT,
            sourcePreparedId: calendulaInfused.id,
            quantity: 10,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: tamanu.id,
            quantity: 4,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 1,
            unit: Unit.ML,
          },
          // Optional Lavender EO — 4 drops
          ...(findEO("Lavender")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Lavender")!.id,
                  quantity: 4,
                  unit: Unit.DROPS,
                },
              ]
            : []),
        ],
      },
    },
  });

  // Recipe 03 — Urucum Glow Oil v1 (100 mL)
  await prisma.recipe.create({
    data: {
      name: "Urucum Glow Oil v1",
      batchSize: 100,
      batchUnit: Unit.ML,
      lineItems: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: macadamia.id,
            quantity: 45,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: jojoba.id,
            quantity: 20,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: apricot.id,
            quantity: 15,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: sweetAlmond.id,
            quantity: 10,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.PREPARED_INGREDIENT,
            sourcePreparedId: urucumInfused.id,
            quantity: 9,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 1,
            unit: Unit.ML,
          },
          // Vanilla — 4 drops
          ...(findEO("Vanilla")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Vanilla")!.id,
                  quantity: 4,
                  unit: Unit.DROPS,
                },
              ]
            : []),
          // Lavender — 4 drops
          ...(findEO("Lavender")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Lavender")!.id,
                  quantity: 4,
                  unit: Unit.DROPS,
                },
              ]
            : []),
        ],
      },
    },
  });

  // Recipe 04 — Jambu Sensory Oil (Base) v1 (50 mL)
  await prisma.recipe.create({
    data: {
      name: "Jambu Sensory Oil (Base) v1",
      batchSize: 50,
      batchUnit: Unit.ML,
      lineItems: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: jojoba.id,
            quantity: 25,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: macadamia.id,
            quantity: 17.5,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: apricot.id,
            quantity: 5,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: sweetAlmond.id,
            quantity: 2,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: vitaminE.id,
            quantity: 0.5,
            unit: Unit.ML,
          },
        ],
      },
    },
  });

  // Recipe 05 — Tropical Botanical Repellent v1 (100 mL)
  await prisma.recipe.create({
    data: {
      name: "Tropical Botanical Repellent v1",
      batchSize: 100,
      batchUnit: Unit.ML,
      lineItems: {
        create: [
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: distillBlendB.id,
            quantity: 55,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: mintAlcoholInfusion.id,
            quantity: 15,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: jojoba.id,
            quantity: 20,
            unit: Unit.ML,
          },
          {
            sourceType: SourceType.INVENTORY_ITEM,
            sourceInventoryItemId: macadamia.id,
            quantity: 8,
            unit: Unit.ML,
          },
          // Tea Tree EO — 20 drops
          ...(findEO("Tea tree")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Tea tree")!.id,
                  quantity: 20,
                  unit: Unit.DROPS,
                },
              ]
            : []),
          // Eucalyptus EO — 20 drops
          ...(findEO("Eucalyptus")
            ? [
                {
                  sourceType: SourceType.INVENTORY_ITEM,
                  sourceInventoryItemId: findEO("Eucalyptus")!.id,
                  quantity: 20,
                  unit: Unit.DROPS,
                },
              ]
            : []),
        ],
      },
    },
  });

  // Simple 100mL packaging set (bottle + closure + label)
  await prisma.packagingSet.create({
    data: {
      name: "100 mL Amber Bottle + Closure + Label",
      lineItems: {
        create: [
          {
            inventoryItemId: amberBottle100.id,
            quantityPerUnit: 1,
            unit: Unit.EACH,
          },
          {
            inventoryItemId: pumpTop.id,
            quantityPerUnit: 1,
            unit: Unit.EACH,
          },
          {
            inventoryItemId: label.id,
            quantityPerUnit: 1,
            unit: Unit.EACH,
          },
        ],
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


