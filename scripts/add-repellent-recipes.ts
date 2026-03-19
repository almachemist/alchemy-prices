import { prisma } from '../app/lib/prisma';

async function findOrCreateInventoryItem(name: string, unit: 'ML' | 'G' | 'DROPS') {
  let item = await prisma.inventoryItem.findFirst({ where: { name } });
  if (!item) {
    console.log(`  Creating placeholder inventory item: ${name}`);
    item = await prisma.inventoryItem.create({
      data: {
        name,
        category: unit === 'DROPS' ? 'ESSENTIAL_OIL' : 'BOTANICAL',
        unitType: unit === 'DROPS' ? 'DROPS_ONLY' : unit,
        purchaseSize: 100,
        purchaseUnit: unit === 'DROPS' ? 'ML' : unit,
        purchaseCostAud: 0,
        notes: 'Auto-created from recipe import',
      },
    });
  }
  return item.id;
}

async function main() {
  console.log('Adding Navy Repellent recipe...');
  
  const navyRepellent = await prisma.recipe.create({
    data: {
      name: 'Navy Repellent',
      batchSize: 2500,
      batchUnit: 'ML',
    },
  });

  const navyIngredients = [
    { name: 'NS + SD distillate blend', quantity: 900, unit: 'ML' as const },
    { name: 'Lemon Myrtle infusion', quantity: 900, unit: 'ML' as const },
    { name: 'Lemon Juice infusion', quantity: 100, unit: 'ML' as const },
    { name: 'Oil blend', quantity: 450, unit: 'ML' as const },
    { name: 'Mint infusion', quantity: 50, unit: 'ML' as const },
    { name: 'Water', quantity: 100, unit: 'ML' as const },
    { name: 'Lavender essential oil', quantity: 180, unit: 'DROPS' as const },
    { name: 'Eucalyptus essential oil', quantity: 110, unit: 'DROPS' as const },
    { name: 'Clove essential oil', quantity: 25, unit: 'DROPS' as const },
    { name: 'Citronella essential oil', quantity: 100, unit: 'DROPS' as const },
    { name: 'Cedarwood essential oil', quantity: 12, unit: 'DROPS' as const },
    { name: 'Geranium essential oil', quantity: 15, unit: 'DROPS' as const },
  ];

  for (const ing of navyIngredients) {
    const itemId = await findOrCreateInventoryItem(ing.name, ing.unit);
    await prisma.recipeLineItem.create({
      data: {
        recipeId: navyRepellent.id,
        sourceType: 'INVENTORY_ITEM',
        sourceInventoryItemId: itemId,
        quantity: ing.quantity,
        unit: ing.unit,
      },
    });
  }
  
  console.log(`✓ Created Navy Repellent with ${navyIngredients.length} ingredients`);

  console.log('Adding Wet Season Repellent recipe...');
  
  const wetSeasonRepellent = await prisma.recipe.create({
    data: {
      name: 'Wet Season Repellent',
      batchSize: 1700,
      batchUnit: 'ML',
    },
  });

  const wetSeasonIngredients = [
    { name: 'Wet Season distillate', quantity: 800, unit: 'ML' as const },
    { name: 'Mint infusion (alcohol)', quantity: 400, unit: 'ML' as const },
    { name: 'Lemon Myrtle infusion (alcohol)', quantity: 400, unit: 'ML' as const },
    { name: 'Water', quantity: 100, unit: 'ML' as const },
    { name: 'Ginger essential oil', quantity: 160, unit: 'DROPS' as const },
    { name: 'Tea Tree essential oil', quantity: 160, unit: 'DROPS' as const },
    { name: 'Ocean Breeze', quantity: 30, unit: 'DROPS' as const },
    { name: 'Vitamin E', quantity: 4, unit: 'G' as const },
  ];

  for (const ing of wetSeasonIngredients) {
    const itemId = await findOrCreateInventoryItem(ing.name, ing.unit);
    await prisma.recipeLineItem.create({
      data: {
        recipeId: wetSeasonRepellent.id,
        sourceType: 'INVENTORY_ITEM',
        sourceInventoryItemId: itemId,
        quantity: ing.quantity,
        unit: ing.unit,
      },
    });
  }
  
  console.log(`✓ Created Wet Season Repellent with ${wetSeasonIngredients.length} ingredients`);
  console.log('\nBoth recipes added successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
