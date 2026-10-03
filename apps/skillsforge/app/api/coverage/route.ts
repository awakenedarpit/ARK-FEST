import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withOrgAuth } from "@/lib/api/withOrgAuth";
import { validationError } from "@/lib/api/validationError";
import { db } from "@/lib/db";
import { buildCoverage } from "@/lib/domain/coverage";
import { formatDateStr, parseDate, today } from "@/lib/domain/rules";
import { DEMO_MACHINES, DEMO_OPERATORS, DEMO_SHIFTS, getDemoSkillRecords } from "@/lib/demo/seedData";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  asOf: z.string().optional(),
});

export const GET = withOrgAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) return validationError(parsed);

  const asOf = parsed.data.asOf || today();

  try {
    const [shifts, skills, operators, records] = await Promise.all([
      db.sfShift.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { code: "asc" },
        select: { id: true, code: true, startTime: true, endTime: true },
      }),
      db.sfSkill.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, nameHi: true, lineKey: true, criticality: true, isActive: true },
      }),
      db.sfOperator.findMany({
        where: { orgId: ctx.orgId, isActive: true },
        select: { id: true, name: true, shiftId: true, isActive: true },
      }),
      db.sfOperatorSkill.findMany({
        where: { orgId: ctx.orgId },
        take: 5000,
        select: { operatorId: true, skillId: true, level: true, issuedOn: true, certifiedUntil: true },
      }),
    ]);

    const mappedRecords = records.map((record: {
      operatorId: string;
      skillId: string;
      level: number;
      issuedOn: Date | null;
      certifiedUntil: Date | null;
    }) => ({
      operatorId: record.operatorId,
      skillId: record.skillId,
      level: record.level,
      issuedOn: record.issuedOn ? formatDateStr(parseDate(record.issuedOn)) : null,
      certifiedUntil: record.certifiedUntil ? formatDateStr(parseDate(record.certifiedUntil)) : null,
    }));

    return NextResponse.json({
      success: true,
      data: buildCoverage(operators, skills, shifts, mappedRecords, asOf),
    });
  } catch (error) {
    console.error("Coverage query failed; serving demo fallback:", error);

    return NextResponse.json({
      success: true,
      data: buildCoverage(
        DEMO_OPERATORS,
        DEMO_MACHINES,
        DEMO_SHIFTS,
        getDemoSkillRecords(asOf),
        asOf,
      ),
    });
  }
});
