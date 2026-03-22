import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(id) },
    include: {
      lineItems: {
        include: {
          sourceInventoryItem: { include: { essentialOilSpec: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const recipe = await prisma.recipe.update({
    where: { id: Number(id) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.batchSize !== undefined && { batchSize: body.batchSize }),
      ...(body.batchUnit !== undefined && { batchUnit: body.batchUnit }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.outputUnits !== undefined && { outputUnits: body.outputUnits }),
      ...(body.unitWeightG !== undefined && { unitWeightG: body.unitWeightG }),
    },
  });
  return NextResponse.json(recipe);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.recipeLineItem.deleteMany({ where: { recipeId: Number(id) } });
  await prisma.recipe.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
