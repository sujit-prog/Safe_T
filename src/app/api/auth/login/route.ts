import { NextRequest, NextResponse } from "next/server";
import { users } from "../_store";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = users.get(email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();

    // ✅ CREATE RESPONSE OBJECT
    const response = NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
    });

    // ✅ SET COOKIE HERE
    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
