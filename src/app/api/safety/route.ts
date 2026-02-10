import { NextResponse } from "next/server";

// Types for our safety data
interface SafetyMetrics {
  crimeRate: number; // 0-100 (higher = more crime)
  accidentRate: number; // 0-100
  overallSafety: number; // 0-100 (higher = safer)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface EmergencyCenter {
  type: 'hospital' | 'police' | 'fire';
  name: string;
  distance: string;
  lat: number;
  lng: number;
}

// Simulate safety calculation based on location
// In production, this would use real crime statistics APIs
function calculateSafetyMetrics(lat: number, lng: number): SafetyMetrics {
  // Simulate based on coordinate patterns
  // Lower latitudes might have different risk profiles
  const baseRisk = (Math.abs(lat) + Math.abs(lng)) % 30;
  const randomFactor = Math.random() * 20;
  
  const crimeRate = Math.min(100, baseRisk + randomFactor);
  const accidentRate = Math.min(100, (baseRisk * 0.8) + (randomFactor * 0.7));
  
  const overallSafety = 100 - ((crimeRate + accidentRate) / 2);
  
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (overallSafety >= 75) riskLevel = 'LOW';
  else if (overallSafety >= 50) riskLevel = 'MEDIUM';
  else if (overallSafety >= 25) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';
  
  return {
    crimeRate: Math.round(crimeRate),
    accidentRate: Math.round(accidentRate),
    overallSafety: Math.round(overallSafety),
    riskLevel
  };
}

export async function GET(req: Request) {
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

  // Calculate safety metrics
  const safetyMetrics = calculateSafetyMetrics(lat, lng);

  // Simulate emergency centers (in production, use Google Places API)
  const emergencyCenters: EmergencyCenter[] = [
    {
      type: 'hospital',
      name: 'City General Hospital',
      distance: '1.2 km',
      lat: lat + 0.01,
      lng: lng + 0.01
    },
    {
      type: 'police',
      name: 'Police Station Central',
      distance: '0.8 km',
      lat: lat - 0.005,
      lng: lng + 0.005
    },
    {
      type: 'fire',
      name: 'Fire Station 3',
      distance: '2.1 km',
      lat: lat + 0.015,
      lng: lng - 0.01
    }
  ];

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
}

function generateRecommendations(metrics: SafetyMetrics): string[] {
  const recommendations: string[] = [];
  
  if (metrics.riskLevel === 'CRITICAL') {
    recommendations.push('⚠️ This area has high risk. Avoid if possible.');
    recommendations.push('🚨 Keep emergency contacts ready');
  } else if (metrics.riskLevel === 'HIGH') {
    recommendations.push('⚠️ Exercise extreme caution in this area');
    recommendations.push('👥 Travel in groups when possible');
  } else if (metrics.riskLevel === 'MEDIUM') {
    recommendations.push('⚡ Stay alert and aware of surroundings');
    recommendations.push('📱 Share location with trusted contacts');
  } else {
    recommendations.push('✅ Area appears relatively safe');
    recommendations.push('👍 Normal precautions recommended');
  }
  
  if (metrics.accidentRate > 60) {
    recommendations.push('🚗 High accident rate - drive carefully');
  }
  
  if (metrics.crimeRate > 60) {
    recommendations.push('🔒 Secure valuables and stay in well-lit areas');
  }
  
  return recommendations;
}