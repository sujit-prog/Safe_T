import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, startLocation, endLocation, startLat, startLng, endLat, endLng } = body;

    if (!userId || !startLocation || !endLocation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Mark any previous ACTIVE trips as COMPLETED
    await prisma.activeTrip.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "COMPLETED" },
    });

    const trip = await prisma.activeTrip.create({
      data: {
        userId,
        startLocation,
        endLocation,
        startLat: startLat ?? 0,
        startLng: startLng ?? 0,
        endLat: endLat ?? 0,
        endLng: endLng ?? 0,
        currentLat: startLat ?? 0,
        currentLng: startLng ?? 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error("Trip start error:", error);
    return NextResponse.json({ error: "Failed to start trip" }, { status: 500 });
  }
}
