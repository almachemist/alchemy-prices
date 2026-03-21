import { InventoryItem, Recipe, RecipeLineItem, Unit, EssentialOilSpec } from "../generated/prisma/client";

type RecipeWithLines = Recipe & {
  lineItems: (RecipeLineItem & {
    sourceInventoryItem: InventoryItem | null;
  })[];
};

type InventoryWithEO = InventoryItem & {
  essentialOilSpec: EssentialOilSpec | null;
};

export function costPerBaseUnit(item: InventoryItem): number {
  if (!item.purchaseSize || !item.purchaseCostAud) return 0;
  return item.purchaseCostAud / item.purchaseSize;
}

export function costPerDrop(item: InventoryWithEO): number {
  if (!item.essentialOilSpec) return 0;
  const basePerMl = costPerBaseUnit(item);
  if (item.essentialOilSpec.dropsPerMl <= 0) return 0;
  return basePerMl / item.essentialOilSpec.dropsPerMl;
}

export function lineItemCost(
  line: RecipeLineItem & { sourceInventoryItem: InventoryWithEO | null },
): number {
  const inv = line.sourceInventoryItem;
  if (!inv) return 0;

  const qty = line.quantity ?? 0;
  if (qty <= 0) return 0;

  switch (line.unit) {
    case Unit.ML:
    case Unit.G:
    case Unit.EACH: {
      const per = costPerBaseUnit(inv);
      return qty * per;
    }
    case Unit.DROPS: {
      const perDrop = costPerDrop(inv);
      return qty * perDrop;
    }
    default:
      return 0;
  }
}

export function recipeBatchCost(recipe: RecipeWithLines): number {
  return recipe.lineItems.reduce(
    (sum, line) =>
      sum +
      lineItemCost(line as RecipeLineItem & {
        sourceInventoryItem: InventoryWithEO | null;
      }),
    0,
  );
}

export function unitCostFromBatch(params: {
  batchCost: number;
  batchSize: number;
  unitSize: number;
  outputUnits?: number | null; // explicit yield overrides batchSize/unitSize
}): { unitsProduced: number; unitCost: number } {
  const { batchCost, batchSize, unitSize, outputUnits } = params;

  // If the recipe declares its output count directly, use that
  if (outputUnits && outputUnits > 0) {
    const unitCost = batchCost / outputUnits;
    return { unitsProduced: outputUnits, unitCost };
  }

  if (batchSize <= 0 || unitSize <= 0) {
    return { unitsProduced: 0, unitCost: 0 };
  }
  const unitsProduced = Math.floor(batchSize / unitSize);
  if (unitsProduced <= 0) return { unitsProduced: 0, unitCost: 0 };
  const unitCost = batchCost / unitsProduced;
  return { unitsProduced, unitCost };
}

// ─── OVERHEAD COST HELPERS ───────────────────────────────────────────────────

export type OverheadRow = {
  id: number;
  name: string;
  amount: number;
  period: string;
  notes: string | null;
  active: number | boolean;
};

/** Convert any overhead cost to its monthly AUD equivalent. */
export function toMonthlyAmount(row: OverheadRow): number {
  switch (row.period) {
    case "WEEKLY":  return row.amount * (52 / 12);
    case "MONTHLY": return row.amount;
    case "ANNUAL":  return row.amount / 12;
    default:        return row.amount;
  }
}

/** Total monthly overhead from all active cost rows. */
export function totalMonthlyOverhead(rows: OverheadRow[]): number {
  return rows
    .filter((r) => Boolean(r.active))
    .reduce((sum, r) => sum + toMonthlyAmount(r), 0);
}

/**
 * Fixed overhead per unit, diluted over estimated monthly production volume.
 * Returns 0 when estimatedUnitsPerMonth is null / zero.
 */
export function overheadPerUnit(
  rows: OverheadRow[],
  estimatedUnitsPerMonth: number | null,
): number {
  if (!estimatedUnitsPerMonth || estimatedUnitsPerMonth <= 0) return 0;
  return totalMonthlyOverhead(rows) / estimatedUnitsPerMonth;
}

