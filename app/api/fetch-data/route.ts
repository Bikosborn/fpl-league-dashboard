import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/fpl";
import { writeDashboardCache } from "@/lib/store";

export async function POST() {
  try {
    const data = await fetchDashboardData();
    await writeDashboardCache(data);

    return NextResponse.json({
      ok: true,
      generatedAt: data.league.generatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}