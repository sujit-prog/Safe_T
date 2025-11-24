import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") || "";

  // Dummy response — replace later with real data source
  const result = {
    address,
    safe: Math.random() > 0.5,
    message: "This is a test response. Connect to real data later."
  };

  return NextResponse.json(result);
}
