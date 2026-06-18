import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, code, sentCode } = await req.json();

  if (!email || !code || !sentCode) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  if (code !== sentCode) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }

  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");
  return NextResponse.json({ success: true, token, email });
}
