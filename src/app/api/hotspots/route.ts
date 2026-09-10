import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

export async function GET() {
  try {
    // Try ML service first
    try {
      const response = await fetch(`${ML_SERVICE_URL}/hotspots`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // ML service unavailable, try static file
    }

    // Fallback: try reading pre-computed hotspot file
    const hotspotPath = join(process.cwd(), "ml", "models", "hotspots.json");
    if (existsSync(hotspotPath)) {
      const data = JSON.parse(readFileSync(hotspotPath, "utf-8"));
      return NextResponse.json(data);
    }

    // No hotspot data available
    return NextResponse.json({
      status: "not_available",
      message: "Hotspot data not yet computed. Run `python ml/hotspot.py` to generate.",
      hotspots: [],
    });

  } catch (error: any) {
    console.error("Hotspot API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
