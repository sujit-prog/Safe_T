import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Haversine formula to calculate distance between two lat/lng points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
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

export async function POST(req: Request) {
  try {
    const { coordinates } = await req.json();

    if (!coordinates || coordinates.length === 0) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    // 1. Calculate Bounding Box of the Route + 0.02 degrees padding (~2km)
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    for (const [lat, lng] of coordinates) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const padding = 0.02;
    minLat -= padding;
    maxLat += padding;
    minLng -= padding;
    maxLng += padding;

    // 2. Fetch incidents within bounding box
    // This is vastly faster than calculating distance for every single incident in the DB
    const nearbyIncidents = await prisma.incidentReport.findMany({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLng, lte: maxLng },
      },
      select: { latitude: true, longitude: true, severity: true },
    });

    // 3. Segment the route and calculate actual risk score per segment
    const segSize = Math.max(5, Math.floor(coordinates.length / 20));
    const segmentScores = [];

    // Base default segment score if totally clear of incidents
    const BASE_CLEAR_SCORE = 85; 

    for (let i = 0; i < coordinates.length - 1; i += segSize) {
      const segment = coordinates.slice(i, i + segSize + 1);
      
      // Calculate center of this segment to check for incidents
      const midIdx = Math.floor(segment.length / 2);
      const centerLat = segment[midIdx][0];
      const centerLng = segment[midIdx][1];

      // Find incidents within 1km of this segment
      let riskPenalty = 0;
      for (const incident of nearbyIncidents) {
        const dist = getDistance(centerLat, centerLng, incident.latitude, incident.longitude);
        if (dist <= 1000) {
          // Closer incidents = higher penalty, higher severity = higher penalty
          // E.g., severity 8 at 200m -> (1000-200)/1000 * 8 * 2 = 12.8 penalty
          const weight = (1000 - dist) / 1000;
          riskPenalty += weight * incident.severity * 1.5;
        }
      }

      const finalScore = Math.max(0, Math.min(100, BASE_CLEAR_SCORE - riskPenalty));

      segmentScores.push({
        startIndex: i,
        endIndex: i + segSize,
        score: Math.round(finalScore)
      });
    }

    return NextResponse.json({
      success: true,
      totalIncidentsInBoundingBox: nearbyIncidents.length,
      segments: segmentScores
    });
    
  } catch (error: any) {
    console.error("Route Safety Calculation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
