import { NextResponse } from "next/server";
import { getCustomerByPhone } from "@/db/queries/customers";
import { rateLimiters, getIP } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getIP(req);
  const { success } = await rateLimiters.lookup.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");

  if (!phone || !/^(0414|0424|0412|0416|0426)\d{7}$/.test(phone)) {
    return NextResponse.json({ found: false });
  }

  try {
    const customer = await getCustomerByPhone(phone);
    if (!customer) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      name: customer.name,
      cedula: customer.cedula,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 },
    );
  }
}
