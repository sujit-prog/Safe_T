import { NextRequest, NextResponse } from "next/server";

// Simple in-memory user storage for MVP
// In production, replace with proper database (MongoDB, PostgreSQL, etc.)
const users = new Map<string, { name: string; email: string; password: string }>();

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.has(email)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // In production: Hash password with bcrypt before storing
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Store user (in production, save to database)
    users.set(email, { name, email, password });

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    // Return user data and token
    return NextResponse.json({
      user: {
        name,
        email,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}