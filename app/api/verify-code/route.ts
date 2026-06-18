import { NextRequest, NextResponse } from "next/server";

const codes: Record<string, { code: string; expires: number }> = {};

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Email et code requis" }, { status: 400 });
  }

  const stored = codes[email.toLowerCase()];

  if (!stored) {
    return NextResponse.json({ error: "Code non trouvé" }, { status: 400 });
  }

  if (Date.now() > stored.expires) {
    delete codes[email.toLowerCase()];
    return NextResponse.json({ error: "Code expiré" }, { status: 400 });
  }

  if (stored.code !== code) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }

  // Code valide — supprimer et retourner token
  delete codes[email.toLowerCase()];
  
  // Token simple = email encodé en base64 + timestamp
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

  return NextResponse.json({ success: true, token, email });
}
