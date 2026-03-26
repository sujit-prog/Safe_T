import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Night-time = 9PM–5AM local time
function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 21 || hour < 5;
}

function getNightMultiplier(nightModeEnabled: boolean, date: Date): number {
  if (nightModeEnabled && isNightTime(date)) return 1.25;
  return 1.0;
}

function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "LOW";
  if (score >= 50) return "MEDIUM";
  if (score >= 25) return "HIGH";
  return "CRITICAL";
}

function generateProactiveMessage(
  riskLevel: string,
  safetyScore: number,
  isNight: boolean,
  nearestAnchorName: string | null,
  nearestAnchorDist: string
): string {
  const timeCtx = isNight ? "at night, " : "";
  const anchor = nearestAnchorName
    ? ` Nearest safe point: ${nearestAnchorName} (${nearestAnchorDist}).`
    : "";

  switch (riskLevel) {
    case "CRITICAL":
      return `⚠️ CRITICAL RISK — This area has very high incident rates ${timeCtx}. Avoid if possible. Activate SOS or redirect immediately.${anchor}`;
    case "HIGH":
      return `🔴 HIGH RISK ZONE — Exercise extreme caution ${timeCtx}. Travel in groups. Stay on well-lit roads.${anchor}`;
    case "MEDIUM":
      return `🟠 Caution Advised — Moderate risk ${timeCtx}. Stay alert and share your live location with a trusted guardian.${anchor}`;
    default:
      return "";
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const userId = searchParams.get("userId") || "";
    const timeParam = searchParams.get("time");

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const now = timeParam ? new Date(timeParam) : new Date();

    // Get user notification settings
    let settings = null;
    if (userId) {
      settings = await prisma.userNotificationSettings.findUnique({
        where: { userId },
      });
    }
    const alertThreshold = settings?.alertThreshold ?? "MEDIUM";
    const nightModeEnabled = settings?.nightModeEnabled ?? true;

    // Base safety score (simulated – same logic as /api/safety)
    const baseRisk = (Math.abs(lat) + Math.abs(lng)) % 30;
    const deterministicFactor = ((lat * 1000) % 20 + (lng * 1000) % 20) / 2;
    const crimeRate = Math.min(100, baseRisk + deterministicFactor);
    const accidentRate = Math.min(100, crimeRate * 0.8);
    let safetyScore = Math.round(100 - (crimeRate + accidentRate) / 2);

    // Apply night-time multiplier (reduces safety score)
    const multiplier = getNightMultiplier(nightModeEnabled, now);
    safetyScore = Math.round(safetyScore / multiplier);
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    const riskLevel = getRiskLevel(safetyScore);
    const isNight = isNightTime(now);

    // Find nearest safe anchor
    const anchors = await prisma.safeAnchor.findMany({ take: 10 });
    let nearestAnchor = null;
    let minDist = Infinity;
    for (const a of anchors) {
      const d = Math.sqrt(Math.pow(a.latitude - lat, 2) + Math.pow(a.longitude - lng, 2));
      if (d < minDist) { minDist = d; nearestAnchor = a; }
    }
    const nearestDistStr = nearestAnchor ? `${(minDist * 111).toFixed(1)} km` : "";

    // Threshold logic: only alert if risk is at or above user's threshold
    const thresholdOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const shouldAlert = thresholdOrder.indexOf(riskLevel) >= thresholdOrder.indexOf(alertThreshold);

    let alert = null;
    if (shouldAlert && riskLevel !== "LOW") {
      alert = {
        riskLevel,
        safetyScore,
        message: generateProactiveMessage(
          riskLevel, safetyScore, isNight,
          nearestAnchor?.name ?? null,
          nearestDistStr
        ),
        isNight,
        nearestAnchor: nearestAnchor
          ? { name: nearestAnchor.name, type: nearestAnchor.type, distance: nearestDistStr }
          : null,
      };
    }

    return NextResponse.json({
      lat, lng,
      safetyScore,
      riskLevel,
      isNight,
      alert, // null means no action needed
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Proactive alert error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
