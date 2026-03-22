"use client";

import { useState } from "react";

type OverheadCost = {
  id: number;
  name: string;
  amount: number;
  period: string;
  notes: string | null;
  active: number | boolean;
};

type NewOverheadForm = {
  name: string;
  amount: string;
  period: string;
  notes: string;
};

export function OverheadEditor({
  overheadCosts,
  profileId,
  estimatedUnitsPerMonth,
}: {
  overheadCosts: OverheadCost[];
  profileId: number;
  estimatedUnitsPerMonth: number | null;
}) {
  const [units, setUnits] = useState(estimatedUnitsPerMonth?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOverhead, setNewOverhead] = useState<NewOverheadForm>({
    name: "",
    amount: "",
    period: "MONTHLY",
    notes: "",
  });
  const [addingNew, setAddingNew] = useState(false);

  const handleSaveUnits = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/pricing-profile/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedUnitsPerMonth: units ? parseInt(units) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      setMessage("✓ Saved");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error(error);
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = units !== (estimatedUnitsPerMonth?.toString() ?? "");

  const handleAddNew = async () => {
    if (!newOverhead.name || !newOverhead.amount) {
      alert("Name and amount are required");
      return;
    }

    setAddingNew(true);
    try {
      const response = await fetch("/api/overhead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOverhead),
      });

      if (!response.ok) {
        throw new Error("Failed to add overhead cost");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Error adding overhead cost");
    } finally {
      setAddingNew(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/overhead/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle overhead cost");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Error toggling overhead cost");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/overhead/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete overhead cost");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Error deleting overhead cost");
    }
  };

  return (
    <div className="space-y-6">
      {/* Production Volume Estimator */}
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "#fef3c7" }}>
        <h2 className="text-lg font-semibold mb-3">📊 Monthly Production Volume</h2>
        
        <p className="text-sm mb-4" style={{ color: "#92400e" }}>
          <strong>Important:</strong> This number dilutes your fixed monthly costs across all units you produce. 
          Higher production = lower overhead per unit.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              Estimated Units Produced per Month
            </label>
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g., 500"
              className="w-full rounded-md border px-3 py-2"
              style={{ borderColor: "var(--color-border)" }}
              min="1"
              step="1"
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Total units across all products
            </p>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleSaveUnits}
              disabled={saving || !hasChanges}
              className="px-4 py-2 rounded-md font-medium disabled:opacity-50"
              style={{
                backgroundColor: hasChanges ? "var(--color-accent)" : "var(--color-border)",
                color: hasChanges ? "white" : "var(--color-text-muted)",
              }}
            >
              {saving ? "Saving..." : "Update Production Estimate"}
            </button>
            {message && (
              <span className="text-sm mt-2" style={{ 
                color: message.includes("Error") ? "#ef4444" : "#10b981" 
              }}>
                {message}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-md" style={{ backgroundColor: "#dbeafe", border: "1px solid #3b82f6" }}>
          <p className="text-sm" style={{ color: "#1e40af" }}>
            💡 <strong>Tip:</strong> If you make 10 bath bombs/week, that's ~40/month. 
            If you also make 20 soaps/week, that's ~80/month. Total: 120 units/month.
          </p>
        </div>
      </div>

      {/* Overhead Costs Table */}
      <div className="rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold">Fixed Monthly Costs</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            These costs are spread across all units produced
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
                <th className="text-left p-3">Cost Item</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-center p-3">Period</th>
                <th className="text-right p-3">Monthly</th>
                <th className="text-center p-3">Active</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overheadCosts.map((cost) => {
                const monthly = cost.period === "MONTHLY" 
                  ? cost.amount 
                  : cost.period === "WEEKLY" 
                    ? cost.amount * (52 / 12)
                    : cost.amount / 12;

                return (
                  <tr 
                    key={cost.id} 
                    className="border-b" 
                    style={{ 
                      borderColor: "var(--color-border)",
                      opacity: cost.active ? 1 : 0.5,
                    }}
                  >
                    <td className="p-3">
                      <div className="font-medium">{cost.name}</div>
                      {cost.notes && (
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {cost.notes}
                        </div>
                      )}
                    </td>
                    <td className="text-right p-3 font-mono">
                      AU${cost.amount.toFixed(2)}
                    </td>
                    <td className="text-center p-3">
                      <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--color-bg-subtle)" }}>
                        {cost.period}
                      </span>
                    </td>
                    <td className="text-right p-3 font-mono font-semibold">
                      AU${monthly.toFixed(2)}
                    </td>
                    <td className="text-center p-3">
                      {cost.active ? (
                        <span style={{ color: "#10b981" }}>✓</span>
                      ) : (
                        <span style={{ color: "#ef4444" }}>✗</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleToggleActive(cost.id, Boolean(cost.active))}
                          className="px-2 py-1 rounded text-xs hover:opacity-80"
                          style={{
                            backgroundColor: cost.active ? "#fef3c7" : "#d1fae5",
                            color: cost.active ? "#92400e" : "#065f46",
                          }}
                          title={cost.active ? "Deactivate" : "Activate"}
                        >
                          {cost.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id, cost.name)}
                          className="px-2 py-1 rounded text-xs hover:opacity-80"
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                          }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-md font-medium"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "white",
            }}
          >
            {showAddForm ? "Cancel" : "+ Add New Overhead Cost"}
          </button>
        </div>

        {showAddForm && (
          <div className="p-6 border-t" style={{ borderColor: "var(--color-border)", backgroundColor: "#f0fdf4" }}>
            <h3 className="font-semibold mb-4">Add New Overhead Cost</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newOverhead.name}
                  onChange={(e) => setNewOverhead({ ...newOverhead, name: e.target.value })}
                  placeholder="e.g., Insurance, Taxes, Website"
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount (AU$) *</label>
                <input
                  type="number"
                  value={newOverhead.amount}
                  onChange={(e) => setNewOverhead({ ...newOverhead, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "var(--color-border)" }}
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Period *</label>
                <select
                  value={newOverhead.period}
                  onChange={(e) => setNewOverhead({ ...newOverhead, period: e.target.value })}
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newOverhead.notes}
                  onChange={(e) => setNewOverhead({ ...newOverhead, notes: e.target.value })}
                  placeholder="Additional details"
                  className="w-full rounded-md border px-3 py-2"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleAddNew}
                disabled={addingNew || !newOverhead.name || !newOverhead.amount}
                className="px-4 py-2 rounded-md font-medium disabled:opacity-50"
                style={{
                  backgroundColor: newOverhead.name && newOverhead.amount ? "#10b981" : "var(--color-border)",
                  color: newOverhead.name && newOverhead.amount ? "white" : "var(--color-text-muted)",
                }}
              >
                {addingNew ? "Adding..." : "Add Overhead Cost"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border p-6" style={{ borderColor: "#10b981", backgroundColor: "#f0fdf4" }}>
        <h3 className="font-semibold mb-3" style={{ color: "#166534" }}>
          💰 Overhead Recommendations
        </h3>
        
        <div className="space-y-2 text-sm" style={{ color: "#166534" }}>
          <p>
            <strong>For small-scale production (hobby/side business):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Set overhead costs to AU$0 or very low amounts</li>
            <li>Include overhead in your margin instead (use 65-75% margin)</li>
            <li>Only track direct material costs</li>
          </ul>

          <p className="mt-3">
            <strong>For medium-scale production (part-time business):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Estimate realistic monthly production (200-500 units)</li>
            <li>Include only business-specific costs (not personal rent)</li>
            <li>Review and adjust quarterly</li>
          </ul>

          <p className="mt-3">
            <strong>For full-scale production (full-time business):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Estimate 500-2000+ units/month depending on products</li>
            <li>Include all business costs (rent, utilities, marketing, etc.)</li>
            <li>Review monthly and adjust based on actual production</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
