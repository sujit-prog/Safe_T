import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── ML Service Configuration ──────────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// ─── Existing NCRB 2022 Data (Fallback) ────────────────────────────────────────
const NCRB_2022_ODISHA = [
  { district: "Khordha", lat: 20.1843, lng: 85.8314, totalIPC: 14823 },
  { district: "Cuttack", lat: 20.4625, lng: 85.8828, totalIPC: 12541 },
  { district: "Ganjam", lat: 19.3769, lng: 84.7767, totalIPC: 11209 },
  { district: "Sundargarh", lat: 22.1167, lng: 84.0333, totalIPC: 9876 },
  { district: "Sambalpur", lat: 21.4669, lng: 83.9756, totalIPC: 8932 },
  { district: "Balasore", lat: 21.4942, lng: 86.9288, totalIPC: 8123 },
  { district: "Jajpur", lat: 20.8463, lng: 86.3387, totalIPC: 7891 },
  { district: "Puri", lat: 19.8135, lng: 85.8312, totalIPC: 7456 },
  { district: "Kendrapara", lat: 20.4981, lng: 86.4214, totalIPC: 6234 },
  { district: "Kalahandi", lat: 19.9079, lng: 83.1704, totalIPC: 5678 },
  { district: "Koraput", lat: 18.8135, lng: 82.7132, totalIPC: 5432 },
  { district: "Mayurbhanj", lat: 21.9407, lng: 86.7320, totalIPC: 5234 },
  { district: "Angul", lat: 20.8403, lng: 85.1010, totalIPC: 5123 },
  { district: "Bolangir", lat: 20.7014, lng: 83.4866, totalIPC: 4987 },
];

const MORTH_2022_ODISHA = [
  { district: "Khordha", accidents: 1245 },
  { district: "Cuttack", accidents: 950 },
  { district: "Ganjam", accidents: 890 },
  { district: "Sundargarh", accidents: 810 },
  { district: "Sambalpur", accidents: 620 },
  { district: "Balasore", accidents: 580 },
  { district: "Jajpur", accidents: 540 },
  { district: "Puri", accidents: 510 },
  { district: "Kendrapara", accidents: 420 },
  { district: "Kalahandi", accidents: 380 },
  { district: "Koraput", accidents: 310 },
  { district: "Mayurbhanj", accidents: 290 },
  { district: "Angul", accidents: 450 },
  { district: "Bolangir", accidents: 260 },
];

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function evaluateCrowdedness(type: string): { score: number, label: string } {
  const highDensity = ["commercial", "retail", "marketplace", "mall", "university", "college", "hospital", "station"];
  const mediumDensity = ["residential", "suburb", "neighbourhood", "village", "town"];
  if (highDensity.includes(type)) return { score: 90, label: "High Traffic / Commercial" };
  if (mediumDensity.includes(type)) return { score: 60, label: "Moderate / Residential" };
  return { score: 30, label: "Low Traffic / Isolated" };
}

function checkIsNight(hour?: number): boolean {
  const h = hour !== undefined ? hour : new Date().getHours();
  return h >= 22 || h < 5;
}

// ─── Manual Fallback Safety Calculation ────────────────────────────────────────
function calculateManualSafety(lat: number, lng: number, crowdednessScore: number, 
                                crowdednessLabel: string, isNight: boolean) {
  let closestDistrict = NCRB_2022_ODISHA[0];
  let minDist = Infinity;
  for (const d of NCRB_2022_ODISHA) {
    const dist = getHaversineDistance(lat, lng, d.lat, d.lng);
    if (dist < minDist) { minDist = dist; closestDistrict = d; }
  }
  const morthMatch = MORTH_2022_ODISHA.find(m => m.district === closestDistrict.district) || MORTH_2022_ODISHA[0];

  const maxCrimes = 15000;
  const crimeRatio = Math.min(closestDistrict.totalIPC / maxCrimes, 1);
  const crimeScore = Math.round(100 - (crimeRatio * 100));

  const maxAccidents = 1500;
  const accidentRatio = Math.min(morthMatch.accidents / maxAccidents, 1);
  const accidentScore = Math.round(100 - (accidentRatio * 100));

  const timeScore = isNight ? 20 : 100;

  const overallSafety = Math.round(
    crimeScore * 0.40 + accidentScore * 0.20 + crowdednessScore * 0.25 + timeScore * 0.15
  );

  let riskLevel = 'Verified Safe';
  if (overallSafety < 45) riskLevel = 'High Risk';
  else if (overallSafety < 70) riskLevel = 'Moderate Risk';

  return {
    overallSafety,
    riskLevel,
    districtMatch: closestDistrict.district,
    breakdown: { crimeScore, accidentScore, crowdednessScore, crowdednessLabel, timeScore, isNight },
    predictionSource: "manual_fallback",
  };
}

// ─── ML-Powered Safety Prediction ──────────────────────────────────────────────
async function predictWithML(lat: number, lng: number, evaluationTime?: string) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, evaluation_time: evaluationTime }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const mlResult = await response.json();
    
    return {
      overallSafety: mlResult.safety_score,
      riskLevel: mlResult.risk_level === "Low" ? "Verified Safe" 
               : mlResult.risk_level === "Medium" ? "Moderate Risk" 
               : "High Risk",
      districtMatch: mlResult.nearest_district,
      riskProbability: mlResult.risk_probability,
      classProbabilities: mlResult.class_probabilities,
      topFactors: (mlResult.top_factors || []).map((f: any) => f.factor),
      topFactorsDetailed: mlResult.top_factors || [],
      breakdown: {
        crimeScore: Math.round((1 - (mlResult.feature_values?.district_ipc_normalized || 0)) * 100),
        accidentScore: Math.round((1 - (mlResult.feature_values?.district_accident_norm || 0)) * 100),
        crowdednessScore: mlResult.feature_values?.crowdedness_score || 50,
        crowdednessLabel: (mlResult.feature_values?.crowdedness_score || 50) >= 70 
          ? "High Traffic / Commercial" 
          : (mlResult.feature_values?.crowdedness_score || 50) >= 40 
          ? "Moderate / Residential" 
          : "Low Traffic / Isolated",
        timeScore: mlResult.temporal?.is_night ? 20 : 100,
        isNight: mlResult.temporal?.is_night || false,
      },
      temporal: mlResult.temporal,
      predictionSource: "ml_model",
      modelVersion: mlResult.model_version,
    };
  } catch (error: any) {
    console.warn("ML service unavailable, falling back to manual calculation:", error.message);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const address = searchParams.get("address") || "";
    const evaluationTime = searchParams.get("time") || undefined;

    if (!lat || !lng) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    // ─── Try ML prediction first ───────────────────────────────────────────
    const mlResult = await predictWithML(lat, lng, evaluationTime);

    if (mlResult) {
      // ML prediction successful
      const result = {
        location: {
          lat,
          lng,
          address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        },
        safety: mlResult,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(result);
    }

    // ─── Fallback to manual calculation ────────────────────────────────────
    let crowdednessScore = 50;
    let crowdednessLabel = "Unknown";
    
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "SAfe_T_App/1.0" } }
      );
      const osmData = await osmRes.json();
      if (osmData && osmData.type) {
        const crowdedness = evaluateCrowdedness(osmData.type);
        crowdednessScore = crowdedness.score;
        crowdednessLabel = crowdedness.label;
      }
    } catch (e) {
      console.warn("OSM geocode failed for crowdedness, using fallback");
    }

    const isNight = checkIsNight();
    const manualResult = calculateManualSafety(lat, lng, crowdednessScore, crowdednessLabel, isNight);

    const result = {
      location: {
        lat,
        lng,
        address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      },
      safety: manualResult,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Safety Calculation API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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