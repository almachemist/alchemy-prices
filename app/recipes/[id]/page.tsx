import { prisma } from "../../lib/prisma";
import {
  recipeBatchCost,
  unitCostFromBatch,
  lineItemCost,
  costPerBaseUnit,
  overheadPerUnit,
  type OverheadRow,
} from "../../lib/pricing";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeLineItemEditor } from "../../components/RecipeLineItemEditor";
import { RecipeHeader } from "../../components/RecipeHeader";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(id) },
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!recipe) return notFound();

  const overheadRows = await prisma.$queryRawUnsafe<OverheadRow[]>(
    `SELECT id, name, amount, period, notes, active FROM OverheadCost WHERE active = 1 ORDER BY name`,
  );
  type ProfileRow = { estimatedUnitsPerMonth: number | null };
  const profileRows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT estimatedUnitsPerMonth FROM PricingProfile WHERE name = 'Default' LIMIT 1`,
  );
  const estimatedUnitsPerMonth = profileRows[0]?.estimatedUnitsPerMonth ?? 50;
  const ohPerUnit = overheadPerUnit(overheadRows, estimatedUnitsPerMonth);

  const batchCost = recipeBatchCost(recipe as never);
  const unitSize = recipe.batchUnit === "ML"
    ? Math.min(100, recipe.batchSize)
    : recipe.batchUnit === "EACH" ? 1 : recipe.batchSize;
  const { unitsProduced, unitCost } = unitCostFromBatch({
    batchCost,
    batchSize: recipe.batchSize,
    unitSize,
  });
  const totalPerUnit = unitsProduced ? unitCost + ohPerUnit : 0;

  const inventoryItems = await prisma.inventoryItem.findMany({
    include: { essentialOilSpec: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const lineItemsForClient = recipe.lineItems.map((li) => ({
    id: li.id,
    quantity: li.quantity,
    unit: li.unit,
    inventoryItemId: li.sourceInventoryItemId,
    inventoryItemName: li.sourceInventoryItem?.name ?? "Unknown",
    category: li.sourceInventoryItem?.category ?? "",
    cost: lineItemCost(li as never),
    unitPrice: li.sourceInventoryItem ? costPerBaseUnit(li.sourceInventoryItem) : 0,
  }));

  const inventoryForClient = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unitType: item.unitType,
    purchaseUnit: item.purchaseUnit,
    unitPrice: costPerBaseUnit(item),
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <Link href="/recipes" className="hover:underline" style={{ color: "var(--color-accent)" }}>Recipes</Link>
        <span>/</span>
        <span>{recipe.name}</span>
      </div>

      {/* Header with edit/delete */}
      <RecipeHeader
        recipeId={recipe.id}
        name={recipe.name}
        notes={recipe.notes}
        batchSize={recipe.batchSize}
        batchUnit={recipe.batchUnit}
      />

      {/* Cost summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="stat-value text-lg">AU${batchCost.toFixed(2)}</div>
          <div className="stat-label">Batch Cost</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg">{unitsProduced || "—"}</div>
          <div className="stat-label">Units per Batch</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg">{unitsProduced ? `AU$${unitCost.toFixed(2)}` : "—"}</div>
          <div className="stat-label">Ingredients / Unit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg" style={{ color: "var(--color-accent)" }}>
            {unitsProduced ? `AU$${totalPerUnit.toFixed(2)}` : "—"}
          </div>
          <div className="stat-label">Total / Unit (incl. overhead)</div>
        </div>
      </div>

      {/* Line items editor */}
      <RecipeLineItemEditor
        recipeId={recipe.id}
        lineItems={lineItemsForClient}
        inventoryItems={inventoryForClient}
        batchCost={batchCost}
        ohPerUnit={ohPerUnit}
      />
    </div>
  );
}
