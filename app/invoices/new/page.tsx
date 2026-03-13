import { prisma } from "../../lib/prisma";
import { redirect } from "next/navigation";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

  const orders = await prisma.order.findMany({
    where: {
      invoice: null,
    },
    include: {
      client: true,
      items: true,
    },
    orderBy: { orderDate: "desc" },
  });

  const selectedOrder = searchParams.orderId
    ? orders.find((o) => o.id === parseInt(searchParams.orderId!))
    : null;

  async function createInvoice(formData: FormData) {
    "use server";

    const orderId = formData.get("orderId") as string;
    const clientId = parseInt(formData.get("clientId") as string);
    const dueInDays = parseInt(formData.get("dueInDays") as string);
    const notes = formData.get("notes") as string;
    const terms = formData.get("terms") as string;

    const order = orderId
      ? await prisma.order.findUnique({
          where: { id: parseInt(orderId) },
          include: { items: true },
        })
      : null;

    const subtotal = order?.subtotal ?? 0;
    const tax = order?.tax ?? 0;
    const total = order?.total ?? 0;

    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { id: "desc" },
    });
    const invoiceNumber = `INV-${String((lastInvoice?.id ?? 0) + 1).padStart(5, "0")}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        orderId: orderId ? parseInt(orderId) : null,
        dueDate,
        subtotal,
        tax,
        total,
        amountDue: total,
        notes: notes || null,
        terms: terms || null,
      },
    });

    redirect(`/invoices/${invoice.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Create New Invoice
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Generate an invoice from an order
        </p>
      </div>

      <form action={createInvoice} className="card max-w-2xl">
        <div className="space-y-5">
          <div>
            <label htmlFor="orderId" className="block text-sm font-medium mb-1.5">
              Order
            </label>
            <select
              id="orderId"
              name="orderId"
              className="select"
              defaultValue={searchParams.orderId || ""}
              onChange={(e) => {
                const orderId = e.currentTarget.value;
                if (orderId) {
                  window.location.href = `/invoices/new?orderId=${orderId}`;
                }
              }}
            >
              <option value="">Select an order (optional)</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.client.name} (AU${order.total.toFixed(2)})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Only showing orders without invoices
            </p>
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium mb-1.5">
              Client *
            </label>
            <select
              id="clientId"
              name="clientId"
              required
              className="select"
              defaultValue={selectedOrder?.clientId || ""}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <div className="p-4 rounded-lg" style={{ background: "var(--color-bg-subtle)" }}>
              <h3 className="text-sm font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Items:</span>
                  <span>{selectedOrder.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Subtotal:</span>
                  <span>AU${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Tax:</span>
                  <span>AU${selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: "var(--color-border-light)" }}>
                  <span>Total:</span>
                  <span style={{ color: "var(--color-accent)" }}>AU${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="dueInDays" className="block text-sm font-medium mb-1.5">
              Payment Terms *
            </label>
            <select
              id="dueInDays"
              name="dueInDays"
              required
              className="select"
              defaultValue="14"
            >
              <option value="0">Due on receipt</option>
              <option value="7">Net 7 days</option>
              <option value="14">Net 14 days</option>
              <option value="30">Net 30 days</option>
              <option value="60">Net 60 days</option>
            </select>
          </div>

          <div>
            <label htmlFor="terms" className="block text-sm font-medium mb-1.5">
              Payment Terms & Conditions
            </label>
            <textarea
              id="terms"
              name="terms"
              rows={3}
              className="input"
              placeholder="Payment terms and conditions..."
              defaultValue="Payment is due within the specified period. Late payments may incur additional fees."
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
              Invoice Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="input"
              placeholder="Additional notes or instructions..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">
              Create Invoice
            </button>
            <a href="/invoices" className="btn-secondary">
              Cancel
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
