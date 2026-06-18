import { NextRequest, NextResponse } from "next/server";

// Stockage temporaire des codes (en production utiliser Redis/KV)
const codes: Record<string, { code: string; expires: number }> = {};

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Générer code 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Stocker le code
  codes[email.toLowerCase()] = { code, expires };

  // Envoyer l'email via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@mail.belles-soeurs.com",
      to: email,
      subject: "Votre code de connexion — Belles Sœurs",
      html: `
        <div style="font-family: Georgia, serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; background: #F5F0E8;">
          <div style="font-size: 10px; letter-spacing: 0.2em; color: #8B7355; text-transform: uppercase; margin-bottom: 24px;">
            belles sœurs · france
          </div>
          <h1 style="font-size: 22px; color: #2C1A0E; font-weight: 400; margin-bottom: 16px;">
            Votre code de connexion
          </h1>
          <p style="color: #5C3D1E; font-size: 14px; margin-bottom: 32px;">
            Utilisez ce code pour accéder à votre dashboard. Il expire dans 10 minutes.
          </p>
          <div style="font-size: 36px; font-weight: 700; color: #2C1A0E; letter-spacing: 0.3em; text-align: center; padding: 24px; background: white; border-radius: 12px;">
            ${code}
          </div>
          <p style="color: #8B7355; font-size: 11px; margin-top: 24px; text-align: center;">
            Si vous n'avez pas demandé ce code, ignorez cet email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export function GET() {
  return NextResponse.json({ codes }); // debug only — à supprimer en prod
}
