import { prisma } from "./prisma";

export async function updateOverdueInvoices() {
  const now = new Date();
  
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      amountDue: {
        gt: 0,
      },
      paymentStatus: {
        in: ["PENDING", "PARTIALLY_PAID"],
      },
    },
  });

  for (const invoice of overdueInvoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentStatus: "OVERDUE" },
    });
  }

  return overdueInvoices.length;
}

export function formatCurrency(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(amount);
}

export function calculatePaymentStatus(
  total: number,
  amountPaid: number,
  dueDate: Date
): "PAID" | "OVERDUE" | "PARTIALLY_PAID" | "PENDING" {
  const amountDue = total - amountPaid;
  
  if (amountDue <= 0) {
    return "PAID";
  }
  
  if (amountPaid > 0) {
    return new Date() > dueDate ? "OVERDUE" : "PARTIALLY_PAID";
  }
  
  return new Date() > dueDate ? "OVERDUE" : "PENDING";
}

export function generateOrderNumber(lastOrderId: number): string {
  return `ORD-${String(lastOrderId + 1).padStart(5, "0")}`;
}

export function generateInvoiceNumber(lastInvoiceId: number): string {
  return `INV-${String(lastInvoiceId + 1).padStart(5, "0")}`;
}
