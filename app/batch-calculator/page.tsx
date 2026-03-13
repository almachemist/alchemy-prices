import { prisma } from "../lib/prisma";
import {
  recipeBatchCost,
  lineItemCost,
  costPerBaseUnit,
  overheadPerUnit,
  type OverheadRow,
} from "../lib/pricing";
import { BatchCalculator } from "../components/BatchCalculator";

export default async function BatchCalculatorPage() {
  const recipes = await prisma.recipe.findMany({
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const overheadRows = await prisma.$queryRawUnsafe<OverheadRow[]>(
    `SELECT id, name, amount, period, notes, active FROM OverheadCost WHERE active = 1 ORDER BY name`,
  );
  type ProfileRow = { estimatedUnitsPerMonth: number | null };
  const profileRows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT estimatedUnitsPerMonth FROM PricingProfile WHERE name = 'Default' LIMIT 1`,
  );
  const estimatedUnitsPerMonth = profileRows[0]?.estimatedUnitsPerMonth ?? 50;
  const ohPerUnit = overheadPerUnit(overheadRows, estimatedUnitsPerMonth);

  const recipesForClient = recipes.map((r) => {
    const batchCost = recipeBatchCost(r as never);
    return {
      id: r.id,
      name: r.name,
      batchSize: r.batchSize,
      batchUnit: r.batchUnit,
      notes: r.notes,
      batchCost,
      lineItems: r.lineItems.map((li) => ({
        id: li.id,
        inventoryItemName: li.sourceInventoryItem?.name ?? "Unknown",
        quantity: li.quantity,
        unit: li.unit,
        cost: lineItemCost(li as never),
        unitPrice: li.sourceInventoryItem ? costPerBaseUnit(li.sourceInventoryItem) : 0,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Batch Calculator</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Select a recipe and scale it up. See total ingredient quantities and costs for any batch multiplier.
        </p>
      </div>

      <BatchCalculator recipes={recipesForClient} ohPerUnit={ohPerUnit} />
    </div>
  );
}
