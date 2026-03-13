import { prisma } from "../../lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      client: true,
      order: {
        include: {
          items: true,
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  async function recordPayment(formData: FormData) {
    "use server";

    const invoiceId = parseInt(formData.get("invoiceId") as string);
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const reference = formData.get("reference") as string;
    const notes = formData.get("notes") as string;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountDue = invoice.total - newAmountPaid;

    let newStatus = invoice.paymentStatus;
    if (newAmountDue <= 0) {
      newStatus = "PAID";
    } else if (newAmountPaid > 0) {
      newStatus = "PARTIALLY_PAID";
    }

    await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        paymentMethod: paymentMethod as never,
        reference: reference || null,
        notes: notes || null,
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentStatus: newStatus,
      },
    });

    redirect(`/invoices/${invoiceId}`);
  }

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

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.amountDue > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              ← Back to Invoices
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--color-text)" }}>
            {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(invoice.paymentStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card">
          <div className="stat-value">AU${invoice.total.toFixed(2)}</div>
          <div className="stat-label">Total Amount</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AU${invoice.amountPaid.toFixed(2)}</div>
          <div className="stat-label">Amount Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: invoice.amountDue > 0 ? "var(--color-gold)" : "inherit" }}>
            AU${invoice.amountDue.toFixed(2)}
          </div>
          <div className="stat-label">Amount Due</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: isOverdue ? "var(--color-danger)" : "inherit" }}>
            {new Date(invoice.dueDate).toLocaleDateString()}
          </div>
          <div className="stat-label">Due Date</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              Invoice Details
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Bill To
                </div>
                <div className="font-medium">{invoice.client.name}</div>
                {invoice.client.email && <div className="text-xs mt-0.5">{invoice.client.email}</div>}
                {invoice.client.phone && <div className="text-xs">{invoice.client.phone}</div>}
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Invoice Date
                </div>
                <div>{new Date(invoice.issueDate).toLocaleDateString()}</div>
                {invoice.order && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Order
                    </div>
                    <Link
                      href={`/orders/${invoice.order.id}`}
                      className="text-xs hover:underline"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {invoice.order.orderNumber}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {invoice.order && invoice.order.items.length > 0 && (
              <div className="mt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                      <th className="py-2 text-left text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        Item
                      </th>
                      <th className="py-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        Qty
                      </th>
                      <th className="py-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        Price
                      </th>
                      <th className="py-2 text-right text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.order.items.map((item) => (
                      <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border-light)" }}>
                        <td className="py-2">
                          <div className="font-medium">{item.productName}</div>
                          {item.description && (
                            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">AU${item.unitPrice.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">AU${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>Subtotal:</span>
                      <span className="font-medium">AU${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>Tax:</span>
                      <span className="font-medium">AU${invoice.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg" style={{ color: "var(--color-accent)" }}>
                        AU${invoice.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Notes
                </div>
                <div className="text-sm">{invoice.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {invoice.amountDue > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
                Record Payment
              </h3>

              <form action={recordPayment} className="space-y-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />

                <div>
                  <label htmlFor="amount" className="block text-xs font-medium mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    required
                    min="0.01"
                    max={invoice.amountDue}
                    step="0.01"
                    defaultValue={invoice.amountDue}
                    className="input text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="paymentMethod" className="block text-xs font-medium mb-1">
                    Payment Method *
                  </label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    required
                    className="select text-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="STRIPE">Stripe</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reference" className="block text-xs font-medium mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    id="reference"
                    name="reference"
                    className="input text-sm"
                    placeholder="Transaction ID or reference"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    className="input text-sm"
                    placeholder="Payment notes..."
                  />
                </div>

                <button type="submit" className="btn-primary w-full text-sm">
                  Record Payment
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>
              Payment History
            </h3>

            {invoice.payments.length === 0 ? (
              <div className="py-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 rounded-lg"
                    style={{ background: "var(--color-bg-subtle)" }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
                        AU${payment.amount.toFixed(2)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {payment.paymentMethod.replace("_", " ")}
                      {payment.reference && ` • ${payment.reference}`}
                    </div>
                    {payment.notes && (
                      <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                        {payment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
