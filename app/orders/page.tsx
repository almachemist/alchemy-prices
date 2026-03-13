import { prisma } from "../lib/prisma";
import Link from "next/link";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      client: true,
      items: true,
      invoice: true,
    },
    orderBy: { orderDate: "desc" },
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Orders
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Manage customer orders and track fulfillment
          </p>
        </div>
        <Link href="/orders/new" className="btn-primary">
          + New Order
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AU${stats.totalRevenue.toFixed(2)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <th className="py-2 pr-4 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Order #
                </th>
                <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Client
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
                <th className="py-2 px-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Status
                </th>
                <th className="py-2 pl-3 text-center text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    No orders yet. Create your first order to get started.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="table-row border-b"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        href={`/clients/${order.client.id}`}
                        className="hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {order.client.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">{order.items.length}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      AU${order.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`badge ${order.status === "completed" ? "badge-green" : order.status === "cancelled" ? "badge-gray" : "badge-blue"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-center">
                      {order.invoice ? (
                        <Link
                          href={`/invoices/${order.invoice.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {order.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        <Link
                          href={`/invoices/new?orderId=${order.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Create
                        </Link>
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
