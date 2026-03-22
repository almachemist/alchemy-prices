"use client";

import { useState } from "react";

type RecipeYieldEditorProps = {
  recipeId: number;
  initialOutputUnits: number | null;
  initialUnitWeightG: number | null;
  batchSize: number;
};

export function RecipeYieldEditor({
  recipeId,
  initialOutputUnits,
  initialUnitWeightG,
  batchSize,
}: RecipeYieldEditorProps) {
  const [outputUnits, setOutputUnits] = useState(initialOutputUnits?.toString() ?? "");
  const [unitWeightG, setUnitWeightG] = useState(initialUnitWeightG?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputUnits: outputUnits ? parseInt(outputUnits) : null,
          unitWeightG: unitWeightG ? parseFloat(unitWeightG) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || "Failed to update recipe";
        console.error("API error:", errorData);
        throw new Error(errorMsg);
      }

      setMessage("✓ Saved");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Save error:", error);
      setMessage(error instanceof Error ? `Error: ${error.message}` : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = outputUnits && unitWeightG 
    ? (parseInt(outputUnits) * parseFloat(unitWeightG)).toFixed(0)
    : null;

  const hasChanges = 
    outputUnits !== (initialOutputUnits?.toString() ?? "") ||
    unitWeightG !== (initialUnitWeightG?.toString() ?? "");

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
      <h3 className="font-semibold mb-3">Units per Batch</h3>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Units Produced
          </label>
          <input
            type="number"
            value={outputUnits}
            onChange={(e) => setOutputUnits(e.target.value)}
            placeholder="e.g., 50"
            className="w-full rounded-md border px-3 py-2"
            style={{ borderColor: "var(--color-border)" }}
            min="1"
            step="1"
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            How many units from {batchSize}g batch
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Weight per Unit (g)
          </label>
          <input
            type="number"
            value={unitWeightG}
            onChange={(e) => setUnitWeightG(e.target.value)}
            placeholder="e.g., 85"
            className="w-full rounded-md border px-3 py-2"
            style={{ borderColor: "var(--color-border)" }}
            min="0.1"
            step="0.1"
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Grams per individual unit
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Total Weight Check
          </label>
          <div className="rounded-md border px-3 py-2 bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
            {totalWeight ? (
              <span className="font-mono">{totalWeight}g</span>
            ) : (
              <span style={{ color: "var(--color-text-muted)" }}>—</span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Units × Weight
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="px-4 py-2 rounded-md font-medium disabled:opacity-50"
          style={{
            backgroundColor: hasChanges ? "var(--color-accent)" : "var(--color-border)",
            color: hasChanges ? "white" : "var(--color-text-muted)",
          }}
        >
          {saving ? "Saving..." : "Save Yield Settings"}
        </button>
        
        {message && (
          <span className="text-sm" style={{ 
            color: message.includes("Error") ? "#ef4444" : "#10b981" 
          }}>
            {message}
          </span>
        )}
      </div>

      {totalWeight && parseFloat(totalWeight) !== batchSize && (
        <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b", border: "1px solid" }}>
          <p className="text-sm" style={{ color: "#92400e" }}>
            ⚠️ Note: Total unit weight ({totalWeight}g) differs from batch size ({batchSize}g). 
            This is normal if there's waste or if you're using different molds.
          </p>
        </div>
      )}
    </div>
  );
}
