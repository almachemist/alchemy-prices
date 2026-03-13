/**
 * update-data.ts
 * Sets real purchase prices on all inventory items, adds process notes to recipes,
 * seeds overhead costs, and upserts all new inventory items.
 * Safe to re-run: all operations are upsert-style.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  PrismaClient,
  InventoryCategory,
  UnitType,
  Unit,
  SourceType,
} from "../app/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// ─── REAL PURCHASE PRICES ────────────────────────────────────────────────────
// Source: NDA Invoice #3983809 (2026-02-19) — all values are LANDED INC GST.
// Byproducts (mint_alcohol, ws_oils, sd_oils): internal baseline $5.00/L.
const PRICES: Record<string, { purchaseSize: number; purchaseCostAud: number; notes?: string }> = {
  // ── Carrier Oils — NDA Invoice #3983809 (landed inc GST) ──────────────────
  "Sweet Almond Oil (Refined)":      { purchaseSize: 1000, purchaseCostAud: 20.69, notes: "NDA #3983809 — 1L landed inc GST; $0.02069/mL" },
  "Jojoba Oil (American Virgin)":    { purchaseSize: 1000, purchaseCostAud: 68.95, notes: "NDA #3983809 — 1L landed inc GST; $0.06895/mL — premium" },
  "Macadamia Oil (Refined)":         { purchaseSize: 5000, purchaseCostAud: 131.64, notes: "NDA #3983809 — 5L landed inc GST; $0.02633/mL — hero carrier" },
  "Apricot Kernel Oil (Refined)":    { purchaseSize: 1000, purchaseCostAud: 50.15, notes: "NDA #3983809 — 1L landed inc GST; $0.05015/mL" },
  "Sunflower Oil (Virgin, Organic)": { purchaseSize: 1000, purchaseCostAud: 22.56, notes: "NDA #3983809 — 1L landed inc GST; $0.02256/mL — infusion base" },
  "Coconut Oil (Refined, Organic)":  { purchaseSize: 1000, purchaseCostAud: 31.34, notes: "NDA #3983809 — 1L landed inc GST; $0.03134/mL" },
  "Castor Oil (Refined)":            { purchaseSize: 100,  purchaseCostAud: 7.52, notes: "NDA #3983809 — 100mL landed inc GST; $0.0752/mL" },
  "Tamanu Oil (Organic)":            { purchaseSize: 100,  purchaseCostAud: 20.07, notes: "NDA #3983809 — 100mL landed inc GST; $0.2007/mL — premium" },
  "Vitamin E (Tocopherol)":          { purchaseSize: 100,  purchaseCostAud: 27.58, notes: "NDA #3983809 — 100mL landed inc GST; $0.2758/mL" },
  // ── Butters & Botanicals — NDA Invoice #3983809 ───────────────────────────
  "Shea Butter (Refined)":           { purchaseSize: 500,  purchaseCostAud: 17.56, notes: "NDA #3983809 — 500g landed inc GST; $0.03512/g" },
  "Calendula Petals (dried)":        { purchaseSize: 100,  purchaseCostAud: 25.07, notes: "NDA #3983809 — 100g landed inc GST; $0.2507/g — organic" },
  "Urucum seeds (semi-dried)":       { purchaseSize: 100,  purchaseCostAud: 8.00, notes: "$0.08/g — ⚠ ESTIMATED; update with receipt" },
  // ── Byproducts — internal baseline costing @ $5.00/L ──────────────────────
  // No tracked COGS — these are distillery/infusion by-products.
  "Witch hazel (distillate/extract)":   { purchaseSize: 1000, purchaseCostAud: 5.00, notes: "Byproduct baseline $5/L = $0.005/mL — no tracked COGS" },
  "Mint Alcohol Infusion":              { purchaseSize: 1000, purchaseCostAud: 5.00, notes: "Byproduct baseline $5/L = $0.005/mL — no tracked COGS" },
  "Distillery Botanical Blend A":       { purchaseSize: 1000, purchaseCostAud: 5.00, notes: "Byproduct baseline $5/L = $0.005/mL — no tracked COGS" },
  "Distillery Botanical Blend B":       { purchaseSize: 1000, purchaseCostAud: 5.00, notes: "Byproduct baseline $5/L = $0.005/mL — no tracked COGS" },
  // ── Packaging ─────────────────────────────────────────────────────────────
  "Amber bottle 100 mL":    { purchaseSize: 1,   purchaseCostAud: 0.522,  notes: "Hero bottle — $0.522 each" },
  "Frosted Glass Bottle 30 mL": { purchaseSize: 2, purchaseCostAud: 8.27, notes: "$4.135 each" },
  "Vacuum Press Bottle":    { purchaseSize: 4,   purchaseCostAud: 7.45,   notes: "$1.8625 each" },
  "Pump top":                { purchaseSize: 1,   purchaseCostAud: 0.30,   notes: "⚠ ESTIMATED" },
  "Spray top":               { purchaseSize: 1,   purchaseCostAud: 0.30,   notes: "⚠ ESTIMATED" },
  "Label":                   { purchaseSize: 1,   purchaseCostAud: 0.0225, notes: "Kraft gift tag $0.0225 each" },
  "Shrink band / seal":      { purchaseSize: 1,   purchaseCostAud: 0.05,   notes: "⚠ ESTIMATED" },
  "White Tissue Paper":      { purchaseSize: 100, purchaseCostAud: 3.90,   notes: "$0.039/sheet" },
  "Organza Drawstring Bags": { purchaseSize: 100, purchaseCostAud: 3.56,   notes: "$0.0356 each" },
  // ── Essential Oils ────────────────────────────────────────────────────────
  "Jasmine":                 { purchaseSize: 10, purchaseCostAud: 35.00, notes: "$3.50/mL — confirmed; premium absolute" },
  "Tea tree":                { purchaseSize: 10, purchaseCostAud: 12.00, notes: "$1.20/mL — ⚠ EST; update with receipt" },
  "Eucalyptus":              { purchaseSize: 10, purchaseCostAud: 10.00, notes: "$1.00/mL — ⚠ EST; update with receipt" },
  "Ginger":                  { purchaseSize: 10, purchaseCostAud: 18.00, notes: "$1.80/mL — ⚠ EST; update with receipt" },
  "Clove":                   { purchaseSize: 10, purchaseCostAud: 12.00, notes: "$1.20/mL — ⚠ EST; update with receipt" },
  "Lavender":                { purchaseSize: 10, purchaseCostAud: 14.00, notes: "$1.40/mL — ⚠ EST; update with receipt" },
  "Vanilla (EO/absolute)":  { purchaseSize: 10, purchaseCostAud: 25.00, notes: "$2.50/mL — ⚠ EST; update with receipt" },
  "Citronella":              { purchaseSize: 10, purchaseCostAud: 10.00, notes: "$1.00/mL — ⚠ EST; update with receipt" },
  "Lemongrass":              { purchaseSize: 10, purchaseCostAud: 10.00, notes: "$1.00/mL — ⚠ EST; update with receipt" },
  "Patchouli":               { purchaseSize: 10, purchaseCostAud: 15.00, notes: "$1.50/mL — ⚠ EST; update with receipt" },
};

// ─── RECIPE PROCESS NOTES ────────────────────────────────────────────────────
const RECIPE_NOTES: Record<string, string> = {
  "Tropical Baby Oil v1": `🌴 TROPICAL BABY OIL — Pilot Notes

Formula: 50% Macadamia · 25% Jojoba · 15% Apricot · 9% Almond · 1% Vit E

Process:
1. Weigh all oils in glass beaker
2. Blend gently — no heat required
3. Add Vit E last, stir to incorporate
4. Transfer to 100mL amber bottle

Optional: Lavender EO 0.3% (6 drops per 100mL) — keeps it baby-friendly

Sensory expected:
✔ Silky slip on wet skin
✔ Satin glow, not greasy
✔ Fast elegant absorption
✔ Comfortable in FNQ heat

Label copy: "Apply to still-damp skin after shower and massage gently."

QC: Note colour (golden-clear), aroma (neutral/light), skin feel after 5 min.
Positioning: daily ritual · gift · product of entry — easiest seller.`,

  "After-Sun Repair Oil v1": `🌿 AFTER-SUN REPAIR OIL — Pilot Notes

Formula: 45% Macadamia · 25% Jojoba · 15% Apricot · 10% Calendula Infused · 4% Tamanu · 1% Vit E

Prepared ingredient: Calendula Infused Sunflower Oil
- 10g dried petals + 100mL sunflower
- Gentle bath-marie 45–50 °C for 2h
- Optional 24h rest for stronger extraction
- Filter thoroughly
- Add 0.5% Vit E after filtering

Process:
1. Start with Macadamia + Jojoba + Apricot
2. Add Calendula infused oil
3. Add Tamanu (premium active — weigh precisely)
4. Add Vit E last
5. Blend gently, bottle

Optional: Lavender EO 4 drops per 100mL (0.16%)

QC: Pale gold colour · calendula-herbal aroma · soothing on irritated skin.
Tamanu gives slightly nutty note — normal.`,

  "Urucum Glow Oil v1": `🌞 URUCUM GLOW OIL — Pilot Notes

Formula: 45% Macadamia · 20% Jojoba · 15% Apricot · 10% Sweet Almond · 9% Urucum Infused · 1% Vit E

Prepared ingredient: Urucum Infused Sunflower Oil
- Lightly crush 20g semi-dried seeds
- Add 100mL sunflower oil
- Bath-marie 55–60 °C for 2h, stir occasionally
- Cool completely
- Filter VERY well — multiple passes
- Add 0.5% Vit E after filtering
- Expected: red-golden translucent oil

Result expected: warm amber-golden glow oil

Optional scent: Vanilla 4 drops + Lavender 4 drops per 100mL
- Keep very low — photoreactive risk, keep skin-friendly
- Avoid citrus EO in this product

QC: Rich amber-red colour (depth varies with batch) · warm neutral aroma · adjust per run.
Colour note: call Gabi when first batch done to calibrate.`,

  "Jambu Sensory Oil (Base) v1": `💧 JAMBU SENSORY OIL — Base Pilot Notes

Formula: 50% Jojoba · 35% Macadamia · 10% Apricot · 4% Sweet Almond · 1% Vit E

This is the BASE. Jambu active to be added in next phase.

Process:
1. Weigh all oils at room temp
2. Blend gently
3. Add Vit E last
4. Bottle in 50mL amber

Sensory expected:
✔ Silky glide
✔ Stable — no separation
✔ Non-sticky
✔ Elegant feel in tropical heat

QC: Pale golden-clear · no aroma · silky dry-down.
Note: update this record when jambu active is sourced and tested.`,

  "Tropical Botanical Repellent v1": `🦟 TROPICAL BOTANICAL REPELLENT — Pilot Notes

Formula: 55% Distillery Blend B · 15% Mint Alcohol Infusion · 20% Jojoba · 8% Macadamia · Tea Tree 20 drops · Eucalyptus 20 drops

System: BIPHASIC — must have "Shake well before use" label

Process (order matters):
1. Measure Distillery Blend B into beaker
2. Add Mint Alcohol Infusion
3. Add Tea Tree EO + Eucalyptus EO — stir
4. Add Jojoba + Macadamia — stir gently
5. Transfer to 100mL amber SPRAY bottle

Label MUST include:
- "Shake well before use"
- "Reapply every 60–90 minutes"

QC checklist:
- Phase separation time (note after 5 min rest)
- Aromatic strength (1–5)
- Skin feel after 5 min
- Test vs mosquitoes FNQ conditions
- Aroma acceptance

Performance expectation: 45–90 min protection (natural botanical — reapplication required)
Sensory: light botanical-tropical spray, quick evaporation, dry finish.`,
};

// ─── NEW INVENTORY ITEMS ─────────────────────────────────────────────────────
// Upserted by name; safe to re-run.

type NewItem = {
  name: string;
  category: InventoryCategory;
  unitType: UnitType;
  purchaseUnit: Unit;
  purchaseSize: number;
  purchaseCostAud: number;
  notes?: string;
};

const NEW_ITEMS: NewItem[] = [
  // ── Merlion Naturals (powders) ────────────────────────────────────────────
  {
    name: "Spirulina Powder",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 200,
    purchaseCostAud: 19.57,
    notes: "AUD 0.0979/g — true cost incl. shipping & GST (Merlion Naturals)",
  },
  {
    name: "Rose Petals Powder",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 200,
    purchaseCostAud: 16.30,
    notes: "AUD 0.0815/g — true cost incl. shipping & GST (Merlion Naturals)",
  },
  {
    name: "Activated Charcoal Powder",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 200,
    purchaseCostAud: 16.30,
    notes: "AUD 0.0815/g — true cost incl. shipping & GST (Merlion Naturals)",
  },
  {
    name: "Indigo Leaves Powder",
    category: InventoryCategory.BOTANICAL,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 200,
    purchaseCostAud: 16.30,
    notes: "AUD 0.0815/g — true cost incl. shipping & GST (Merlion Naturals)",
  },

  // ── New Directions Australia — Clays ─────────────────────────────────────
  {
    name: "Green French Argile Clay",
    category: InventoryCategory.CLAY,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 100,
    purchaseCostAud: 14.99,
    notes: "AUD 0.1499/g — true cost incl. shipping (NDA SKU: CLAY100GREE)",
  },
  {
    name: "Yellow Australian Clay",
    category: InventoryCategory.CLAY,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 500,
    purchaseCostAud: 7.49,
    notes: "AUD 0.0150/g — true cost incl. shipping (NDA SKU: CLAY500YELLAUS)",
  },
  {
    name: "Pink Australian Clay",
    category: InventoryCategory.CLAY,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 500,
    purchaseCostAud: 14.99,
    notes: "AUD 0.0300/g — true cost incl. shipping (NDA SKU: CLAY500AUSTPINK)",
  },
  {
    name: "Kaolin White Australian Clay",
    category: InventoryCategory.CLAY,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 500,
    purchaseCostAud: 8.24,
    notes: "AUD 0.0165/g — true cost incl. shipping (NDA SKU: CLAY500KAOLWHIT)",
  },
  {
    name: "Melt and Pour Shampoo Base",
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 16.48,
    notes: "AUD 0.0165/g — true cost incl. shipping (NDA SKU: SOAPMP1KSHAMPOBASE)",
  },

  // ── NDA Soap Bases & Colourants ───────────────────────────────────────────
  {
    name: "Ultramarine Blue",
    category: InventoryCategory.COLORANT,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 10,
    purchaseCostAud: 5.82,
    notes: "AUD 0.582/g — pigment powder; use 0.1–1% by weight (NDA)",
  },
  {
    name: "Ultramarine Violet Pink",
    category: InventoryCategory.COLORANT,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 10,
    purchaseCostAud: 5.82,
    notes: "AUD 0.582/g — pigment powder; use 0.1–1% by weight (NDA)",
  },
  {
    name: "Indigo Blue Natural Extract",
    category: InventoryCategory.COLORANT,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 15,
    purchaseCostAud: 11.59,
    notes: "AUD 0.773/mL — liquid natural extract (NDA)",
  },
  {
    name: "Safflower Yellow Natural Extract",
    category: InventoryCategory.COLORANT,
    unitType: UnitType.ML,
    purchaseUnit: Unit.ML,
    purchaseSize: 15,
    purchaseCostAud: 11.59,
    notes: "AUD 0.773/mL — liquid natural extract (NDA)",
  },
  {
    name: "Almond Milk Melt and Pour Soap Base",
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 5000,
    purchaseCostAud: 98.17,
    notes: "AUD 0.01963/g — 5 kg slab; true cost incl. shipping & GST (NDA)",
  },
  {
    name: "Aloe Vera Melt and Pour Soap Base",
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 5000,
    purchaseCostAud: 98.17,
    notes: "AUD 0.01963/g — 5 kg slab; true cost incl. shipping & GST (NDA)",
  },

  // ── Temu — Silicone Molds ─────────────────────────────────────────────────
  {
    name: "Silicone Flower-Shaped Cake Mold (Green)",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 5.47,
    notes: "AUD 5.47 each — free shipping (Temu)",
  },
  {
    name: "Sun and Moon Silicone Mold (Y-537)",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 5.41,
    notes: "AUD 5.41 each — free shipping (Temu)",
  },
  {
    name: "Sun and Moon Cake Silicone Mold",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 6.01,
    notes: "AUD 6.01 each — free shipping (Temu)",
  },
  {
    name: "Sun Moon Star Goddess Silicone Mold",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 11.62,
    notes: "AUD 11.62 each — round sun/moon mold; free shipping (Temu)",
  },
  {
    name: "Tai Chi Yin Yang Silicone Mold (pair)",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 3.86,
    notes: "AUD 3.86 per pair — candle/soap; free shipping (Temu)",
  },
  {
    name: "Lotus Flower Silicone Mold",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 4.90,
    notes: "AUD 4.90 each — candle/soap; free shipping (Temu)",
  },
  {
    name: "Lotus Resin Casting Silicone Mold",
    category: InventoryCategory.MOLD,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 1,
    purchaseCostAud: 6.78,
    notes: "AUD 6.78 each — free shipping (Temu)",
  },

  // ── Temu — Packaging & Labels ─────────────────────────────────────────────
  {
    name: "Navy Blue Organza Gift Bag 8x10 cm",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 50,
    purchaseCostAud: 2.86,
    notes: "AUD 0.0572/bag — pack of 50; free shipping (Temu)",
  },
  {
    name: "White Mesh Organza Bag (50pcs)",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 50,
    purchaseCostAud: 4.45,
    notes: "AUD 0.089/bag — pack of 50; free shipping (Temu)",
  },
  {
    name: "2-inch Round Thermal Label Morandi Spring",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 150,
    purchaseCostAud: 5.86,
    notes: "AUD 0.039/label — roll of 150 sheets; free shipping (Temu)",
  },
  {
    name: "2-inch Round Thermal Label Morandi Summer",
    category: InventoryCategory.PACKAGING,
    unitType: UnitType.EACH,
    purchaseUnit: Unit.EACH,
    purchaseSize: 150,
    purchaseCostAud: 5.86,
    notes: "AUD 0.039/label — roll of 150 sheets; free shipping (Temu)",
  },

  // ── Soap Bases — additional ────────────────────────────────────────────────
  {
    name: "Goat's Milk Melt & Pour Soap Base",
    category: InventoryCategory.SOAP_BASE,
    unitType: UnitType.G,
    purchaseUnit: Unit.G,
    purchaseSize: 1000,
    purchaseCostAud: 29.78,
    notes: "NDA #3983809 — 1kg landed inc GST; $0.02978/g",
  },
];

// ─── OVERHEAD COSTS ───────────────────────────────────────────────────────────
// Monthly overhead = sum of all active costs normalised to monthly equivalent.
//   WEEKLY  → amount × (52/12)
//   MONTHLY → amount × 1
//   ANNUAL  → amount / 12
// Diluted overhead per unit = total monthly overhead / estimatedUnitsPerMonth.

type OHPeriod = "WEEKLY" | "MONTHLY" | "ANNUAL";
const OVERHEAD_COSTS: Array<{ name: string; amount: number; period: OHPeriod; notes: string }> = [
  {
    name: "Market Stand Hire",
    amount: 57.00,
    period: "WEEKLY",
    notes: "Weekly market stall fee — $57 × 52/12 = $247.00/month",
  },
  {
    name: "Internet",
    amount: 149.00,
    period: "MONTHLY",
    notes: "Monthly internet service",
  },
  {
    name: "Electricity",
    amount: 35.00,
    period: "MONTHLY",
    notes: "Monthly electricity",
  },
  {
    name: "Water",
    amount: 35.00,
    period: "MONTHLY",
    notes: "Monthly water",
  },
];

async function main() {
  console.log("📦 Updating existing inventory prices...");

  for (const [name, data] of Object.entries(PRICES)) {
    const item = await prisma.inventoryItem.findFirst({ where: { name } });
    if (!item) {
      console.log(`  ⚠ Not found: "${name}" — skipping`);
      continue;
    }
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        purchaseSize: data.purchaseSize,
        purchaseCostAud: data.purchaseCostAud,
        ...(data.notes ? { notes: data.notes } : {}),
      },
    });
    const costPerUnit = data.purchaseCostAud / data.purchaseSize;
    console.log(`  ✓ ${name}: AU$${costPerUnit.toFixed(4)}/unit`);
  }

  console.log("\n🆕 Upserting new inventory items...");

  for (const item of NEW_ITEMS) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: item.name } });
    if (existing) {
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          purchaseSize: item.purchaseSize,
          purchaseCostAud: item.purchaseCostAud,
          ...(item.notes ? { notes: item.notes } : {}),
        },
      });
      console.log(`  ↺ Updated: "${item.name}"`);
    } else {
      await prisma.inventoryItem.create({
        data: {
          name: item.name,
          category: item.category,
          unitType: item.unitType,
          purchaseUnit: item.purchaseUnit,
          purchaseSize: item.purchaseSize,
          purchaseCostAud: item.purchaseCostAud,
          notes: item.notes,
        },
      });
      const cpu = item.purchaseCostAud / item.purchaseSize;
      console.log(`  ✓ Created: "${item.name}" — AU$${cpu.toFixed(4)}/${item.purchaseUnit}`);
    }
  }

  console.log("\n💸 Upserting overhead costs (raw SQL)...");

  // Raw SQL for OverheadCost (model not yet in generated client — avoids prisma generate requirement)
  const now = new Date().toISOString();
  for (const oc of OVERHEAD_COSTS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO OverheadCost (name, amount, period, notes, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         amount=excluded.amount,
         period=excluded.period,
         notes=excluded.notes,
         active=1,
         updatedAt=excluded.updatedAt`,
      oc.name, oc.amount, oc.period, oc.notes ?? null, now, now,
    );
    const monthlyEquiv =
      oc.period === "WEEKLY"
        ? oc.amount * (52 / 12)
        : oc.period === "ANNUAL"
        ? oc.amount / 12
        : oc.amount;
    console.log(`  ✓ ${oc.name}: AU$${monthlyEquiv.toFixed(2)}/month (${oc.period} AU$${oc.amount})`);
  }

  // Total monthly overhead summary
  const allOverhead = OVERHEAD_COSTS.map((oc) => ({
    ...oc,
    monthly:
      oc.period === "WEEKLY"
        ? oc.amount * (52 / 12)
        : oc.period === "ANNUAL"
        ? oc.amount / 12
        : oc.amount,
  }));
  const totalMonthly = allOverhead.reduce((s, o) => s + o.monthly, 0);
  console.log(`\n  📊 Total monthly overhead: AU$${totalMonthly.toFixed(2)}`);
  console.log(`     e.g. @ 50 units/month  → AU$${(totalMonthly / 50).toFixed(2)}/unit overhead`);
  console.log(`     e.g. @ 100 units/month → AU$${(totalMonthly / 100).toFixed(2)}/unit overhead`);

  console.log("\n🏷  Upserting default pricing profile (raw SQL for new column)...");

  // Check for existing Default profile
  const existingProfiles = await prisma.$queryRawUnsafe<Array<{ id: number; name: string }>>(
    `SELECT id, name FROM PricingProfile WHERE name = 'Default' LIMIT 1`,
  );
  if (existingProfiles.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE PricingProfile SET estimatedUnitsPerMonth = 500, updatedAt = ? WHERE id = ?`,
      now, existingProfiles[0].id,
    );
    console.log("  ↺ Updated Default profile: estimatedUnitsPerMonth = 500");
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO PricingProfile (name, laborRatePerHour, laborMinutesPerBatch, overheadPercent, targetMarginPercent, estimatedUnitsPerMonth, createdAt, updatedAt)
       VALUES ('Default', 25.0, 30.0, 0.0, 40.0, 500.0, ?, ?)`,
      now, now,
    );
    console.log("  ✓ Created Default pricing profile (500 units/month baseline)");
  }

  // ─── ENSURE DROPS-PER-ML SPECS FOR LIQUID COLORANTS ──────────────────────
  console.log("\n🎨 Ensuring dropsPerMl specs for liquid colorants used as drops...");
  const liquidColorants = ["Indigo Blue Natural Extract", "Safflower Yellow Natural Extract"];
  for (const lcName of liquidColorants) {
    const lc = await prisma.inventoryItem.findFirst({ where: { name: lcName } });
    if (!lc) continue;
    const existing = await prisma.essentialOilSpec.findFirst({ where: { inventoryItemId: lc.id } });
    if (!existing) {
      await prisma.essentialOilSpec.create({
        data: { inventoryItemId: lc.id, dropsPerMl: 20 },
      });
      console.log(`  ✓ Added dropsPerMl=20 for "${lcName}"`);
    } else {
      console.log(`  ↺ Already set for "${lcName}"`);
    }
  }

  // ─── SOAP FLOWER RECIPES ───────────────────────────────────────────────────
  console.log("\n🌺 Creating soap flower recipes...");

  const findItem = async (name: string) =>
    prisma.inventoryItem.findFirst({ where: { name } });

  const goatBase = await findItem("Goat's Milk Melt & Pour Soap Base");
  const jasmine = await findItem("Jasmine");
  const pinkClay = await findItem("Pink Australian Clay");
  const colorant = await findItem("Indigo Blue Natural Extract");

  // Batch A — 4 large flowers (~52g each)
  const batchAName = "Soap Flowers Batch A (Goat's Milk)";
  const existingA = await prisma.recipe.findFirst({ where: { name: batchAName } });
  if (!existingA && goatBase) {
    await prisma.recipe.create({
      data: {
        name: batchAName,
        batchSize: 4,
        batchUnit: Unit.EACH,
        notes: `🌺 SOAP FLOWERS BATCH A — Test Recipe

Formula: 230g Goat's Milk M&P Base · 5 drops Jasmine · ~2g natural clay · ~4 drops colorant
Output: 4 flower-shaped soaps × ~52g each (208g total from 230g → ~10% process loss)

Mold: 6-cavity silicone flower mold (AU$6, reusable)

Process:
1. Cut 230g soap base into small cubes
2. Melt in double boiler or microwave (30s intervals)
3. Mix in clay and colorant while liquid
4. Add Jasmine EO last (stir gently, avoid bubbles)
5. Pour into 4 cavities of flower mold
6. Spritz surface with isopropyl to remove bubbles
7. Let cool 2–4 hours, unmold

QC: Smooth surface, even colour, pleasant jasmine scent, ~52g per flower.`,
        lineItems: {
          create: [
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: goatBase.id,
              quantity: 230,
              unit: Unit.G,
            },
            ...(jasmine ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: jasmine.id,
              quantity: 5,
              unit: Unit.DROPS,
            }] : []),
            ...(pinkClay ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: pinkClay.id,
              quantity: 2,
              unit: Unit.G,
            }] : []),
            ...(colorant ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: colorant.id,
              quantity: 4,
              unit: Unit.DROPS,
            }] : []),
          ],
        },
      },
    });
    console.log(`  ✓ Created: "${batchAName}"`);
  } else if (existingA) {
    console.log(`  ↺ Already exists: "${batchAName}"`);
  } else {
    console.log(`  ⚠ Missing Goat's Milk base — skipping Batch A`);
  }

  // Batch B — 2 small flowers (~40g) + 1 half moon (~34g)
  const batchBName = "Soap Flowers Batch B (Goat's Milk)";
  const existingB = await prisma.recipe.findFirst({ where: { name: batchBName } });
  if (!existingB && goatBase) {
    await prisma.recipe.create({
      data: {
        name: batchBName,
        batchSize: 3,
        batchUnit: Unit.EACH,
        notes: `🌸 SOAP FLOWERS BATCH B — Test Recipe

Formula: 115g Goat's Milk M&P Base · 3 drops Jasmine · ~0.3g natural clay · ~3 drops colorant
Output: 2 small flowers × ~40g + 1 half moon ~34g (114g total from 115g → minimal loss)

Mold: 6-cavity silicone flower mold + half-moon mold (AU$6 each, reusable)

Process: Same as Batch A, smaller volume.

QC: Mixed shapes — smaller pieces, good for gift sets or sampler packs.`,
        lineItems: {
          create: [
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: goatBase.id,
              quantity: 115,
              unit: Unit.G,
            },
            ...(jasmine ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: jasmine.id,
              quantity: 3,
              unit: Unit.DROPS,
            }] : []),
            ...(pinkClay ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: pinkClay.id,
              quantity: 0.3,
              unit: Unit.G,
            }] : []),
            ...(colorant ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: colorant.id,
              quantity: 3,
              unit: Unit.DROPS,
            }] : []),
          ],
        },
      },
    });
    console.log(`  ✓ Created: "${batchBName}"`);
  } else if (existingB) {
    console.log(`  ↺ Already exists: "${batchBName}"`);
  } else {
    console.log(`  ⚠ Missing Goat's Milk base — skipping Batch B`);
  }

  // ─── REPELLENT SPRAY RECIPES ────────────────────────────────────────────
  console.log("\n🦟 Creating repellent spray recipes...");

  const witchHazel = await findItem("Witch hazel (distillate/extract)");
  const mintInfusion = await findItem("Mint Alcohol Infusion");
  const coconutOil = await findItem("Coconut Oil (Refined, Organic)");
  const teaTree = await findItem("Tea tree");
  const ginger = await findItem("Ginger");
  const clove = await findItem("Clove");
  const eucalyptus = await findItem("Eucalyptus");

  // Wet Season Repellent — 40ml
  const wetSeasonName = "Wet Season Repellent Spray";
  const existingWS = await prisma.recipe.findFirst({ where: { name: wetSeasonName } });
  if (!existingWS && witchHazel && mintInfusion && coconutOil) {
    await prisma.recipe.create({
      data: {
        name: wetSeasonName,
        batchSize: 40,
        batchUnit: Unit.ML,
        notes: `🦟 WET SEASON REPELLENT — Test Recipe

Formula: 20mL witch hazel · 10mL mint alcohol infusion · 10mL coconut oil · 4 drops tea tree · 4 drops ginger
Total: ~40mL biphasic spray

System: BIPHASIC — "Shake well before use"
Bottle: 50mL spray bottle

Process:
1. Combine witch hazel + mint infusion
2. Add tea tree + ginger EO, stir
3. Add coconut oil last
4. Transfer to spray bottle

Label: "Shake well. Reapply every 60–90 min."`,
        lineItems: {
          create: [
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: witchHazel.id,
              quantity: 20,
              unit: Unit.ML,
            },
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: mintInfusion.id,
              quantity: 10,
              unit: Unit.ML,
            },
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: coconutOil.id,
              quantity: 10,
              unit: Unit.ML,
            },
            ...(teaTree ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: teaTree.id,
              quantity: 4,
              unit: Unit.DROPS,
            }] : []),
            ...(ginger ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: ginger.id,
              quantity: 4,
              unit: Unit.DROPS,
            }] : []),
          ],
        },
      },
    });
    console.log(`  ✓ Created: "${wetSeasonName}"`);
  } else if (existingWS) {
    console.log(`  ↺ Already exists: "${wetSeasonName}"`);
  }

  // Signature Repellent — 60ml
  const sigRepName = "Signature Repellent Spray";
  const existingSig = await prisma.recipe.findFirst({ where: { name: sigRepName } });
  if (!existingSig && witchHazel && mintInfusion && coconutOil) {
    await prisma.recipe.create({
      data: {
        name: sigRepName,
        batchSize: 60,
        batchUnit: Unit.ML,
        notes: `🦟 SIGNATURE REPELLENT — Test Recipe

Formula: 30mL witch hazel · 20mL mint alcohol infusion · 10mL coconut oil · 5 drops ginger · 4 drops clove · 2 drops eucalyptus
Total: ~60mL biphasic spray

System: BIPHASIC — "Shake well before use"
Bottle: 100mL spray bottle (or 2× 50mL)

Process:
1. Combine witch hazel (20+10mL) + mint infusion (10+10mL)
2. Add ginger + clove + eucalyptus EO, stir
3. Add coconut oil last
4. Transfer to spray bottle

Label: "Shake well. Reapply every 60–90 min."
Note: Stronger formula — more herbal volume + triple-EO blend.`,
        lineItems: {
          create: [
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: witchHazel.id,
              quantity: 30,
              unit: Unit.ML,
            },
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: mintInfusion.id,
              quantity: 20,
              unit: Unit.ML,
            },
            {
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: coconutOil.id,
              quantity: 10,
              unit: Unit.ML,
            },
            ...(ginger ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: ginger.id,
              quantity: 5,
              unit: Unit.DROPS,
            }] : []),
            ...(clove ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: clove.id,
              quantity: 4,
              unit: Unit.DROPS,
            }] : []),
            ...(eucalyptus ? [{
              sourceType: SourceType.INVENTORY_ITEM,
              sourceInventoryItemId: eucalyptus.id,
              quantity: 2,
              unit: Unit.DROPS,
            }] : []),
          ],
        },
      },
    });
    console.log(`  ✓ Created: "${sigRepName}"`);
  } else if (existingSig) {
    console.log(`  ↺ Already exists: "${sigRepName}"`);
  }

  console.log("\n📝 Updating recipe notes...");

  for (const [name, notes] of Object.entries(RECIPE_NOTES)) {
    const recipe = await prisma.recipe.findFirst({ where: { name } });
    if (!recipe) {
      console.log(`  ⚠ Not found: "${name}" — skipping`);
      continue;
    }
    await prisma.recipe.update({ where: { id: recipe.id }, data: { notes } });
    console.log(`  ✓ ${name}`);
  }

  console.log("\n✅ All done. Open localhost:3000 to see updated costs.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

