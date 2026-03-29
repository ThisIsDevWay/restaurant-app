/**
 * Construye el string estándar de Pago Móvil para clipboard.
 * Este formato es compatible con la función "Pegar datos" de la BDVApp
 * y otras apps bancarias venezolanas.
 *
 * Formato SMS estándar: Pagar [bankCode] [phone] [cedula/RIF] [monto]
 * Ejemplo: "Pagar 0105 04141234567 V12345678 150,00"
 */
export function buildPagoMovilClipboard(opts: {
    bankName: string;
    bankCode: string;
    phone: string;
    rifOrCedula: string;
    amountBsCents: number;
}): string {
    // 1. Limpieza base
    const code = opts.bankCode.replace(/\D/g, "");
    const phoneClean = opts.phone.replace(/\D/g, "");
    const rifClean = opts.rifOrCedula.replace(/[.\-\s]/g, "");

    // 2. Formateo exacto estilo Mercantil Tpago Share (ej. "V-20.084.624")
    const idMatch = rifClean.match(/^([a-zA-Z])(\d+)$/);
    let idFormatted = rifClean;
    if (idMatch) {
        const letter = idMatch[1].toUpperCase();
        const numStr = parseInt(idMatch[2], 10).toString();
        const numFormatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        idFormatted = `${letter}-${numFormatted}`;
    } else {
        idFormatted = rifClean.replace(/^([VEJGP])(\d+)$/i, "$1-$2").toUpperCase();
    }

    // 3. Formateo exacto teléfono Mercantil (ej. "0424-630.23.23")
    const phoneMatch = phoneClean.match(/^(\d{4})(\d{3})(\d{2})(\d{2})$/);
    const phoneFormatted = phoneMatch
        ? `${phoneMatch[1]}-${phoneMatch[2]}.${phoneMatch[3]}.${phoneMatch[4]}`
        : phoneClean;

    // 4. Monto en bolívares exacto Mercantil (ej. "3.000,00")
    const amountBs = opts.amountBsCents / 100;
    const parts = amountBs.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const amountFormatted = parts.join(",");

    // Monto en formato SMS sin separador de miles (ej. "3000,00")
    const amountSms = amountBs.toFixed(2).replace(".", ",");

    // 5. Construcción del bloque Mercantil (Idéntico a su botón "Compartir")
    const mercantilBlock = [
        "Documento de identidad:",
        idFormatted,
        "Teléfono celular:",
        phoneFormatted,
        "Banco:",
        `${code} - ${opts.bankName}`,
        "Monto (Bs.):",
        amountFormatted,
    ].join("\n");

    // 6. Formato SMS añadido al final (reconocido nativamente por BDVApp)
    const smsBlock = `Pagar ${code} ${phoneClean} ${rifClean} ${amountSms}`;

    // Combinar ambos garantiza que funcionará en Mercantil (leyendo el primer bloque)
    // y en BDVApp/Banesco (leyendo el Regex del formato Pagar final).
    return `${mercantilBlock}\n\n\n${smsBlock}`;
}
