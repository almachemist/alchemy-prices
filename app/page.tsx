import { prisma } from "./lib/prisma";
import {
  recipeBatchCost,
  unitCostFromBatch,
  totalMonthlyOverhead,
  overheadPerUnit,
  toMonthlyAmount,
  type OverheadRow,
} from "./lib/pricing";
import Link from "next/link";

export default async function Home() {
  const recipes = await prisma.recipe.findMany({
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const overheadRows = await prisma.$queryRawUnsafe<OverheadRow[]>(
    `SELECT id, name, amount, period, notes, active FROM OverheadCost WHERE active = 1 ORDER BY name`,
  );

  type ProfileRow = { estimatedUnitsPerMonth: number | null };
  const profileRows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT estimatedUnitsPerMonth FROM PricingProfile WHERE name = 'Default' LIMIT 1`,
  );
  const estimatedUnitsPerMonth = profileRows[0]?.estimatedUnitsPerMonth ?? 50;

  const monthlyOverhead = totalMonthlyOverhead(overheadRows);
  const ohPerUnit = overheadPerUnit(overheadRows, estimatedUnitsPerMonth);

  type CategoryCount = { category: string; count: number };
  const categories = await prisma.$queryRawUnsafe<CategoryCount[]>(
    `SELECT category, COUNT(*) as count FROM InventoryItem GROUP BY category ORDER BY category`,
  );
  const totalItems = categories.reduce((s, c) => s + Number(c.count), 0);

  const clients = await prisma.client.count();
  const orders = await prisma.order.count();
  
  const invoices = await prisma.invoice.findMany({
    include: {
      client: true,
    },
    orderBy: { issueDate: "desc" },
    take: 5,
  });

  const invoiceStats = {
    totalRevenue: await prisma.invoice.aggregate({
      _sum: { total: true },
    }),
    totalOutstanding: await prisma.invoice.aggregate({
      _sum: { amountDue: true },
    }),
    overdueCount: await prisma.invoice.count({
      where: { paymentStatus: "OVERDUE" },
    }),
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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Overview of your recipes, inventory and overhead costs.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <div className="stat-card">
          <div className="stat-value">{clients}</div>
          <div className="stat-label">Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{orders}</div>
          <div className="stat-label">Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AU${(invoiceStats.totalRevenue._sum.total ?? 0).toFixed(0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: (invoiceStats.totalOutstanding._sum.amountDue ?? 0) > 0 ? "var(--color-gold)" : "inherit" }}>
            AU${(invoiceStats.totalOutstanding._sum.amountDue ?? 0).toFixed(0)}
          </div>
          <div className="stat-label">Outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{recipes.length}</div>
          <div className="stat-label">Recipes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalItems}</div>
          <div className="stat-label">Inventory</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recipe cost overview */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Recipe Costs
            </h2>
            <Link href="/recipes" className="btn-secondary text-xs">
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                  <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Recipe</th>
                  <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Batch</th>
                  <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Units</th>
                  <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Ingr/Unit</th>
                  <th className="py-2 pl-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Total/Unit</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => {
                  const rBatchCost = recipeBatchCost(recipe as never);
                  const unitSize = recipe.batchUnit === "ML"
                    ? Math.min(100, recipe.batchSize)
                    : recipe.batchUnit === "EACH" ? 1 : recipe.batchSize;
                  const { unitsProduced: u, unitCost: c } = unitCostFromBatch({
                    batchCost: rBatchCost,
                    batchSize: recipe.batchSize,
                    unitSize,
                  });
                  const total = u ? c + ohPerUnit : 0;

                  return (
                    <tr key={recipe.id} className="table-row border-b" style={{ borderColor: "var(--color-border-light)" }}>
                      <td className="py-2.5 pr-4">
                        <Link href={`/recipes/${recipe.id}`} className="font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
                          {recipe.name}
                        </Link>
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {recipe.batchSize} {recipe.batchUnit}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        AU${rBatchCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                        {u || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {u ? `AU$${c.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-semibold" style={{ color: "var(--color-accent)" }}>
                        {u ? `AU$${total.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Recent Invoices */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                Recent Invoices
              </h3>
              <Link href="/invoices" className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                View all →
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="py-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                No invoices yet
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case "PAID": return "var(--color-accent)";
                      case "OVERDUE": return "var(--color-danger)";
                      case "PARTIALLY_PAID": return "var(--color-gold)";
                      default: return "var(--color-text-muted)";
                    }
                  };
                  
                  return (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="block p-2.5 rounded-lg hover:bg-opacity-50"
                      style={{ background: "var(--color-bg-subtle)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{invoice.invoiceNumber}</span>
                        <span className="text-xs font-semibold" style={{ color: getStatusColor(invoice.paymentStatus) }}>
                          AU${invoice.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                        <span>{invoice.client.name}</span>
                        {invoice.amountDue > 0 && (
                          <span style={{ color: "var(--color-gold)" }}>Due: AU${invoice.amountDue.toFixed(2)}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overhead breakdown */}
          <div className="card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Monthly Overhead
            </h3>
            <div className="space-y-2">
              {overheadRows.map((row) => {
                const monthly = toMonthlyAmount(row);
                const periodLabel =
                  row.period === "WEEKLY" ? "/wk" : row.period === "ANNUAL" ? "/yr" : "/mo";
                return (
                  <div key={row.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        ${row.amount}{periodLabel}
                      </span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
                      ${monthly.toFixed(2)}/mo
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border-light)" }}>
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold" style={{ color: "var(--color-accent)" }}>
                AU${monthlyOverhead.toFixed(2)}/mo
              </span>
            </div>
            <div className="mt-1 text-xs text-right" style={{ color: "var(--color-text-muted)" }}>
              ÷ {estimatedUnitsPerMonth} units = AU${ohPerUnit.toFixed(2)}/unit
            </div>
          </div>

          {/* Inventory categories */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                Inventory
              </h3>
              <Link href="/inventory" className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(({ category, count }) => (
                <div
                  key={category}
                  className="rounded-xl px-3 py-2"
                  style={{ background: "var(--color-bg-subtle)" }}
                >
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {categoryLabels[category] ?? category}
                  </div>
                  <div className="text-sm font-semibold">{String(count)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
