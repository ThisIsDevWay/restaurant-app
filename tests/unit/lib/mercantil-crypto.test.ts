import { describe, it, expect } from "vitest";
import { mercantilEncrypt, mercantilDecrypt } from "@/lib/payment-providers/mercantil-crypto";
import crypto from "crypto";

describe("Mercantil Crypto Module (AES-128-ECB)", () => {
    const secretKey = "test-secret-key-123";
    const message = "04141234567";

    it("should encrypt and decrypt correctly (roundtrip)", () => {
        const encrypted = mercantilEncrypt(message, secretKey);
        const decrypted = mercantilDecrypt(encrypted, secretKey);

        expect(decrypted).toBe(message);
        expect(encrypted).not.toBe(message);
    });

    it("should output valid base64", () => {
        const encrypted = mercantilEncrypt(message, secretKey);
        // valid base64 regex
        expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should throw error if decrypting invalid base64", () => {
        expect(() => mercantilDecrypt("invalid-base64!!", secretKey)).toThrow();
    });

    it("should produce the exact expected cipher given a hardcoded secret", () => {
        // We recreate the keys manually just to double check against the function
        const alg = "aes-128-ecb";
        const hash = crypto.createHash("sha256").update(secretKey).digest("hex");
        const keyString = hash.slice(0, hash.length / 2);
        const keyHex = Buffer.from(keyString, "hex");
        const cipher = crypto.createCipheriv(alg, keyHex, null);

        let expected = cipher.update(message, "utf8", "base64");
        expected += cipher.final("base64");

        const result = mercantilEncrypt(message, secretKey);
        expect(result).toBe(expected);
    });
});
