import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tripId, lat, lng } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
    }

    // Update trip to SOS status with latest coordinates
    const trip = await prisma.activeTrip.update({
      where: { id: tripId },
      data: {
        status: "SOS",
        currentLat: lat ?? undefined,
        currentLng: lng ?? undefined,
        sosTriggerCount: { increment: 1 },
        lastPing: new Date(),
      },
      include: { user: { include: { guardianConnections: true } } },
    });

    // Simulate real-time dispatch of SOS alerts to all guardian contacts
    const guardians = trip.user.guardianConnections;
    const userName = trip.user.name || "Friend";
    console.log(`\n🚨🚨🚨 [SOS DISPATCH ALERT] 🚨🚨🚨`);
    console.log(`User: ${userName} (${trip.user.email}) has triggered emergency SOS!`);
    console.log(`Current Location: Lat ${lat ?? "Unknown"}, Lng ${lng ?? "Unknown"}`);
    console.log(`Dispatched real-time alerts to ${guardians.length} contacts:`);
    for (const g of guardians) {
      const mockPhone = "+91 98765 " + Math.floor(10000 + Math.random() * 90000);
      console.log(`  ✉️  SMS Sent to ${g.guardianName} (${mockPhone})`);
      console.log(`     Content: "ALERT! ${userName} has triggered SOS near ${lat?.toFixed(4) ?? '?'}, ${lng?.toFixed(4) ?? '?'}. Track live: http://safe-t.app/tracking/${trip.id}"`);
    }
    console.log(`🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n`);

    // Find nearest Safe Anchor
    const anchors = await prisma.safeAnchor.findMany({ take: 10 });

    let nearestAnchor = null;
    let minDist = Infinity;

    if (lat && lng) {
      for (const anchor of anchors) {
        const d = Math.sqrt(
          Math.pow(anchor.latitude - lat, 2) + Math.pow(anchor.longitude - lng, 2)
        );
        if (d < minDist) {
          minDist = d;
          nearestAnchor = anchor;
        }
      }
    }

    return NextResponse.json({
      success: true,
      trip,
      guardians: trip.user.guardianConnections,
      nearestAnchor,
      emergencyNumbers: {
        police: "100",
        ambulance: "108",
        fire: "101",
        womensHelpline: "181",
      },
    });
  } catch (error) {
    console.error("SOS error:", error);
    return NextResponse.json({ error: "SOS dispatch failed" }, { status: 500 });
  }
}
