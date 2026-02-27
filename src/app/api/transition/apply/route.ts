import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import type { ApplyTransitionResponse } from "@/lib/transition/types";

const ApplySchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
});

function addDecimalNullSafe(
  a: Decimal | null,
  b: Decimal | null
): Decimal | null {
  if (a !== null && b !== null) return a.add(b);
  if (a !== null) return a;
  if (b !== null) return b;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ApplySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId } = parseResult.data;

    const todoItems = await prisma.transitionItem.findMany({
      where: { householdId, status: "TODO" },
    });

    if (todoItems.length === 0) {
      const response: ApplyTransitionResponse = {
        applied: 0,
        merged: 0,
        created: 0,
      };
      return NextResponse.json(response, { status: 200 });
    }

    let merged = 0;
    let created = 0;
    const appliedIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const ti of todoItems) {
        appliedIds.push(ti.id);

        if (ti.ingredientId) {
          const existing = await tx.shoppingItem.findFirst({
            where: {
              householdId,
              ingredientId: ti.ingredientId,
              unitId: ti.unitId,
              archivedAt: null,
            },
          });

          if (existing) {
            const newQuantity = addDecimalNullSafe(
              existing.quantity,
              ti.quantity
            );
            await tx.shoppingItem.update({
              where: { id: existing.id },
              data: {
                quantity: newQuantity,
                archivedAt: null,
              },
            });
            merged++;
          } else {
            await tx.shoppingItem.create({
              data: {
                householdId,
                weekPlanId: null,
                ingredientId: ti.ingredientId,
                label: ti.label,
                quantity: ti.quantity,
                unitId: ti.unitId,
                aisleId: ti.aisleId,
                status: "TODO",
                source: "TRANSITION",
                archivedAt: null,
              },
            });
            created++;
          }
        } else {
          await tx.shoppingItem.create({
            data: {
              householdId,
              weekPlanId: null,
              ingredientId: null,
              label: ti.label,
              quantity: ti.quantity,
              unitId: ti.unitId,
              aisleId: ti.aisleId,
              status: "TODO",
              source: "TRANSITION",
              archivedAt: null,
            },
          });
          created++;
        }
      }

      if (appliedIds.length > 0) {
        await tx.transitionItem.updateMany({
          where: { id: { in: appliedIds } },
          data: { status: "DONE" },
        });
      }
    });

    const response: ApplyTransitionResponse = {
      applied: appliedIds.length,
      merged,
      created,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/transition/apply:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
