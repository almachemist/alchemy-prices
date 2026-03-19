import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * Merge multiple inventory items into one.
 * Keeps the first item (keepId), updates it with provided data,
 * and deletes the rest (deleteIds).
 * Any RecipeLineItems pointing to deleted items are re-pointed to the kept item.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keepId, deleteIds } = body as {
    keepId: number;
    deleteIds: number[];
  };

  if (!keepId || !deleteIds || deleteIds.length === 0) {
    return NextResponse.json({ error: "keepId and deleteIds are required" }, { status: 400 });
  }

  // Re-point any recipe line items from deleted items to the kept item
  await prisma.recipeLineItem.updateMany({
    where: { sourceInventoryItemId: { in: deleteIds } },
    data: { sourceInventoryItemId: keepId },
  });

  // Delete the duplicate items
  await prisma.inventoryItem.deleteMany({
    where: { id: { in: deleteIds } },
  });

  return NextResponse.json({ ok: true, keptId: keepId, deletedCount: deleteIds.length });
}
