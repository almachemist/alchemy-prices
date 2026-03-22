"use client";

import { useState, useMemo } from "react";

type Recipe = {
  id: number;
  name: string;
  batchSize: number;
  batchUnit: string;
  outputUnits: number | null;
  batchCost: number;
  unitsProduced: number;
  ingredientCost: number;
  overheadCost: number;
  totalCost: number;
};

type PriceScenario = {
  label: string;
  margin: number;
  color: string;
};

const SCENARIOS: PriceScenario[] = [
  { label: "Atacado Mínimo", margin: 40, color: "#ef4444" },
  { label: "Atacado Padrão", margin: 50, color: "#f59e0b" },
  { label: "Varejo", margin: 65, color: "#10b981" },
  { label: "Premium", margin: 75, color: "#3b82f6" },
];

export function PricingSimulator({ recipes }: { recipes: Recipe[] }) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(
    recipes[0]?.id ?? null
  );
  const [customPrice, setCustomPrice] = useState("");
  const [unitWeight, setUnitWeight] = useState("");

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId),
    [recipes, selectedRecipeId]
  );

  // If user specifies a custom unit weight (e.g., for bath bomb variants)
  const effectiveCost = useMemo(() => {
    if (!selectedRecipe) return 0;
    
    if (unitWeight && parseFloat(unitWeight) > 0) {
      const weight = parseFloat(unitWeight);
      const costPerGram = selectedRecipe.batchCost / selectedRecipe.batchSize;
      return costPerGram * weight + selectedRecipe.overheadCost;
    }
    
    return selectedRecipe.totalCost;
  }, [selectedRecipe, unitWeight]);

  const customMargin = useMemo(() => {
    if (!customPrice || parseFloat(customPrice) <= 0) return null;
    const price = parseFloat(customPrice);
    if (price <= effectiveCost) return 0;
    return ((price - effectiveCost) / price) * 100;
  }, [customPrice, effectiveCost]);

  const customProfit = useMemo(() => {
    if (!customPrice || parseFloat(customPrice) <= 0) return 0;
    return parseFloat(customPrice) - effectiveCost;
  }, [customPrice, effectiveCost]);

  if (!selectedRecipe) {
    return (
      <div className="rounded-lg border p-8 text-center" style={{ borderColor: "var(--color-border)" }}>
        <p style={{ color: "var(--color-text-muted)" }}>
          Nenhuma receita disponível. Crie receitas primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recipe Selector */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)" }}>
        <label className="block text-sm font-medium mb-2">Selecione o Produto</label>
        <select
          value={selectedRecipeId ?? ""}
          onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
          className="w-full rounded-md border px-3 py-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-semibold mb-4">📊 Análise de Custos</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Lote</p>
            <p className="text-2xl font-bold">
              {selectedRecipe.batchSize} {selectedRecipe.batchUnit}
            </p>
            {selectedRecipe.outputUnits && (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                → {selectedRecipe.outputUnits} unidades
              </p>
            )}
          </div>

          <div>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Custo do Lote</p>
            <p className="text-2xl font-bold">AU${selectedRecipe.batchCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm">Custo de Ingredientes</span>
            <span className="font-mono">AU${selectedRecipe.ingredientCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm">Overhead (fixo)</span>
            <span className="font-mono">AU${selectedRecipe.overheadCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold">Custo Total por Unidade</span>
            <span className="text-lg font-bold">AU${selectedRecipe.totalCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Custom Unit Weight (for variants like bath bombs) */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--color-border)" }}>
          <label className="block text-sm font-medium mb-2">
            Peso Customizado (opcional)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={unitWeight}
              onChange={(e) => setUnitWeight(e.target.value)}
              placeholder="Ex: 85 para bath bomb grande"
              className="flex-1 rounded-md border px-3 py-2"
              style={{ borderColor: "var(--color-border)" }}
              step="0.1"
            />
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>gramas</span>
          </div>
          {unitWeight && parseFloat(unitWeight) > 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Custo para {unitWeight}g: <strong>AU${effectiveCost.toFixed(2)}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Pricing Scenarios */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-lg font-semibold mb-4">💰 Cenários de Preço</h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SCENARIOS.map((scenario) => {
            const price = effectiveCost / (1 - scenario.margin / 100);
            const profit = price - effectiveCost;
            
            return (
              <div
                key={scenario.label}
                className="rounded-lg border-2 p-4"
                style={{ borderColor: scenario.color }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: scenario.color }}
                  />
                  <h3 className="font-semibold text-sm">{scenario.label}</h3>
                </div>
                
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Margem {scenario.margin}%
                </p>
                
                <p className="text-2xl font-bold mb-2">
                  AU${price.toFixed(2)}
                </p>
                
                <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                  <div className="flex justify-between">
                    <span>Custo:</span>
                    <span>AU${effectiveCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold" style={{ color: scenario.color }}>
                    <span>Lucro:</span>
                    <span>AU${profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Price Simulator */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
        <h2 className="text-lg font-semibold mb-4">🎯 Simulador de Preço Customizado</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Digite o preço de venda que você quer testar
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-lg">AU$</span>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 rounded-md border px-4 py-3 text-lg font-mono"
                style={{ borderColor: "var(--color-border)" }}
                step="0.01"
              />
            </div>
          </div>

          {customPrice && parseFloat(customPrice) > 0 && (
            <div className="mt-6 p-4 rounded-lg border-2" 
              style={{ 
                borderColor: customMargin && customMargin >= 50 ? "#10b981" : "#ef4444",
                backgroundColor: "var(--color-bg)"
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Margem de Lucro
                  </p>
                  <p className="text-3xl font-bold">
                    {customMargin?.toFixed(1)}%
                  </p>
                </div>
                
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Lucro por Unidade
                  </p>
                  <p className="text-3xl font-bold">
                    AU${customProfit.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Custo
                  </p>
                  <p className="text-3xl font-bold">
                    AU${effectiveCost.toFixed(2)}
                  </p>
                </div>
              </div>

              {customMargin !== null && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                  {customMargin < 40 && (
                    <p className="text-sm" style={{ color: "#ef4444" }}>
                      ⚠️ Margem muito baixa! Recomendado mínimo 40% para atacado.
                    </p>
                  )}
                  {customMargin >= 40 && customMargin < 50 && (
                    <p className="text-sm" style={{ color: "#f59e0b" }}>
                      ⚡ Margem aceitável para atacado (40-50%).
                    </p>
                  )}
                  {customMargin >= 50 && customMargin < 65 && (
                    <p className="text-sm" style={{ color: "#10b981" }}>
                      ✅ Boa margem para atacado/varejo (50-65%).
                    </p>
                  )}
                  {customMargin >= 65 && (
                    <p className="text-sm" style={{ color: "#3b82f6" }}>
                      💎 Excelente margem para varejo/premium (65%+).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Batch Revenue Calculator */}
      {selectedRecipe.outputUnits && (
        <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-4">📦 Receita por Lote</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="text-left py-2">Cenário</th>
                  <th className="text-right py-2">Preço/Un</th>
                  <th className="text-right py-2">Receita Total</th>
                  <th className="text-right py-2">Lucro Total</th>
                  <th className="text-right py-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((scenario) => {
                  const price = effectiveCost / (1 - scenario.margin / 100);
                  const revenue = price * selectedRecipe.outputUnits!;
                  const profit = revenue - selectedRecipe.batchCost;
                  const roi = (profit / selectedRecipe.batchCost) * 100;
                  
                  return (
                    <tr key={scenario.label} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: scenario.color }}
                          />
                          {scenario.label}
                        </div>
                      </td>
                      <td className="text-right font-mono">AU${price.toFixed(2)}</td>
                      <td className="text-right font-mono">AU${revenue.toFixed(2)}</td>
                      <td className="text-right font-mono font-semibold" style={{ color: scenario.color }}>
                        AU${profit.toFixed(2)}
                      </td>
                      <td className="text-right font-mono">{roi.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
