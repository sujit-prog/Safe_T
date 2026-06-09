import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Types for safety metrics matching types/index.ts
interface SafetyMetrics {
  historicalScore: number;     // 20% weight
  environmentalScore: number;  // 35% weight
  activeAlertScore: number;     // 45% weight
  overallSafety: number;
  isNightMultiplierActive: boolean; // 30% penalty
  riskLevel: 'Verified Safe' | 'Caution Advised' | 'Higher Risk';
}

interface EmergencyCenter {
  type: 'hospital' | 'police' | 'fire';
  name: string;
  distance: string;
  lat: number;
  lng: number;
}

// Check if it is night-time (9 PM to 5 AM)
function checkIsNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 21 || hour < 5;
}

// Calculate distance in meters using Haversine formula (JS fallback)
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const address = searchParams.get("address") || "";

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // 1. Calculate Historical Score (20% weight) based on nearby incidents within 2km
    let penalty = 0;
    try {
      // PostGIS query (GiST indexed fast spatial distance lookup)
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
        penalty += weight * incident.severity * 2.5; // Scale weight
      }
    } catch (e) {
      console.warn("PostGIS incident lookup failed, using mathematical fallback:", e);
      // Fallback: manual bounding box + JS math
      const range = 5000 / 111000; // ~5km in degrees
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
      // PostGIS query for anchors
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
      console.warn("PostGIS anchor lookup failed, using fallback:", e);
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
      }).filter(a => a.distance <= 5000);
    }

    for (const a of safeAnchors) {
      if (a.type === "Police Station") envPoints += 20;
      else if (a.type === "Hospital") envPoints += 15;
      else if (a.type === "24/7 Store") envPoints += 10;
    }
    const environmentalScore = Math.min(100, 50 + envPoints); // base of 50

    // 3. Calculate Active Alert Score (45% weight) based on recent Network Alerts
    const recentAlerts = await prisma.networkAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 10
    });
    let alertPenalty = 0;
    const searchAddr = address.toLowerCase();
    for (const alert of recentAlerts) {
      const alertLoc = alert.location.toLowerCase();
      if (searchAddr && (searchAddr.includes(alertLoc) || alertLoc.includes(searchAddr))) {
        alertPenalty += alert.isVerified ? 25 : 15;
      } else {
        alertPenalty += alert.isVerified ? 5 : 2; // minor overall background risk
      }
    }
    const activeAlertScore = Math.max(0, Math.min(100, Math.round(100 - alertPenalty)));

    // 4. Combine scores and apply Night Multiplier (30% penalty)
    const isNight = checkIsNight();
    let overallSafety = (historicalScore * 0.20) + (environmentalScore * 0.35) + (activeAlertScore * 0.45);
    
    if (isNight) {
      overallSafety = overallSafety * 0.70; // 30% penalty
    }
    overallSafety = Math.max(0, Math.min(100, Math.round(overallSafety)));

    // Determine Risk Level
    let riskLevel: 'Verified Safe' | 'Caution Advised' | 'Higher Risk';
    if (overallSafety >= 75) riskLevel = 'Verified Safe';
    else if (overallSafety >= 45) riskLevel = 'Caution Advised';
    else riskLevel = 'Higher Risk';

    const safetyMetrics: SafetyMetrics = {
      historicalScore,
      environmentalScore,
      activeAlertScore,
      overallSafety,
      isNightMultiplierActive: isNight,
      riskLevel
    };

    // Format Emergency Centers
    const emergencyCenters: EmergencyCenter[] = safeAnchors.map(a => {
      const type = a.type === "Police Station" ? "police" : a.type === "Hospital" ? "hospital" : "fire";
      const distMeters = Number(a.distance || 0);
      const distStr = distMeters < 1000 ? `${Math.round(distMeters)}m` : `${(distMeters / 1000).toFixed(1)}km`;
      return {
        type,
        name: a.name,
        distance: distStr,
        lat: a.latitude,
        lng: a.longitude
      };
    });

    // Fallback default emergency centers if none nearby are found
    if (emergencyCenters.length === 0) {
      emergencyCenters.push(
        {
          type: 'hospital',
          name: 'City General Hospital (Default)',
          distance: '1.2 km',
          lat: lat + 0.01,
          lng: lng + 0.01
        },
        {
          type: 'police',
          name: 'Police Station Central (Default)',
          distance: '0.8 km',
          lat: lat - 0.005,
          lng: lng + 0.005
        }
      );
    }

    const result = {
      location: {
        lat,
        lng,
        address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      },
      safety: safetyMetrics,
      emergencyCenters,
      timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(safetyMetrics)
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Safety Calculation API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateRecommendations(metrics: SafetyMetrics): string[] {
  const recommendations: string[] = [];
  
  if (metrics.riskLevel === 'Higher Risk') {
    recommendations.push('⚠️ High incident density detected. Avoid walking alone.');
    recommendations.push('🚨 Keep your Emergency SOS trigger ready.');
  } else if (metrics.riskLevel === 'Caution Advised') {
    recommendations.push('⚠️ Moderate risk area. Stay on well-lit main roads.');
    recommendations.push('👥 Travel in groups and share your live location.');
  } else {
    recommendations.push('✅ Area appears highly secure and well-lit.');
    recommendations.push('👍 Normal precautions recommended.');
  }

  if (metrics.environmentalScore < 60) {
    recommendations.push('💡 Low density of safe anchors (shops/stations) nearby.');
  }
  
  if (metrics.isNightMultiplierActive) {
    recommendations.push('🌙 Night-time risk penalty is active. Travel by vehicle if possible.');
  }
  
  return recommendations;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, location, score, status } = body;

    if (!userId || !location || score === undefined || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const check = await prisma.checkHistory.create({
      data: {
        userId,
        location,
        score: Math.round(score),
        status,
      }
    });

    return NextResponse.json({ success: true, check });
  } catch (error: any) {
    console.error("Save Check History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}