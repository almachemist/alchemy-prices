import { prisma } from "../lib/prisma";
import {
  recipeBatchCost,
  unitCostFromBatch,
  overheadPerUnit,
  type OverheadRow,
  totalMonthlyOverhead,
} from "../lib/pricing";
import Link from "next/link";
import { CreateRecipeButton } from "../components/CreateRecipeButton";

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            All your product recipes with ingredient costs and overhead.
          </p>
        </div>
        <CreateRecipeButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => {
          const rBatchCost = recipeBatchCost(recipe as never);
          const unitSize = recipe.batchUnit === "ML"
            ? Math.min(100, recipe.batchSize)
            : recipe.batchUnit === "EACH" ? 1 : recipe.batchSize;
          const { unitsProduced: u, unitCost: c } = unitCostFromBatch({
            batchCost: rBatchCost,
            batchSize: recipe.batchSize,
            unitSize,
          });
          const total = u ? c + ohPerUnit : 0;

          return (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="card block transition-shadow hover:shadow-md no-underline"
              style={{ color: "inherit" }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{recipe.name}</h3>
                <span className="badge badge-green shrink-0">
                  {recipe.batchSize} {recipe.batchUnit}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Ingredients</span>
                  <span className="font-medium">{recipe.lineItems.length} items</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Batch cost</span>
                  <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
                    AU${rBatchCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Units per batch</span>
                  <span className="font-medium">{u || "—"}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5" style={{ borderColor: "var(--color-border-light)" }}>
                  <span className="font-medium">Total cost / unit</span>
                  <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                    {u ? `AU$${total.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {recipe.notes && (
                <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {recipe.notes}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
