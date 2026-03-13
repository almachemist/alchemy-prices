"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  unitType: string;
  purchaseSize: number;
  purchaseUnit: string;
  purchaseCostAud: number;
  unitPrice: number;
  notes: string | null;
};

export function InventoryTable({
  items: initialItems,
  categoryLabels,
}: {
  items: InventoryItem[];
  categoryLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editSize, setEditSize] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = [...new Set(initialItems.map((i) => i.category))].sort();

  const filtered = initialItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "ALL" || item.category === filterCat;
    return matchSearch && matchCat;
  });

  async function handleSave(item: InventoryItem) {
    const price = parseFloat(editPrice);
    const size = parseFloat(editSize);
    if (isNaN(price) || isNaN(size)) return;
    setSaving(true);
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseCostAud: price, purchaseSize: size }),
    });
    setEditingId(null);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select max-w-[200px]"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{categoryLabels[cat] ?? cat}</option>
          ))}
        </select>
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {filtered.length} items
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
              <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Name</th>
              <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Category</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Purchase Size</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Purchase Cost</th>
              <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Unit Price</th>
              <th className="py-2 pl-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="table-row border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <td className="py-2.5 pr-4">
                  <div className="font-medium">{item.name}</div>
                  {item.notes && (
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.notes}</div>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span className="badge badge-gray">{categoryLabels[item.category] ?? item.category}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      className="input w-20 text-right text-sm"
                      value={editSize}
                      onChange={(e) => setEditSize(e.target.value)}
                      step="any"
                    />
                  ) : (
                    <span>{item.purchaseSize} {item.purchaseUnit}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      className="input w-24 text-right text-sm"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      step="any"
                      onKeyDown={(e) => e.key === "Enter" && handleSave(item)}
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">AU${item.purchaseCostAud.toFixed(2)}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold" style={{ color: "var(--color-accent)" }}>
                  ${item.unitPrice.toFixed(4)}/{item.purchaseUnit}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  {editingId === item.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleSave(item)} disabled={saving} className="btn-primary text-xs px-2 py-1">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-xs">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditPrice(String(item.purchaseCostAud));
                        setEditSize(String(item.purchaseSize));
                      }}
                      className="btn-ghost text-xs"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
