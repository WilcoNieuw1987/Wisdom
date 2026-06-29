import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { password } = await req.json();
  const correctPassword = process.env.APP_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json({ error: "APP_PASSWORD not set" }, { status: 500 });
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("wisdom-auth", correctPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dagen
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
