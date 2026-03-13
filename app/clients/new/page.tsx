import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";

export default function NewClientPage() {
  async function createClient(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const postcode = formData.get("postcode") as string;
    const country = formData.get("country") as string;
    const notes = formData.get("notes") as string;

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postcode: postcode || null,
        country: country || "Australia",
        notes: notes || null,
      },
    });

    redirect(`/clients/${client.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          Add New Client
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Create a new client profile
        </p>
      </div>

      <form action={createClient} className="card max-w-2xl">
        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Client Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="input"
              placeholder="Enter client name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="input"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="input"
                placeholder="+61 400 000 000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-1.5">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              className="input"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="city" className="block text-sm font-medium mb-1.5">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                className="input"
                placeholder="City"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium mb-1.5">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                className="input"
                placeholder="State"
              />
            </div>

            <div>
              <label htmlFor="postcode" className="block text-sm font-medium mb-1.5">
                Postcode
              </label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                className="input"
                placeholder="0000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1.5">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              className="input"
              defaultValue="Australia"
              placeholder="Country"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="input"
              placeholder="Additional notes about this client..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">
              Create Client
            </button>
            <a href="/clients" className="btn-secondary">
              Cancel
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
