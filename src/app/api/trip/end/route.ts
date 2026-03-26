import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tripId } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
    }

    const trip = await prisma.activeTrip.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error("Trip end error:", error);
    return NextResponse.json({ error: "Failed to end trip" }, { status: 500 });
  }
}
