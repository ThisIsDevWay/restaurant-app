import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Route Handler para ofuscar las URLs de Supabase.
 * En WhatsApp enviaremos: /api/view-comprobante/[orderId]
 * Este servicio busca la URL real en la DB y redirige.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    try {
        const [order] = await db
            .select({ paymentMetadata: orders.paymentMetadata })
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order || !order.paymentMetadata) {
            return new NextResponse("Comprobante no encontrado", { status: 404 });
        }

        // El paymentMetadata para comprobantes manuales guarda { uploadedUrl: "..." }
        const metadata = order.paymentMetadata as { uploadedUrl?: string };
        const realUrl = metadata.uploadedUrl;

        if (!realUrl) {
            return new NextResponse("URL de comprobante no disponible", { status: 404 });
        }

        // Proxy de la imagen: en lugar de redirigir, descargamos y servimos el contenido
        const response = await fetch(realUrl);
        
        if (!response.ok) {
            return new NextResponse("Error al recuperar la imagen", { status: 502 });
        }

        const blob = await response.blob();
        
        return new NextResponse(blob, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "image/webp",
                "Cache-Control": "public, max-age=31536000, immutable", // Cache por 1 año
            },
        });
    } catch (error) {
        console.error("Error proxying comprobante:", error);
        return new NextResponse("Error interno", { status: 500 });
    }
}
