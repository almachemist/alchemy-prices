import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
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
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const recipe = await prisma.recipe.create({
    data: {
      name: body.name,
      batchSize: body.batchSize,
      batchUnit: body.batchUnit,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(recipe, { status: 201 });
}
