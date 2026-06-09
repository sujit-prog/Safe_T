import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Night-time = 9PM–5AM local time
function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 21 || hour < 5;
}

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 45) return "HIGH";
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
      return `⚠️ CRITICAL RISK — High crime/accident density detected ${timeCtx}. Avoid if possible. Redirect or keep SOS ready.${anchor}`;
    case "HIGH":
      return `🔴 HIGH RISK ZONE — Crime history active ${timeCtx}. Stay on main well-lit roads and travel in groups.${anchor}`;
    case "MEDIUM":
      return `🟠 Caution Advised — Moderate risk ${timeCtx}. Keep alert and share your live location with a trusted guardian.${anchor}`;
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

    // 1. Calculate Historical Score (20% weight) based on nearby incidents within 2km
    let penalty = 0;
    try {
      // PostGIS query (GiST indexed spatial lookup)
      const rawIncidents = await prisma.$queryRaw<Array<{ severity: number; distance: number }>>`
        SELECT severity, ST_Distance(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(${lng}, ${lat})::geography) as distance
        FROM "IncidentReport"
        WHERE ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          5000
        )
      `;
      for (const incident of rawIncidents) {
        const dist = Number(incident.distance);
        const weight = (5000 - dist) / 5000;
        penalty += weight * incident.severity * 2.5;
      }
    } catch (e) {
      console.warn("PostGIS proactive incident query failed, fallback used:", e);
      const range = 5000 / 111000;
      const dbIncidents = await prisma.incidentReport.findMany({
        where: {
          latitude: { gte: lat - range, lte: lat + range },
          longitude: { gte: lng - range, lte: lng + range }
        }
      });
      for (const inc of dbIncidents) {
        const dist = getHaversineDistance(lat, lng, inc.latitude, inc.longitude);
        if (dist <= 5000) {
          const weight = (5000 - dist) / 5000;
          penalty += weight * inc.severity * 2.5;
        }
      }
    }
    const historicalScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    // 2. Calculate Environmental Score (35% weight) based on Safe Anchors within 2km
    let envPoints = 0;
    let safeAnchors: any[] = [];
    try {
      safeAnchors = await prisma.$queryRaw<any[]>`
        SELECT id, name, type, latitude, longitude, "distanceStr", "statusStr",
               ST_Distance(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(${lng}, ${lat})::geography) as distance
        FROM "SafeAnchor"
        WHERE ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          5000
        )
      `;
    } catch (e) {
      console.warn("PostGIS proactive anchor query failed, fallback used:", e);
      const range = 5000 / 111000;
      const dbAnchors = await prisma.safeAnchor.findMany({
        where: {
          latitude: { gte: lat - range, lte: lat + range },
          longitude: { gte: lng - range, lte: lng + range }
        }
      });
      safeAnchors = dbAnchors.map(a => {
        const dist = getHaversineDistance(lat, lng, a.latitude, a.longitude);
        return { ...a, distance: dist };
      }).filter(a => a.distance <= 2000);
    }

    for (const a of safeAnchors) {
      if (a.type === "Police Station") envPoints += 20;
      else if (a.type === "Hospital") envPoints += 15;
      else if (a.type === "24/7 Store") envPoints += 10;
    }
    const environmentalScore = Math.min(100, 50 + envPoints);

    // 3. Calculate Active Alert Score (45% weight) based on Network Alerts
    const recentAlerts = await prisma.networkAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 10
    });
    let alertPenalty = 0;
    for (const alert of recentAlerts) {
      alertPenalty += alert.isVerified ? 5 : 2; // general background alerts risk
    }
    const activeAlertScore = Math.max(0, Math.min(100, Math.round(100 - alertPenalty)));

    // 4. Combine score and apply Night Mode Multiplier
    const isNight = isNightTime(now);
    let safetyScore = (historicalScore * 0.20) + (environmentalScore * 0.35) + (activeAlertScore * 0.45);
    if (nightModeEnabled && isNight) {
      safetyScore = safetyScore * 0.70; // 30% penalty
    }
    safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)));

    const riskLevel = getRiskLevel(safetyScore);

    // Find nearest safe anchor
    let nearestAnchor = null;
    let minDist = Infinity;
    for (const a of safeAnchors) {
      const dist = Number(a.distance);
      if (dist < minDist) {
        minDist = dist;
        nearestAnchor = a;
      }
    }
    const nearestDistStr = nearestAnchor ? (minDist < 1000 ? `${Math.round(minDist)}m` : `${(minDist / 1000).toFixed(1)}km`) : "";

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
