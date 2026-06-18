import { NextRequest, NextResponse } from "next/server";

const SAH_BASE = "https://api.sellingathome.com";
const TOKEN = process.env.SAH_TOKEN!;
const SECRET_KEY = process.env.SAH_SECRET_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint requis" }, { status: 400 });
  }

  const sahParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") sahParams.append(key, value);
  });

  const url = `${SAH_BASE}${endpoint}${sahParams.toString() ? "?" + sahParams.toString() : ""}`;

  const res = await fetch(url, {
    headers: {
      TOKEN,
      SECRET_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SAH error:", err);
    return NextResponse.json({ error: "Erreur SAH" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
