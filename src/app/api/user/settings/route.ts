import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET current settings
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    let settings = await prisma.userNotificationSettings.findUnique({ where: { userId } });
    if (!settings) {
      // Return defaults without creating
      settings = {
        id: "",
        userId,
        alertThreshold: "MEDIUM",
        sosInactivitySecs: 60,
        nightModeEnabled: true,
        updatedAt: new Date(),
      };
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// PUT update settings
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, alertThreshold, sosInactivitySecs, nightModeEnabled } = body;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        alertThreshold: alertThreshold ?? "MEDIUM",
        sosInactivitySecs: sosInactivitySecs ?? 60,
        nightModeEnabled: nightModeEnabled ?? true,
      },
      update: {
        ...(alertThreshold !== undefined && { alertThreshold }),
        ...(sosInactivitySecs !== undefined && { sosInactivitySecs }),
        ...(nightModeEnabled !== undefined && { nightModeEnabled }),
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
