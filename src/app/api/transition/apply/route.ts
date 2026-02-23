import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import type { ApplyTransitionResponse } from "@/lib/transition/types";

function normalizeToMonday(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

const ApplySchema = z
  .object({
    householdId: z.string().min(1, "householdId is required"),
    weekPlanId: z.string().min(1).optional(),
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format")
      .optional(),
  })
  .refine((data) => data.weekPlanId || data.weekStart, {
    message: "Either weekPlanId or weekStart must be provided",
  })
  .refine((data) => !(data.weekPlanId && data.weekStart), {
    message: "Provide weekPlanId or weekStart, not both",
  });

async function resolveWeekPlan(householdId: string, weekPlanId?: string, weekStart?: string) {
  if (weekPlanId) {
    const wp = await prisma.weekPlan.findUnique({ where: { id: weekPlanId } });
    if (!wp) return { error: `WeekPlan not found: ${weekPlanId}`, status: 404 } as const;
    if (wp.householdId !== householdId) return { error: "WeekPlan does not belong to this household", status: 403 } as const;
    return { weekPlan: wp } as const;
  }

  const monday = normalizeToMonday(weekStart!);
  const wp = await prisma.weekPlan.findUnique({
    where: { householdId_weekStart: { householdId, weekStart: monday } },
  });
  if (!wp) return { error: `No WeekPlan found for household ${householdId} week ${weekStart}`, status: 404 } as const;
  return { weekPlan: wp } as const;
}

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

    const { householdId, weekPlanId, weekStart } = parseResult.data;

    const wpResult = await resolveWeekPlan(householdId, weekPlanId, weekStart);
    if ("error" in wpResult) {
      return NextResponse.json(
        { error: wpResult.error },
        { status: wpResult.status }
      );
    }
    const weekPlan = wpResult.weekPlan;

    const todoItems = await prisma.transitionItem.findMany({
      where: { householdId, status: "TODO" },
    });

    if (todoItems.length === 0) {
      const weekStartStr =
        weekPlan.weekStart instanceof Date
          ? weekPlan.weekStart.toISOString().split("T")[0]
          : String(weekPlan.weekStart).split("T")[0];

      const response: ApplyTransitionResponse = {
        weekPlanId: weekPlan.id,
        weekStart: weekStartStr,
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
              weekPlanId: weekPlan.id,
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
                weekPlanId: weekPlan.id,
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
              weekPlanId: weekPlan.id,
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

    const weekStartStr =
      weekPlan.weekStart instanceof Date
        ? weekPlan.weekStart.toISOString().split("T")[0]
        : String(weekPlan.weekStart).split("T")[0];

    const response: ApplyTransitionResponse = {
      weekPlanId: weekPlan.id,
      weekStart: weekStartStr,
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
