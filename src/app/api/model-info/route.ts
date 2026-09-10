import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

export async function GET() {
  try {
    // Try ML service
    try {
      const response = await fetch(`${ML_SERVICE_URL}/model/info`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // fallback
    }

    // Try static file
    const metadataPath = join(process.cwd(), "ml", "models", "model_metadata.json");
    if (existsSync(metadataPath)) {
      const data = JSON.parse(readFileSync(metadataPath, "utf-8"));
      return NextResponse.json(data);
    }

    return NextResponse.json({
      status: "no_model",
      message: "No ML model trained yet. Run `python ml/train.py` to train.",
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
