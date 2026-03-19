"use client";

import { useRouter } from "next/navigation";

interface Order {
  id: number;
  orderNumber: string;
  total: number;
  client: {
    name: string;
  };
}

interface OrderSelectorProps {
  orders: Order[];
  defaultValue?: string;
}

export function OrderSelector({ orders, defaultValue }: OrderSelectorProps) {
  const router = useRouter();

  return (
    <div>
      <label htmlFor="orderId" className="block text-sm font-medium mb-1.5">
        Order
      </label>
      <select
        id="orderId"
        name="orderId"
        className="select"
        defaultValue={defaultValue || ""}
        onChange={(e) => {
          const orderId = e.currentTarget.value;
          if (orderId) {
            router.push(`/invoices/new?orderId=${orderId}`);
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
  );
}
