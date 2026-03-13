"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateRecipeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [batchUnit, setBatchUnit] = useState("ML");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name || !batchSize) return;
    setSaving(true);
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        batchSize: parseFloat(batchSize),
        batchUnit,
        notes: notes || null,
      }),
    });
    const recipe = await res.json();
    setSaving(false);
    router.push(`/recipes/${recipe.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New Recipe
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          New Recipe
        </h3>
        <button onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Recipe Name
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tropical Baby Oil"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Batch Size
            </label>
            <input
              type="number"
              className="input"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="100"
              step="any"
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Unit
            </label>
            <select className="select" value={batchUnit} onChange={(e) => setBatchUnit(e.target.value)}>
              <option value="ML">ML</option>
              <option value="G">G</option>
              <option value="EACH">EACH</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Notes (optional)
        </label>
        <textarea
          className="input min-h-[60px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Recipe notes, instructions..."
        />
      </div>

      <div className="flex justify-end">
        <button onClick={handleCreate} disabled={saving || !name || !batchSize} className="btn-primary">
          {saving ? "Creating..." : "Create Recipe"}
        </button>
      </div>
    </div>
  );
}
