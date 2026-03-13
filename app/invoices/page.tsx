import { prisma } from "../lib/prisma";
import Link from "next/link";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const whereClause = searchParams.clientId
    ? { clientId: parseInt(searchParams.clientId) }
    : {};

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      client: true,
      order: true,
      payments: true,
    },
    orderBy: { issueDate: "desc" },
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.paymentStatus === "PAID").length,
    pending: invoices.filter((i) => i.paymentStatus === "PENDING").length,
    overdue: invoices.filter((i) => i.paymentStatus === "OVERDUE").length,
    totalRevenue: invoices.reduce((sum, i) => sum + i.total, 0),
    totalOutstanding: invoices.reduce((sum, i) => sum + i.amountDue, 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="badge badge-green">Paid</span>;
      case "OVERDUE":
        return <span className="badge badge-amber">Overdue</span>;
      case "PARTIALLY_PAID":
        return <span className="badge badge-blue">Partial</span>;
      case "CANCELLED":
        return <span className="badge badge-gray">Cancelled</span>;
      default:
        return <span className="badge badge-blue">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Invoices
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Manage invoices and track payments
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/invoices/import" className="btn-secondary">
            📄 Import Invoice (OCR)
          </Link>
          <Link href="/invoices/new" className="btn-primary">
            + New Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.paid}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--color-gold)" }}>
            AU${stats.totalOutstanding.toFixed(0)}
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
                  Invoice #
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Client
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Issue Date
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Due Date
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Amount
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Paid
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Due
                </th>
                <th className="py-2 pl-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    No invoices yet. Create your first invoice to get started.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="table-row border-b"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        href={`/clients/${invoice.client.id}`}
                        className="hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {invoice.client.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      AU${invoice.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      AU${invoice.amountPaid.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold" style={{ color: invoice.amountDue > 0 ? "var(--color-gold)" : "inherit" }}>
                      {invoice.amountDue > 0 ? `AU$${invoice.amountDue.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 pl-3 text-center">
                      {getStatusBadge(invoice.paymentStatus)}
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
