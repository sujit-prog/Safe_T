import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { tripId, currentLat, currentLng } = body;

    if (!tripId || currentLat === undefined || currentLng === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const trip = await prisma.activeTrip.update({
      where: { id: tripId },
      data: {
        currentLat,
        currentLng,
        lastPing: new Date(),
      },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error("Trip update error:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}
