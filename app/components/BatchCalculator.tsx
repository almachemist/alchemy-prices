"use client";

import { useState, useMemo } from "react";

type LineItem = {
  id: number;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  cost: number;
  unitPrice: number;
};

type Recipe = {
  id: number;
  name: string;
  batchSize: number;
  batchUnit: string;
  notes: string | null;
  batchCost: number;
  lineItems: LineItem[];
};

export function BatchCalculator({
  recipes,
  ohPerUnit,
}: {
  recipes: Recipe[];
  ohPerUnit: number;
}) {
  const [selectedId, setSelectedId] = useState<number | "">(recipes[0]?.id ?? "");
  const [multiplier, setMultiplier] = useState(1);
  const [customUnitSize, setCustomUnitSize] = useState("");

  const recipe = recipes.find((r) => r.id === selectedId);

  const unitSize = useMemo(() => {
    if (customUnitSize && parseFloat(customUnitSize) > 0) return parseFloat(customUnitSize);
    if (!recipe) return 100;
    if (recipe.batchUnit === "EACH") return 1;
    return Math.min(100, recipe.batchSize);
  }, [recipe, customUnitSize]);

  const scaledBatchSize = recipe ? recipe.batchSize * multiplier : 0;
  const scaledBatchCost = recipe ? recipe.batchCost * multiplier : 0;
  const unitsProduced = unitSize > 0 ? Math.floor(scaledBatchSize / unitSize) : 0;
  const ingredientPerUnit = unitsProduced > 0 ? scaledBatchCost / unitsProduced : 0;
  const totalPerUnit = ingredientPerUnit + ohPerUnit;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Controls */}
      <div className="space-y-4">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            Configuration
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Recipe
              </label>
              <select
                className="select"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value ? Number(e.target.value) : "");
                  setMultiplier(1);
                }}
              >
                <option value="">Select a recipe...</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.batchSize} {r.batchUnit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Batch Multiplier
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 10].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      multiplier === m
                        ? "text-white"
                        : "hover:bg-[var(--color-accent-soft)]"
                    }`}
                    style={
                      multiplier === m
                        ? { background: "var(--color-accent)" }
                        : { border: "1px solid var(--color-border)" }
                    }
                  >
                    {m}x
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="input mt-2"
                placeholder="Or type custom multiplier..."
                value={multiplier}
                onChange={(e) => setMultiplier(Math.max(1, parseFloat(e.target.value) || 1))}
                min={1}
                step="any"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Unit Size ({recipe?.batchUnit ?? "ML"})
              </label>
              <input
                type="number"
                className="input"
                value={customUnitSize}
                onChange={(e) => setCustomUnitSize(e.target.value)}
                placeholder={String(unitSize)}
                step="any"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {recipe && (
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
              Results
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Scaled batch size</span>
                <span className="font-medium">{scaledBatchSize} {recipe.batchUnit}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Total batch cost</span>
                <span className="font-bold" style={{ color: "var(--color-gold)" }}>
                  AU${scaledBatchCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>Units produced</span>
                <span className="font-semibold">{unitsProduced}</span>
              </div>
              <div className="border-t pt-2" style={{ borderColor: "var(--color-border-light)" }}>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Ingredients / unit</span>
                  <span className="font-medium">
                    {unitsProduced ? `AU$${ingredientPerUnit.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--color-text-muted)" }}>+ Overhead / unit</span>
                <span className="font-medium" style={{ color: "var(--color-gold)" }}>
                  AU${ohPerUnit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: "var(--color-border-light)" }}>
                <span className="font-semibold">Total cost / unit</span>
                <span className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                  {unitsProduced ? `AU$${totalPerUnit.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scaled ingredients */}
      <div className="lg:col-span-2">
        {recipe ? (
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Scaled Ingredients — {recipe.name} × {multiplier}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                    <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Ingredient</th>
                    <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Base Qty</th>
                    <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Scaled Qty</th>
                    <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Unit</th>
                    <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Base Cost</th>
                    <th className="py-2 pl-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Scaled Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.lineItems.map((li) => (
                    <tr key={li.id} className="table-row border-b" style={{ borderColor: "var(--color-border-light)" }}>
                      <td className="py-2.5 pr-4 font-medium">{li.inventoryItemName}</td>
                      <td className="py-2.5 px-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                        {li.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {(li.quantity * multiplier).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {li.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                        AU${li.cost.toFixed(4)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-semibold" style={{ color: "var(--color-gold)" }}>
                        AU${(li.cost * multiplier).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: "var(--color-border)" }}>
                    <td colSpan={5} className="py-3 pr-3 text-right font-semibold">Total</td>
                    <td className="py-3 pl-3 text-right text-base font-bold" style={{ color: "var(--color-accent)" }}>
                      AU${scaledBatchCost.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center py-16 text-center">
            <div>
              <div className="text-4xl mb-3" style={{ color: "var(--color-border)" }}>⚗️</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                Select a recipe to start calculating batch quantities and costs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
