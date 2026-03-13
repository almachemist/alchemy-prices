import { prisma } from "../../lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await prisma.client.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      orders: {
        include: {
          items: true,
        },
        orderBy: { orderDate: "desc" },
      },
      invoices: {
        include: {
          payments: true,
        },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const totalRevenue = client.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = client.invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstanding = totalRevenue - totalPaid;

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
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              ← Back to Clients
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--color-text)" }}>
            {client.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/new?clientId=${client.id}`} className="btn-primary">
            + New Order
          </Link>
          <Link href={`/clients/${client.id}/edit`} className="btn-secondary">
            Edit Client
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="stat-value">{client.orders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AU${totalRevenue.toFixed(2)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AU${totalPaid.toFixed(2)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalOutstanding > 0 ? "var(--color-gold)" : "inherit" }}>
            AU${totalOutstanding.toFixed(2)}
          </div>
          <div className="stat-label">Outstanding</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
            Contact Information
          </h2>
          <div className="space-y-3 text-sm">
            {client.email && (
              <div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Email
                </div>
                <a href={`mailto:${client.email}`} style={{ color: "var(--color-accent)" }}>
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Phone
                </div>
                <a href={`tel:${client.phone}`} style={{ color: "var(--color-accent)" }}>
                  {client.phone}
                </a>
              </div>
            )}
            {(client.address || client.city || client.state || client.postcode) && (
              <div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Address
                </div>
                <div>
                  {client.address && <div>{client.address}</div>}
                  {(client.city || client.state || client.postcode) && (
                    <div>
                      {[client.city, client.state, client.postcode].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {client.country && <div>{client.country}</div>}
                </div>
              </div>
            )}
            {client.notes && (
              <div>
                <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Notes
                </div>
                <div style={{ color: "var(--color-text-muted)" }}>{client.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Recent Invoices
            </h2>
            <Link href={`/invoices?clientId=${client.id}`} className="text-xs" style={{ color: "var(--color-accent)" }}>
              View all →
            </Link>
          </div>

          {client.invoices.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              No invoices yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                    <th className="py-2 pr-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      Invoice
                    </th>
                    <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      Date
                    </th>
                    <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      Amount
                    </th>
                    <th className="py-2 pl-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {client.invoices.slice(0, 5).map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="table-row border-b"
                      style={{ borderColor: "var(--color-border-light)" }}
                    >
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        AU${invoice.total.toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-3 text-center">
                        {getStatusBadge(invoice.paymentStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Order History
          </h2>
        </div>

        {client.orders.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No orders yet. Create the first order for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                  <th className="py-2 pr-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Order #
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Date
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Items
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Total
                  </th>
                  <th className="py-2 pl-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {client.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="table-row border-b"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">{order.items.length}</td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      AU${order.total.toFixed(2)}
                    </td>
                    <td className="py-2.5 pl-3 text-center">
                      <span className="badge badge-blue capitalize">{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
