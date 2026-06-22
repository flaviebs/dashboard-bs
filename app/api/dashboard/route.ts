import { NextRequest, NextResponse } from "next/server";

const SAH_BASE = "https://api.sellingathome.com";
const TOKEN = process.env.SAH_TOKEN!;
const SECRET_KEY = process.env.SAH_SECRET_KEY!;

async function sahGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${SAH_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { TOKEN, SECRET_KEY, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SAH error ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  try {
    let seller = null;
    let page = 1;
    while (!seller && page <= 20) {
      const sellers = await sahGet("/v1/Sellers", { page: page.toString(), offset: "500" });
      if (!sellers || sellers.length === 0) break;
      seller = sellers.find((s: any) =>
        s.Email?.toLowerCase().trim() === email.toLowerCase().trim()
      );
      if (sellers.length < 500) break;
      page++;
    }

    if (!seller) return NextResponse.json({ error: "Consultante non trouvée" }, { status: 404 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let ordersPage = 1;
    let allOrders: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const orders = await sahGet("/v1/Orders", { page: ordersPage.toString(), offset: "100" });
      if (!orders || orders.length === 0) { hasMore = false; break; }
      allOrders = allOrders.concat(orders);
      if (orders.length < 100) hasMore = false;
      ordersPage++;
      if (ordersPage > 30) break;
    }

    const myOrders = allOrders.filter((o: any) => {
      if (!o.PaidDate || !o.Paid || o.Deleted) return false;
      const paidDate = new Date(o.PaidDate);
      if (paidDate < monthStart || paidDate > monthEnd) return false;
      return o.Seller?.Id === seller.Id;
    });

    let caPersonnel = 0;
    for (const order of myOrders) {
      for (const product of (order.Products || [])) {
        if (!product.UncommissionedProduct && product.PriceExcltax > 0) {
          caPersonnel += product.PriceExcltax * (product.Quantity || 1);
        }
      }
      if (order.DiscountAmountExclTax > 0) {
        caPersonnel -= order.DiscountAmountExclTax;
      }
    }
    caPersonnel = Math.max(0, Math.round(caPersonnel * 100) / 100);

    return NextResponse.json({
      seller: {
        id: seller.Id,
        prenom: seller.FirstName,
        nom: seller.LastName,
        email: seller.Email,
        dateDebut: seller.StartActivityDate,
      },
      caPersonnel,
      caEquipe: caPersonnel,
      horsLignePlusFort: 0,
      mois: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    });

  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
