"use client";

import { useState, useMemo } from "react";
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

type SortKey = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "cost-asc" | "cost-desc";

const CATEGORY_COLORS: Record<string, string> = {
  CARRIER_OIL: "#22c55e",
  ESSENTIAL_OIL: "#8b5cf6",
  BUTTER: "#f59e0b",
  BOTANICAL: "#10b981",
  CLAY: "#a3712e",
  SOAP_BASE: "#3b82f6",
  COLORANT: "#ec4899",
  MOLD: "#6b7280",
  PACKAGING: "#0ea5e9",
  CONSUMABLE: "#94a3b8",
};

function findDuplicateGroups(items: InventoryItem[]): Map<string, InventoryItem[]> {
  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    // Normalize name for duplicate detection: lowercase, remove extra whitespace, remove common suffixes
    const key = item.name
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  // Only keep groups with 2+ items
  const dupes = new Map<string, InventoryItem[]>();
  for (const [key, group] of groups) {
    if (group.length >= 2) dupes.set(key, group);
  }
  return dupes;
}

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
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ name: "", price: "", size: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);
  const [merging, setMerging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"categories" | "flat">("categories");

  const categories = useMemo(
    () => [...new Set(initialItems.map((i) => i.category))].sort(),
    [initialItems]
  );

  const duplicateGroups = useMemo(() => findDuplicateGroups(initialItems), [initialItems]);

  const filtered = useMemo(() => {
    let items = initialItems.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "ALL" || item.category === filterCat;
      return matchSearch && matchCat;
    });

    items.sort((a, b) => {
      switch (sortKey) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "price-asc": return a.unitPrice - b.unitPrice;
        case "price-desc": return b.unitPrice - a.unitPrice;
        case "cost-asc": return a.purchaseCostAud - b.purchaseCostAud;
        case "cost-desc": return b.purchaseCostAud - a.purchaseCostAud;
        default: return 0;
      }
    });

    return items;
  }, [initialItems, search, filterCat, sortKey]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    for (const item of filtered) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return groups;
  }, [filtered]);

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  async function handleSave(item: InventoryItem) {
    const price = parseFloat(editFields.price);
    const size = parseFloat(editFields.size);
    if (isNaN(price) || isNaN(size)) return;
    setSaving(true);
    await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseCostAud: price,
        purchaseSize: size,
        ...(editFields.name !== item.name && { name: editFields.name }),
      }),
    });
    setEditingId(null);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    router.refresh();
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected items? This cannot be undone.`)) return;
    const promises = [...selected].map((id) =>
      fetch(`/api/inventory/${id}`, { method: "DELETE" })
    );
    await Promise.all(promises);
    setSelected(new Set());
    router.refresh();
  }

  async function handleMerge(keepId: number, deleteIds: number[]) {
    setMerging(true);
    await fetch("/api/inventory/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, deleteIds }),
    });
    setMerging(false);
    router.refresh();
  }

  function renderItemRow(item: InventoryItem) {
    const isEditing = editingId === item.id;
    const isConfirmingDelete = confirmDelete === item.id;
    const catColor = CATEGORY_COLORS[item.category] || "#6b7280";

    return (
      <tr
        key={item.id}
        className="border-b transition-colors"
        style={{
          borderColor: "var(--color-border-light)",
          background: selected.has(item.id) ? "rgba(99,102,241,0.06)" : undefined,
        }}
      >
        <td className="py-2 px-2 w-8">
          <input
            type="checkbox"
            checked={selected.has(item.id)}
            onChange={() => toggleSelect(item.id)}
          />
        </td>
        <td className="py-2 pr-3">
          {isEditing ? (
            <input
              type="text"
              className="input text-sm w-full"
              value={editFields.name}
              onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
            />
          ) : (
            <div className="font-medium">{item.name}</div>
          )}
          {!isEditing && item.notes && (
            <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{item.notes}</div>
          )}
        </td>
        {viewMode === "flat" && (
          <td className="py-2 px-2">
            <span
              className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ background: catColor }}
            >
              {categoryLabels[item.category] ?? item.category}
            </span>
          </td>
        )}
        <td className="py-2 px-2 text-right whitespace-nowrap">
          {isEditing ? (
            <input
              type="number"
              className="input w-20 text-right text-sm"
              value={editFields.size}
              onChange={(e) => setEditFields((f) => ({ ...f, size: e.target.value }))}
              step="any"
            />
          ) : (
            <span>{item.purchaseSize} {item.purchaseUnit}</span>
          )}
        </td>
        <td className="py-2 px-2 text-right whitespace-nowrap">
          {isEditing ? (
            <input
              type="number"
              className="input w-24 text-right text-sm"
              value={editFields.price}
              onChange={(e) => setEditFields((f) => ({ ...f, price: e.target.value }))}
              step="any"
              onKeyDown={(e) => e.key === "Enter" && handleSave(item)}
            />
          ) : item.purchaseCostAud === 0 ? (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>NEEDS COST</span>
          ) : (
            <span className="font-medium">AU${item.purchaseCostAud.toFixed(2)}</span>
          )}
        </td>
        <td className="py-2 px-2 text-right font-semibold whitespace-nowrap" style={{ color: item.unitPrice > 0 ? "var(--color-accent)" : "#ef4444" }}>
          {item.unitPrice > 0 ? `$${item.unitPrice.toFixed(4)}/${item.purchaseUnit}` : "—"}
        </td>
        <td className="py-2 pl-2 text-right whitespace-nowrap">
          {isEditing ? (
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => handleSave(item)} disabled={saving} className="btn-primary text-xs px-2 py-1">Save</button>
              <button onClick={() => setEditingId(null)} className="btn-ghost text-xs">Cancel</button>
            </div>
          ) : isConfirmingDelete ? (
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded font-medium text-white" style={{ background: "#ef4444" }}>
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-xs">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => {
                  setEditingId(item.id);
                  setEditFields({
                    name: item.name,
                    price: String(item.purchaseCostAud),
                    size: String(item.purchaseSize),
                  });
                }}
                className="btn-ghost text-xs"
                style={{ color: "var(--color-accent)" }}
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(item.id)}
                className="btn-ghost text-xs"
                style={{ color: "#ef4444" }}
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  function renderTableHead() {
    return (
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
          <th className="py-2 px-2 w-8">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} />
          </th>
          <th className="py-2 pr-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Name</th>
          {viewMode === "flat" && (
            <th className="py-2 px-2 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Category</th>
          )}
          <th className="py-2 px-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Size</th>
          <th className="py-2 px-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Cost</th>
          <th className="py-2 px-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>$/Unit</th>
          <th className="py-2 pl-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Actions</th>
        </tr>
      </thead>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
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
          <select
            className="select max-w-[180px]"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name-asc">Name A → Z</option>
            <option value="name-desc">Name Z → A</option>
            <option value="price-asc">Unit Price: Low → High</option>
            <option value="price-desc">Unit Price: High → Low</option>
            <option value="cost-asc">Cost: Low → High</option>
            <option value="cost-desc">Cost: High → Low</option>
          </select>
          <div className="flex items-center gap-1 rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border-light)" }}>
            <button
              onClick={() => setViewMode("categories")}
              className="text-xs px-3 py-1.5 font-medium transition-colors"
              style={{
                background: viewMode === "categories" ? "var(--color-accent)" : "transparent",
                color: viewMode === "categories" ? "white" : "var(--color-text-muted)",
              }}
            >
              By Category
            </button>
            <button
              onClick={() => setViewMode("flat")}
              className="text-xs px-3 py-1.5 font-medium transition-colors"
              style={{
                background: viewMode === "flat" ? "var(--color-accent)" : "transparent",
                color: viewMode === "flat" ? "white" : "var(--color-text-muted)",
              }}
            >
              Flat List
            </button>
          </div>
          <span className="text-sm ml-auto" style={{ color: "var(--color-text-muted)" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div
            className="mt-3 flex items-center gap-3 rounded-lg px-4 py-2"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <span className="text-sm font-medium">{selected.size} selected</span>
            <button
              onClick={handleBulkDelete}
              className="text-xs px-3 py-1 rounded font-medium text-white"
              style={{ background: "#ef4444" }}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="btn-ghost text-xs"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Duplicates banner */}
      {duplicateGroups.size > 0 && (
        <div
          className="card cursor-pointer"
          style={{ borderLeft: "4px solid #f59e0b" }}
          onClick={() => setShowMerge(!showMerge)}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm" style={{ color: "#f59e0b" }}>
                {duplicateGroups.size} possible duplicate{duplicateGroups.size > 1 ? " groups" : ""} detected
              </span>
              <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>
                Click to {showMerge ? "hide" : "review & merge"}
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {showMerge ? "▲" : "▼"}
            </span>
          </div>

          {showMerge && (
            <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
              {[...duplicateGroups.entries()].map(([key, group]) => (
                <div key={key} className="rounded-lg p-3" style={{ background: "var(--color-bg-secondary, rgba(0,0,0,0.03))" }}>
                  <div className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Duplicate group ({group.length} items):
                  </div>
                  {group.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm py-1">
                      <span className={idx === 0 ? "font-semibold" : ""}>{item.name}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {item.purchaseSize} {item.purchaseUnit} — AU${item.purchaseCostAud.toFixed(2)}
                      </span>
                      {idx === 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                          KEEP
                        </span>
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => handleMerge(group[0].id, [item.id])}
                          disabled={merging}
                          className="text-xs px-2 py-0.5 rounded font-medium text-white ml-auto"
                          style={{ background: "#f59e0b" }}
                        >
                          {merging ? "..." : "Merge into first"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category-grouped view */}
      {viewMode === "categories" ? (
        <div className="space-y-4">
          {[...groupedByCategory.entries()].map(([cat, catItems]) => {
            const collapsed = collapsedCats.has(cat);
            const catColor = CATEGORY_COLORS[cat] || "#6b7280";
            return (
              <div key={cat} className="card" style={{ borderLeft: `4px solid ${catColor}` }}>
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ background: catColor }}
                    />
                    <h3 className="font-semibold text-sm">
                      {categoryLabels[cat] ?? cat}
                    </h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-bg-secondary, rgba(0,0,0,0.05))", color: "var(--color-text-muted)" }}>
                      {catItems.length}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {collapsed ? "▶" : "▼"}
                  </span>
                </button>

                {!collapsed && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      {renderTableHead()}
                      <tbody>
                        {catItems.map(renderItemRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat list view */
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {renderTableHead()}
              <tbody>
                {filtered.map(renderItemRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
