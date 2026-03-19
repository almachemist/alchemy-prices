import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

interface ImportItem {
  name: string;
  category: string;
  unitType: string;
  purchaseSize: number;
  purchaseUnit: string;
  purchaseCostAud: number;
  notes?: string;
}

/** Normalize a product name for fuzzy matching */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if two normalized names are close enough to be the same product */
function namesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Check if one contains the other (handles truncated OCR names)
  if (a.includes(b) || b.includes(a)) return true;
  // Levenshtein-like: if names are long enough and only differ by a few chars
  if (a.length > 6 && b.length > 6) {
    const words_a = a.split(" ").filter(Boolean);
    const words_b = b.split(" ").filter(Boolean);
    const shared = words_a.filter((w) => words_b.includes(w));
    const total = Math.max(words_a.length, words_b.length);
    if (total > 0 && shared.length / total >= 0.6) return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, clearExisting } = body as {
      items: ImportItem[];
      clearExisting: boolean;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    // Validate all items before doing anything
    for (const item of items) {
      if (!item.name || !item.category || !item.purchaseUnit) {
        return NextResponse.json(
          { error: `Invalid item: ${item.name || "unnamed"} - missing required fields` },
          { status: 400 }
        );
      }
    }

    if (clearExisting) {
      await prisma.packagingLineItem.deleteMany({});
      await prisma.recipeLineItem.deleteMany({});
      await prisma.preparedIngredientInput.deleteMany({});
      await prisma.essentialOilSpec.deleteMany({});
      await prisma.inventoryItem.deleteMany({});
    }

    // Load all existing inventory for cross-linking
    const existingItems = await prisma.inventoryItem.findMany({
      select: { id: true, name: true, purchaseCostAud: true, purchaseSize: true },
    });
    const existingNormalized = existingItems.map((ei) => ({
      ...ei,
      norm: normalizeName(ei.name),
    }));

    const created: number[] = [];
    const updated: number[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      const norm = normalizeName(item.name);

      // Find best matching existing item
      const match = existingNormalized.find((ei) => namesMatch(ei.norm, norm));

      if (match) {
        // Existing item found — update its cost/size if the invoice has better data
        const shouldUpdate =
          match.purchaseCostAud === 0 ||
          item.purchaseCostAud > 0;

        if (shouldUpdate && item.purchaseCostAud > 0) {
          await prisma.inventoryItem.update({
            where: { id: match.id },
            data: {
              purchaseCostAud: item.purchaseCostAud,
              ...(item.purchaseSize > 0 && { purchaseSize: item.purchaseSize }),
              ...(item.notes && { notes: item.notes }),
            },
          });
          updated.push(match.id);
        } else {
          skipped.push(item.name);
        }
      } else {
        // No match — create new item
        const record = await prisma.inventoryItem.create({
          data: {
            name: item.name,
            category: item.category as never,
            unitType: item.unitType as never,
            purchaseSize: item.purchaseSize || 1,
            purchaseUnit: item.purchaseUnit as never,
            purchaseCostAud: item.purchaseCostAud,
            notes: item.notes ?? null,
          },
        });
        created.push(record.id);
        // Add to existing list so later items in same import don't duplicate
        existingNormalized.push({ id: record.id, name: item.name, purchaseCostAud: item.purchaseCostAud, purchaseSize: item.purchaseSize, norm });
      }
    }

    return NextResponse.json({
      success: true,
      count: created.length + updated.length,
      created: created.length,
      updated: updated.length,
      skipped: skipped.length,
    });
  } catch (error) {
    console.error("Inventory import error:", error);
    return NextResponse.json(
      {
        error: "Failed to import inventory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
