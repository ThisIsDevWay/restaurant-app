import crypto from "crypto";

/**
 * Cifra un mensaje usando AES-128-ECB con PKCS5Padding
 * y una clave generada a partir de los primeros 16 bytes del SHA-256 de secretKey.
 * Requerido por Mercantil API para datos sensibles como números de teléfono.
 *
 * @param message El string a cifrar
 * @param secretKey La clave secreta (terminal secret) entregada por Mercantil
 * @returns El string cifrado en formato Base64
 */
export function mercantilEncrypt(message: string, secretKey: string): string {
    const algorithm = "aes-128-ecb";

    // Convertir la llave secreta en un hash SHA256
    const hash = crypto.createHash("sha256");
    hash.update(secretKey);

    // Obtener los primeros 16 bytes del hash (mitad del string hex)
    const keyString = hash.digest("hex");
    const firstHalf = keyString.slice(0, keyString.length / 2);
    const keyHex = Buffer.from(firstHalf, "hex");

    // Encriptación del mensaje usando la clave nueva
    const cipher = crypto.createCipheriv(algorithm, keyHex, null);

    let ciphertext = cipher.update(message, "utf8", "base64");
    ciphertext += cipher.final("base64");

    return ciphertext; // Valor devuelto en base64
}

/**
 * Descifra un mensaje usando AES-128-ECB con la clave generada
 * a partir de los primeros 16 bytes del SHA-256 de secretKey.
 *
 * @param ciphertext El string cifrado en formato Base64
 * @param secretKey La clave secreta (terminal secret) entregada por Mercantil
 * @returns El string original descifrado
 */
export function mercantilDecrypt(ciphertext: string, secretKey: string): string {
    const algorithm = "aes-128-ecb";

    // Convertir la llave secreta en un hash SHA256
    const hash = crypto.createHash("sha256");
    hash.update(secretKey);

    // Obtener los primeros 16 bytes del hash (mitad del string hex)
    const keyString = hash.digest("hex");
    const firstHalf = keyString.slice(0, keyString.length / 2);
    const keyHex = Buffer.from(firstHalf, "hex");

    // Desencriptación del mensaje usando la clave nueva
    const decipher = crypto.createDecipheriv(algorithm, keyHex, null);

    let deciphertext = decipher.update(ciphertext, "base64", "utf8");
    deciphertext += decipher.final("utf8");

    return deciphertext; // Valor devuelto en utf8
}
