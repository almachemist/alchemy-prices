import { prisma } from "../lib/prisma";
import { costPerBaseUnit } from "../lib/pricing";
import { InventoryTable } from "../components/InventoryTable";

const categoryLabels: Record<string, string> = {
  CARRIER_OIL: "Carrier Oils",
  ESSENTIAL_OIL: "Essential Oils",
  BUTTER: "Butters",
  BOTANICAL: "Botanicals & Powders",
  CLAY: "Clays",
  SOAP_BASE: "Soap Bases",
  COLORANT: "Colorants",
  MOLD: "Moulds",
  PACKAGING: "Packaging & Labels",
  CONSUMABLE: "Consumables",
};

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    include: { essentialOilSpec: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const itemsForClient = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unitType: item.unitType,
    purchaseSize: item.purchaseSize,
    purchaseUnit: item.purchaseUnit,
    purchaseCostAud: item.purchaseCostAud,
    unitPrice: costPerBaseUnit(item),
    notes: item.notes,
  }));

  const categories = Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          All ingredients, packaging, and supplies with current pricing.
        </p>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map(([cat, count]) => (
          <span key={cat} className="badge badge-green">
            {categoryLabels[cat] ?? cat} ({count})
          </span>
        ))}
        <span className="badge badge-blue">
          Total: {items.length}
        </span>
      </div>

      <InventoryTable items={itemsForClient} categoryLabels={categoryLabels} />
    </div>
  );
}
