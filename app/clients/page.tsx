import { prisma } from "../lib/prisma";
import Link from "next/link";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      orders: true,
      invoices: {
        include: {
          payments: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clientStats = clients.map((client) => {
    const totalOrders = client.orders.length;
    const totalInvoices = client.invoices.length;
    const totalRevenue = client.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = client.invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalOutstanding = totalRevenue - totalPaid;
    const hasOverdue = client.invoices.some(
      (inv) => inv.paymentStatus === "OVERDUE"
    );

    return {
      ...client,
      totalOrders,
      totalInvoices,
      totalRevenue,
      totalPaid,
      totalOutstanding,
      hasOverdue,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Clients
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Manage your customer relationships and track sales
          </p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          + Add Client
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            AU${clientStats.reduce((sum, c) => sum + c.totalRevenue, 0).toFixed(2)}
          </div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            AU${clientStats.reduce((sum, c) => sum + c.totalOutstanding, 0).toFixed(2)}
          </div>
          <div className="stat-label">Outstanding</div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Client
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Contact
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Orders
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Revenue
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Outstanding
                </th>
                <th className="py-2 pl-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {clientStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    No clients yet. Add your first client to get started.
                  </td>
                </tr>
              ) : (
                clientStats.map((client) => (
                  <tr
                    key={client.id}
                    className="table-row border-b"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {client.name}
                      </Link>
                      {client.city && (
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {client.city}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {client.email && (
                        <div className="text-xs">{client.email}</div>
                      )}
                      {client.phone && (
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {client.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">{client.totalOrders}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      AU${client.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold" style={{ color: client.totalOutstanding > 0 ? "var(--color-gold)" : "inherit" }}>
                      {client.totalOutstanding > 0 ? `AU$${client.totalOutstanding.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 pl-3 text-center">
                      {client.hasOverdue ? (
                        <span className="badge badge-amber">Overdue</span>
                      ) : client.totalOutstanding > 0 ? (
                        <span className="badge badge-blue">Pending</span>
                      ) : (
                        <span className="badge badge-green">Paid</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
