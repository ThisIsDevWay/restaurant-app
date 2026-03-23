import { processCheckout } from "./src/actions/checkout";

async function test() {
    const result = await processCheckout(
        {
            phone: "04141234567",
            paymentMethod: "pago_movil",
            name: "Test User",
            items: [{ id: "505529f5-3008-4fab-9392-f9efa324b778", quantity: 1 }]
        },
        [
            {
                id: "505529f5-3008-4fab-9392-f9efa324b778", // Lomo salteado
                quantity: 1,
                fixedContornos: [
                    { id: "e10cfce7-2d4e-4f05-b076-79ef54737aa7", name: "Papas fritas", priceUsdCents: 0, priceBsCents: 0 }
                ],
                selectedAdicionales: [],
                selectedBebidas: [
                    { id: "fb7659a0-f203-4f9e-bab2-c178a946e3fb", name: "Coca Cola", priceUsdCents: 150, priceBsCents: 0 }
                ],
                removedComponents: [],
                categoryAllowAlone: true,
            }
        ]
    );

    console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
