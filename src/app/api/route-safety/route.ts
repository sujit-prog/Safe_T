import { NextResponse } from "next/server";

// ─── ML Service Configuration ──────────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// ─── Existing Data (Fallback) ─────────────────────────────────────────────────
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

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkIsNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 5;
}

// ─── Manual Fallback Calculation ───────────────────────────────────────────────
function calculateManualSegments(coordinates: number[][], isNight: boolean) {
  const segSize = Math.max(5, Math.floor(coordinates.length / 20));
  const segmentScores = [];

  for (let i = 0; i < coordinates.length - 1; i += segSize) {
    const segment = coordinates.slice(i, i + segSize + 1);
    const midIdx = Math.floor(segment.length / 2);
    const centerLat = segment[midIdx][0];
    const centerLng = segment[midIdx][1];

    let closestDistrict = NCRB_2022_ODISHA[0];
    let minDist = Infinity;
    for (const d of NCRB_2022_ODISHA) {
      const dist = getHaversineDistance(centerLat, centerLng, d.lat, d.lng);
      if (dist < minDist) { minDist = dist; closestDistrict = d; }
    }
    const morthMatch = MORTH_2022_ODISHA.find(m => m.district === closestDistrict.district) || MORTH_2022_ODISHA[0];

    const crimeRatio = Math.min(closestDistrict.totalIPC / 15000, 1);
    const crimeScore = 100 - (crimeRatio * 100);

    const accidentRatio = Math.min(morthMatch.accidents / 1500, 1);
    const accidentScore = 100 - (accidentRatio * 100);

    let crowdednessScore = 50;
    if (minDist < 5) crowdednessScore = 90;
    else if (minDist < 15) crowdednessScore = 60;
    else crowdednessScore = 30;

    const timeScore = isNight ? 20 : 100;

    const score = Math.round(
      (crimeScore * 0.40) + (accidentScore * 0.20) + (crowdednessScore * 0.25) + (timeScore * 0.15)
    );

    segmentScores.push({
      startIndex: i,
      endIndex: i + segSize,
      score,
      safety_score: score,
      risk_probability: Math.round((1 - score / 100) * 100) / 100,
      risk_level: score >= 75 ? "Low" : score >= 45 ? "Medium" : "High",
      district: closestDistrict.district,
    });
  }

  return segmentScores;
}

// ─── ML-Powered Route Safety ───────────────────────────────────────────────────
async function predictRouteWithML(coordinates: number[][], evaluationTime?: string) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates, evaluation_time: evaluationTime }),
      signal: AbortSignal.timeout(10000), // 10s timeout for routes
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const mlResult = await response.json();
    
    // Transform ML segments to match existing API format
    const segments = (mlResult.segments || []).map((seg: any) => ({
      startIndex: seg.startIndex,
      endIndex: seg.endIndex,
      score: seg.safety_score,
      safety_score: seg.safety_score,
      risk_probability: seg.risk_probability,
      risk_level: seg.risk_level,
      district: seg.district,
    }));

    return {
      success: true,
      segments,
      overall_safety_score: mlResult.overall_safety_score,
      overall_risk_probability: mlResult.overall_risk_probability,
      overall_risk_level: mlResult.overall_risk_level,
      prediction_source: "ml_model",
    };
  } catch (error: any) {
    console.warn("ML route prediction unavailable:", error.message);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { coordinates, evaluation_time } = body;

    if (!coordinates || coordinates.length === 0) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    // ─── Try ML prediction first ───────────────────────────────────────────
    const mlResult = await predictRouteWithML(coordinates, evaluation_time);
    
    if (mlResult) {
      return NextResponse.json(mlResult);
    }

    // ─── Fallback to manual calculation ────────────────────────────────────
    const isNight = checkIsNight();
    const segmentScores = calculateManualSegments(coordinates, isNight);

    // Calculate overall
    const totalScore = segmentScores.reduce((acc, seg) => acc + seg.score, 0);
    const avgScore = Math.round(totalScore / segmentScores.length);

    return NextResponse.json({
      success: true,
      segments: segmentScores,
      overall_safety_score: avgScore,
      overall_risk_level: avgScore >= 75 ? "Low" : avgScore >= 45 ? "Medium" : "High",
      prediction_source: "manual_fallback",
    });
    
  } catch (error: any) {
    console.error("Route Safety Calculation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
