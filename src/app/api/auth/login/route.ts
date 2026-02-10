import { NextRequest, NextResponse } from "next/server";

// Simple in-memory user storage for MVP
// In production, replace with proper database
const users = new Map<string, { name: string; email: string; password: string }>();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user exists (in production, query database)
    const user = users.get(email);
    
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    // Return user data and token
    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}