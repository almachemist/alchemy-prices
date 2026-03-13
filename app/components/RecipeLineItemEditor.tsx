"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = {
  id: number;
  quantity: number;
  unit: string;
  inventoryItemId: number | null;
  inventoryItemName: string;
  category: string;
  cost: number;
  unitPrice: number;
};

type InventoryOption = {
  id: number;
  name: string;
  category: string;
  unitType: string;
  purchaseUnit: string;
  unitPrice: number;
};

const categoryLabels: Record<string, string> = {
  CARRIER_OIL: "Carrier Oils",
  ESSENTIAL_OIL: "Essential Oils",
  BUTTER: "Butters",
  BOTANICAL: "Botanicals",
  CLAY: "Clays",
  SOAP_BASE: "Soap Bases",
  COLORANT: "Colorants",
  MOLD: "Moulds",
  PACKAGING: "Packaging",
  CONSUMABLE: "Consumables",
};

export function RecipeLineItemEditor({
  recipeId,
  lineItems: initialItems,
  inventoryItems,
  batchCost: initialBatchCost,
  ohPerUnit,
}: {
  recipeId: number;
  lineItems: LineItem[];
  inventoryItems: InventoryOption[];
  batchCost: number;
  ohPerUnit: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("ML");
  const [saving, setSaving] = useState(false);

  const totalCost = items.reduce((s, i) => s + i.cost, 0);

  async function handleUpdateQty(li: LineItem) {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) return;
    setSaving(true);
    await fetch(`/api/recipes/${recipeId}/line-items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineItemId: li.id, quantity: qty }),
    });
    setEditing(null);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(lineItemId: number) {
    setSaving(true);
    await fetch(`/api/recipes/${recipeId}/line-items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineItemId }),
    });
    setItems(items.filter((i) => i.id !== lineItemId));
    setSaving(false);
    router.refresh();
  }

  async function handleAdd() {
    const itemId = parseInt(newItemId);
    const qty = parseFloat(newQty);
    if (isNaN(itemId) || isNaN(qty) || qty <= 0) return;
    setSaving(true);
    await fetch(`/api/recipes/${recipeId}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: itemId, quantity: qty, unit: newUnit }),
    });
    setAdding(false);
    setNewItemId("");
    setNewQty("");
    setSaving(false);
    router.refresh();
  }

  const grouped = inventoryItems.reduce<Record<string, InventoryOption[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Ingredients ({items.length})
        </h2>
        <button
          onClick={() => setAdding(!adding)}
          className="btn-primary text-xs"
        >
          {adding ? "Cancel" : "+ Add Ingredient"}
        </button>
      </div>

      {adding && (
        <div
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl p-4"
          style={{ background: "var(--color-bg-subtle)" }}
        >
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Ingredient
            </label>
            <select
              className="select"
              value={newItemId}
              onChange={(e) => {
                setNewItemId(e.target.value);
                const item = inventoryItems.find((i) => i.id === parseInt(e.target.value));
                if (item) setNewUnit(item.purchaseUnit);
              }}
            >
              <option value="">Select ingredient...</option>
              {Object.entries(grouped).map(([cat, opts]) => (
                <optgroup key={cat} label={categoryLabels[cat] ?? cat}>
                  {opts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} (${o.unitPrice.toFixed(4)}/{o.purchaseUnit})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Quantity
            </label>
            <input
              type="number"
              className="input"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="0"
              step="any"
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Unit
            </label>
            <select className="select" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
              <option value="ML">ML</option>
              <option value="G">G</option>
              <option value="EACH">EACH</option>
              <option value="DROPS">DROPS</option>
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving} className="btn-primary text-xs">
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
              <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Ingredient</th>
              <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Category</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Qty</th>
              <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Unit</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Unit Price</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Line Cost</th>
              <th className="py-2 pl-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((li) => (
              <tr key={li.id} className="table-row border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <td className="py-2.5 pr-4 font-medium">{li.inventoryItemName}</td>
                <td className="py-2.5 px-3">
                  <span className="badge badge-gray">{categoryLabels[li.category] ?? li.category}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {editing === li.id ? (
                    <input
                      type="number"
                      className="input w-20 text-right text-sm"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateQty(li)}
                      autoFocus
                      step="any"
                    />
                  ) : (
                    <span
                      className="cursor-pointer rounded px-1 py-0.5 hover:bg-amber-50"
                      onClick={() => { setEditing(li.id); setEditQty(String(li.quantity)); }}
                    >
                      {li.quantity}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{li.unit}</td>
                <td className="py-2.5 px-3 text-right text-xs" style={{ color: "var(--color-text-muted)" }}>
                  ${li.unitPrice.toFixed(4)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold" style={{ color: "var(--color-gold)" }}>
                  AU${li.cost.toFixed(4)}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {editing === li.id ? (
                      <>
                        <button onClick={() => handleUpdateQty(li)} disabled={saving} className="btn-primary text-xs px-2 py-1">
                          Save
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-ghost text-xs">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(li.id)}
                        className="text-xs font-medium px-2 py-1 rounded-lg transition"
                        style={{ color: "var(--color-danger)" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: "var(--color-border)" }}>
              <td colSpan={5} className="py-3 pr-3 text-right font-semibold">Total Batch Cost</td>
              <td className="py-3 px-3 text-right text-base font-bold" style={{ color: "var(--color-accent)" }}>
                AU${totalCost.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
