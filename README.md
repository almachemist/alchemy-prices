# Alchemy Business Management Studio

A comprehensive business management tool for product-based businesses, combining recipe costing, inventory management, client relationships, order processing, invoicing, and payment tracking.

## Features

### 📊 Product & Recipe Management
- **Recipe Costing**: Calculate ingredient costs per batch and per unit
- **Inventory Management**: Track raw materials, packaging, and supplies
- **Batch Calculator**: Plan production runs and calculate material requirements
- **Overhead Allocation**: Distribute fixed costs across products

### 👥 Client Management
- **Client Profiles**: Store contact information and addresses
- **Client History**: Track all orders and invoices per client
- **Revenue Analytics**: View total revenue and outstanding payments per client

### 🛒 Order Management
- **Create Orders**: Build orders from your recipe catalog
- **Order Tracking**: Monitor order status (pending, completed, cancelled)
- **Automatic Pricing**: Suggested pricing based on cost calculations
- **Order History**: Complete audit trail of all customer orders

### 💰 Invoicing & Payments
- **Invoice Generation**: Create invoices from orders or standalone
- **Payment Tracking**: Record payments with multiple payment methods
- **Payment Status**: Track pending, paid, partially paid, and overdue invoices
- **Outstanding Balance**: Real-time tracking of amounts due
- **Payment History**: Complete record of all payments received

### 📈 Dashboard & Analytics
- **Business Overview**: Key metrics at a glance
- **Revenue Tracking**: Total revenue and outstanding payments
- **Recent Activity**: Latest invoices and orders
- **Inventory Status**: Current stock levels by category

## Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Seed the database (optional):
```bash
npm run prisma:seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

### Core Entities
- **Client**: Customer information and contact details
- **Order**: Customer orders with line items
- **OrderItem**: Individual products in an order
- **Invoice**: Billing documents linked to orders
- **Payment**: Payment records with method and reference
- **Recipe**: Product formulations with ingredients
- **InventoryItem**: Raw materials and supplies
- **PricingProfile**: Costing parameters (labor, overhead, margins)

## Usage Guide

### Creating Your First Client
1. Navigate to **Clients** in the menu
2. Click **+ Add Client**
3. Fill in client details (name is required)
4. Save the client profile

### Creating an Order
1. Go to **Orders** → **+ New Order**
2. Select a client
3. Add products (select from recipes or add custom items)
4. Review totals (subtotal, tax, total)
5. Create the order

### Generating an Invoice
1. From an order, click **Create Invoice**
2. Or go to **Invoices** → **+ New Invoice**
3. Select the order (if applicable)
4. Set payment terms (Net 7, 14, 30, or 60 days)
5. Add any notes or terms
6. Create the invoice

### Recording a Payment
1. Open an invoice with an outstanding balance
2. In the **Record Payment** section, enter:
   - Payment amount
   - Payment method (Bank Transfer, Cash, Stripe, etc.)
   - Reference number (optional)
   - Notes (optional)
3. Click **Record Payment**
4. The invoice status updates automatically

### Tracking Overdue Payments
- Dashboard shows overdue invoice count
- Invoices page displays all overdue invoices with amber badges
- Client profiles highlight clients with overdue payments

## Future Enhancements

### Stripe Integration (Planned)
The system is designed to integrate with Stripe for online payments:
- Payment links in invoices
- Automatic payment recording via webhooks
- Subscription management
- Payment intent tracking

### Planned Features
- PDF invoice generation and email delivery
- Recurring invoices for subscriptions
- Multi-currency support
- Advanced reporting and analytics
- Inventory alerts and reordering
- Production scheduling
- Batch tracking and traceability

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Ready for Vercel, Netlify, or any Node.js host

## Project Structure

```
app/
├── clients/          # Client management pages
├── orders/           # Order management pages
├── invoices/         # Invoice and payment pages
├── recipes/          # Recipe management
├── inventory/        # Inventory management
├── batch-calculator/ # Production planning
├── components/       # Reusable UI components
├── lib/              # Utilities and helpers
└── api/              # API routes

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Database migrations
└── seed.ts           # Sample data seeder
```

## Contributing

This is a custom business management tool. Feel free to fork and adapt for your needs.

## License

Private project for Alchemy business management.
