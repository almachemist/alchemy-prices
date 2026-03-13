"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  recipeId: number;
  name: string;
  notes: string | null;
  batchSize: number;
  batchUnit: string;
};

export function RecipeHeader({ recipeId, name, notes, batchSize, batchUnit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editNotes, setEditNotes] = useState(notes ?? "");
  const [editBatchSize, setEditBatchSize] = useState(String(batchSize));
  const [editBatchUnit, setEditBatchUnit] = useState(batchUnit);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        notes: editNotes || null,
        batchSize: parseFloat(editBatchSize) || batchSize,
        batchUnit: editBatchUnit,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    router.push("/recipes");
  }

  if (editing) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Edit Recipe
          </h2>
          <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Recipe Name
            </label>
            <input
              type="text"
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
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
                value={editBatchSize}
                onChange={(e) => setEditBatchSize(e.target.value)}
                step="any"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Unit
              </label>
              <select
                className="select"
                value={editBatchUnit}
                onChange={(e) => setEditBatchUnit(e.target.value)}
              >
                <option value="ML">ML</option>
                <option value="G">G</option>
                <option value="EACH">EACH</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Notes
          </label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add recipe notes, instructions, observations..."
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDelete(!showDelete)}
            className="text-sm font-medium rounded-xl px-3 py-1.5 transition"
            style={{ color: "var(--color-danger)" }}
          >
            Delete Recipe
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {showDelete && (
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "var(--color-danger-soft)", border: "1px solid #fecaca" }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
                Permanently delete &ldquo;{name}&rdquo;?
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                This will remove the recipe and all its ingredients. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="btn-ghost text-xs">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
                style={{ background: "var(--color-danger)" }}
              >
                {saving ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">{name}</h1>
        {notes && (
          <p className="mt-1 text-sm whitespace-pre-line" style={{ color: "var(--color-text-muted)" }}>
            {notes}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="badge badge-green text-sm">
          {batchSize} {batchUnit}
        </span>
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs">
          Edit
        </button>
      </div>
    </div>
  );
}
