import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Standard sets are now managed by the platform admin. Use /api/platform/curricula." },
    { status: 410 }
  );
}
