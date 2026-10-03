import { NextRequest, NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.DEMO_SEED_SECRET;
  const provided = req.headers.get("x-demo-seed-secret");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.DEMO_SEED_ENABLED !== "true") {
    return NextResponse.json({ success: false, error: "Seed endpoint disabled" }, { status: 404 });
  }

  try {
    const result = await seedDemoData();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error("Demo seed failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 },
    );
  }
}
