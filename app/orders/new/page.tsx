import { prisma } from "../../lib/prisma";
import { redirect } from "next/navigation";
import { recipeBatchCost, unitCostFromBatch, overheadPerUnit, totalMonthlyOverhead, type OverheadRow } from "../../lib/pricing";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

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
  const ohPerUnit = overheadPerUnit(overheadRows, estimatedUnitsPerMonth);

  const recipesWithPricing = recipes.map((recipe) => {
    const rBatchCost = recipeBatchCost(recipe as never);
    const unitSize = recipe.batchUnit === "ML"
      ? Math.min(100, recipe.batchSize)
      : recipe.batchUnit === "EACH" ? 1 : recipe.batchSize;
    const { unitCost: c } = unitCostFromBatch({
      batchCost: rBatchCost,
      batchSize: recipe.batchSize,
      unitSize,
    });
    const costPerUnit = c + ohPerUnit;
    const suggestedPrice = costPerUnit * 2.5;

    return {
      ...recipe,
      costPerUnit,
      suggestedPrice,
    };
  });

  async function createOrder(formData: FormData) {
    "use server";

    const clientId = parseInt(formData.get("clientId") as string);
    const notes = formData.get("notes") as string;
    
    const itemsJson = formData.get("items") as string;
    const items = JSON.parse(itemsJson);

    if (items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    const subtotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const lastOrder = await prisma.order.findFirst({
      orderBy: { id: "desc" },
    });
    const orderNumber = `ORD-${String((lastOrder?.id ?? 0) + 1).padStart(5, "0")}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId,
        notes: notes || null,
        subtotal,
        tax,
        total,
        items: {
          create: items.map((item: { recipeId: number | null; productName: string; description: string; quantity: number; unitPrice: number; total: number }) => ({
            recipeId: item.recipeId,
            productName: item.productName,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
    });

    redirect(`/orders/${order.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Create New Order
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Add products and create an order for a client
        </p>
      </div>

      <form action={createOrder} className="space-y-6">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
            Order Details
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium mb-1.5">
                Client *
              </label>
              <select
                id="clientId"
                name="clientId"
                required
                className="select"
                defaultValue={searchParams.clientId || ""}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
                Order Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="input"
                placeholder="Special instructions or notes..."
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
            Order Items
          </h2>

          <div id="order-items-container" className="space-y-3">
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-light)" }}>
            <button
              type="button"
              onClick={() => {
                const container = document.getElementById("order-items-container");
                const itemIndex = container?.children.length || 0;
                const itemHtml = `
                  <div class="order-item p-4 rounded-lg" style="background: var(--color-bg-subtle);">
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
                      <div class="md:col-span-4">
                        <label class="block text-xs font-medium mb-1">Product</label>
                        <select class="select text-sm recipe-select" data-index="${itemIndex}" onchange="updateItemFromRecipe(this)">
                          <option value="">Custom product</option>
                          ${recipesWithPricing.map(r => `<option value="${r.id}" data-name="${r.name}" data-price="${r.suggestedPrice.toFixed(2)}">${r.name} (AU$${r.suggestedPrice.toFixed(2)})</option>`).join("")}
                        </select>
                      </div>
                      <div class="md:col-span-3">
                        <label class="block text-xs font-medium mb-1">Product Name</label>
                        <input type="text" class="input text-sm product-name" required placeholder="Product name" />
                      </div>
                      <div class="md:col-span-2">
                        <label class="block text-xs font-medium mb-1">Quantity</label>
                        <input type="number" class="input text-sm quantity" required min="1" value="1" onchange="updateItemTotal(this)" />
                      </div>
                      <div class="md:col-span-2">
                        <label class="block text-xs font-medium mb-1">Unit Price</label>
                        <input type="number" class="input text-sm unit-price" required min="0" step="0.01" placeholder="0.00" onchange="updateItemTotal(this)" />
                      </div>
                      <div class="md:col-span-1 flex items-end">
                        <button type="button" class="btn-ghost text-xs w-full" onclick="this.closest('.order-item').remove(); updateOrderTotal();">Remove</button>
                      </div>
                    </div>
                    <div class="mt-2">
                      <label class="block text-xs font-medium mb-1">Description</label>
                      <input type="text" class="input text-sm description" placeholder="Optional description" />
                    </div>
                    <div class="mt-2 text-right">
                      <span class="text-xs" style="color: var(--color-text-muted);">Total: </span>
                      <span class="item-total font-semibold" style="color: var(--color-accent);">AU$0.00</span>
                    </div>
                  </div>
                `;
                container?.insertAdjacentHTML("beforeend", itemHtml);
              }}
              className="btn-secondary text-sm"
            >
              + Add Item
            </button>
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--color-border-light)" }}>
            <div className="flex justify-end space-y-2">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Subtotal:</span>
                  <span id="subtotal" className="font-medium">AU$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-muted)" }}>Tax (10%):</span>
                  <span id="tax" className="font-medium">AU$0.00</span>
                </div>
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                  <span className="font-semibold">Total:</span>
                  <span id="total" className="font-bold text-lg" style={{ color: "var(--color-accent)" }}>AU$0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <input type="hidden" name="items" id="items-data" value="[]" />

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" onClick={() => (window as any).prepareOrderData()}>
            Create Order
          </button>
          <a href="/orders" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        function updateItemFromRecipe(select) {
          const item = select.closest('.order-item');
          const selectedOption = select.options[select.selectedIndex];
          
          if (selectedOption.value) {
            const productName = selectedOption.dataset.name;
            const price = selectedOption.dataset.price;
            
            item.querySelector('.product-name').value = productName;
            item.querySelector('.unit-price').value = price;
            updateItemTotal(item.querySelector('.quantity'));
          }
        }

        function updateItemTotal(input) {
          const item = input.closest('.order-item');
          const quantity = parseFloat(item.querySelector('.quantity').value) || 0;
          const unitPrice = parseFloat(item.querySelector('.unit-price').value) || 0;
          const total = quantity * unitPrice;
          
          item.querySelector('.item-total').textContent = 'AU$' + total.toFixed(2);
          updateOrderTotal();
        }

        function updateOrderTotal() {
          const items = document.querySelectorAll('.order-item');
          let subtotal = 0;
          
          items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.quantity').value) || 0;
            const unitPrice = parseFloat(item.querySelector('.unit-price').value) || 0;
            subtotal += quantity * unitPrice;
          });
          
          const tax = subtotal * 0.1;
          const total = subtotal + tax;
          
          document.getElementById('subtotal').textContent = 'AU$' + subtotal.toFixed(2);
          document.getElementById('tax').textContent = 'AU$' + tax.toFixed(2);
          document.getElementById('total').textContent = 'AU$' + total.toFixed(2);
        }

        function prepareOrderData() {
          const items = [];
          document.querySelectorAll('.order-item').forEach(item => {
            const recipeSelect = item.querySelector('.recipe-select');
            const recipeId = recipeSelect.value ? parseInt(recipeSelect.value) : null;
            const productName = item.querySelector('.product-name').value;
            const description = item.querySelector('.description').value;
            const quantity = parseInt(item.querySelector('.quantity').value);
            const unitPrice = parseFloat(item.querySelector('.unit-price').value);
            const total = quantity * unitPrice;
            
            if (productName && quantity && unitPrice) {
              items.push({
                recipeId,
                productName,
                description,
                quantity,
                unitPrice,
                total
              });
            }
          });
          
          document.getElementById('items-data').value = JSON.stringify(items);
        }
      ` }} />
    </div>
  );
}
