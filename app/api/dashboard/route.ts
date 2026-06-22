import { NextRequest, NextResponse } from "next/server";

const SAH_BASE = "https://api.sellingathome.com";
const TOKEN = process.env.SAH_TOKEN!;
const SECRET_KEY = process.env.SAH_SECRET_KEY!;
const AIRTABLE_BASE = "app5aYHsfYw6LWjfx";
const AIRTABLE_TABLE = "tblDjOuPCUO0KQ9e4";
const AIRTABLE_KEY = process.env.AIRTABLE_KEY!;

const FLD_EMAIL     = "fldfMPxGzovO8YDBl";
const FLD_SELLER_ID = "fldpAiKqpbVylsF0K";
const FLD_IS_ACTIVE = "fld4atG2k1AKXxSur";

async function sahGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${SAH_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { TOKEN, SECRET_KEY, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`SAH error ${res.status}`);
  return res.json();
}

async function getSellerFromAirtable(email: string): Promise<{ sahId: number; isActive: boolean } | null> {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`);
  url.searchParams.set("filterByFormula", `{${FLD_EMAIL}} = "${email.toLowerCase()}"`);
  url.searchParams.set("fields[]", FLD_SELLER_ID);
  url.searchParams.set("fields[]", FLD_IS_ACTIVE);
  url.searchParams.set("maxRecords", "1");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Airtable error ${res.status}`);
  const data = await res.json();
  if (!data.records || data.records.length === 0) return null;

  const fields = data.records[0].fields;
  return {
    sahId: fields[FLD_SELLER_ID],
    isActive: fields[FLD_IS_ACTIVE] === true,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  try {
    // 1. Lookup Airtable → sahId
    const airtableResult = await getSellerFromAirtable(email);
    if (!airtableResult) {
      return NextResponse.json({ error: "Consultante non trouvée" }, { status: 404 });
    }
    if (!airtableResult.isActive) {
      return NextResponse.json({ error: "Compte inactif" }, { status: 403 });
    }

    // 2. Récupérer le seller SAH par son Id interne
    const seller = await sahGet(`/v1/Sellers/${airtableResult.sahId}`);

    // 3. Récupérer les commandes du mois en cours
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let ordersPage = 1;
    let allOrders: any[] = [];
    let hasMore = true;
    while (hasMore) {
      const orders = await sahGet("/v1/Orders", {
        page: ordersPage.toString(),
        offset: "100",
      });
      if (!orders || orders.length === 0) { hasMore = false; break; }
      allOrders = allOrders.concat(orders);
      if (orders.length < 100) hasMore = false;
      ordersPage++;
      if (ordersPage > 30) break;
    }

    // 4. Filtrer commandes de ce seller ce mois
    const myOrders = allOrders.filter((o: any) => {
      if (!o.PaidDate || !o.Paid || o.Deleted) return false;
      const paidDate = new Date(o.PaidDate);
      if (paidDate < monthStart || paidDate > monthEnd) return false;
      return o.Seller?.Id === seller.Id;
    });

    // 5. Calculer CA HT commissionnable
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
        sellerDisplayId: seller.SellerDisplayId,
        prenom: seller.FirstName,
        nom: seller.LastName,
        email: seller.Email,
        statut: seller.Status,
        dateDebut: seller.StartActivityDate,
        isActive: seller.IsActive,
      },
      caPersonnel,
      caEquipe: caPersonnel, // à brancher plus tard
      horsLignePlusFort: 0,
      mois: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    });

  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
