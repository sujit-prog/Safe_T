import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/user/contacts?userId=xyz
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const contacts = await prisma.guardianConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("Fetch Contacts Error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// POST /api/user/contacts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, guardianName, phoneNumber } = body;

    if (!userId || !guardianName || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newContact = await prisma.guardianConnection.create({
      data: {
        userId,
        guardianName,
        phoneNumber,
        guardianStatus: "Online", // default
      },
    });

    return NextResponse.json({ success: true, contact: newContact });
  } catch (error: any) {
    console.error("Add Contact Error:", error);
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
}

// DELETE /api/user/contacts?id=xyz
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
    }

    await prisma.guardianConnection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Contact Error:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
