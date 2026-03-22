import { prisma } from "../lib/prisma";
import {
  recipeBatchCost,
  unitCostFromBatch,
  overheadPerUnit,
  type OverheadRow,
} from "../lib/pricing";
import { PricingSimulator } from "../components/PricingSimulator";

export default async function PricingSimulatorPage() {
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
    
    // Default unit size for calculation
    const unitSize = r.batchUnit === "ML"
      ? Math.min(100, r.batchSize)
      : r.batchUnit === "EACH" ? 1 : r.batchSize;
    
    const { unitsProduced, unitCost } = unitCostFromBatch({
      batchCost,
      batchSize: r.batchSize,
      unitSize,
      outputUnits: r.outputUnits,
    });

    return {
      id: r.id,
      name: r.name,
      batchSize: r.batchSize,
      batchUnit: r.batchUnit,
      outputUnits: r.outputUnits,
      batchCost,
      unitsProduced,
      ingredientCost: unitCost,
      overheadCost: ohPerUnit,
      totalCost: unitCost + ohPerUnit,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Preços</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Escolha um produto e simule diferentes preços de venda para ver margens de lucro
        </p>
      </div>

      <PricingSimulator recipes={recipesForClient} />
    </div>
  );
}
