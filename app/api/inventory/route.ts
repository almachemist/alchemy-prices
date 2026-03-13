import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  const items = await prisma.inventoryItem.findMany({
    include: { essentialOilSpec: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.inventoryItem.create({
    data: {
      name: body.name,
      category: body.category,
      unitType: body.unitType,
      purchaseSize: body.purchaseSize,
      purchaseUnit: body.purchaseUnit,
      purchaseCostAud: body.purchaseCostAud,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
