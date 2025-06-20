import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();

const getTextDecoder = () => {
    if (typeof TextDecoder !== "undefined") {
        return TextDecoder;
    }
    // Node.js polyfill
    return require("util").TextDecoder;
};

const getTextEncoder = () => {
    if (typeof TextEncoder !== "undefined") {
        return TextEncoder;
    }
    // Node.js polyfill
    return require("util").TextEncoder;
};

/**
 *  Compatible with Cryptr v4's AES-256-CTR encryption format
 */
export async function decrypt(encryptedData: string, encryptionKey: string): Promise<string> {
    try {
        // Cryptr v4 uses hex encoding by default
        const encryptedBuffer = hexToArrayBuffer(encryptedData);

        // Cryptr v4 format: [16-byte IV][encrypted data]
        if (encryptedBuffer.byteLength < 16) {
            throw new Error("Invalid encrypted data: too short");
        }

        // Extract IV (first 16 bytes)
        const iv = new Uint8Array(encryptedBuffer.slice(0, 16));

        // Extract encrypted content (remaining bytes)
        const encryptedContent = encryptedBuffer.slice(16);

        // Generate key from string using simple SHA-256 hash (Cryptr v4 approach)
        const key = await generateKeyFromString(encryptionKey);

        // Decrypt using AES-CTR
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-CTR",
                counter: iv,
                length: 128, // Counter block size in bits
            },
            key,
            encryptedContent
        );

        // Convert back to string
        const TextDecoderClass = getTextDecoder();
        return new TextDecoderClass("utf-8").decode(decryptedBuffer);
    } catch (error) {
        throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Generates a CryptoKey from a string using SHA-256 hash
 */
async function generateKeyFromString(keyString: string): Promise<CryptoKey> {
    const TextEncoderClass = getTextEncoder();

    // Convert string to ArrayBuffer
    const keyBuffer = new TextEncoderClass().encode(keyString);

    // Hash the key string with SHA-256 to get 256-bit key
    const hashedKey = await crypto.subtle.digest("SHA-256", keyBuffer);

    // Import the hashed key for AES-CTR
    return await crypto.subtle.importKey("raw", hashedKey, { name: "AES-CTR" }, false, ["encrypt", "decrypt"]);
}

/**
 * Converts hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
    // Remove any spaces and ensure even length
    const cleanHex = hex.replace(/\s/g, "").toLowerCase();
    if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string: odd length");
    }

    // Validate hex characters
    if (!/^[0-9a-f]*$/.test(cleanHex)) {
        throw new Error("Invalid hex string: contains non-hex characters");
    }

    const bytes = new Uint8Array(cleanHex.length / 2);

    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }

    return bytes.buffer;
}

/**
 * Compatible with Cryptr v4's AES-256-CTR encryption format
 */
export async function encrypt(plaintext: string, encryptionKey: string): Promise<string> {
    try {
        // Generate random IV (16 bytes for AES-CTR)
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // Generate key from string
        const key = await generateKeyFromString(encryptionKey);

        // Encrypt the plaintext
        const TextEncoderClass = getTextEncoder();
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: "AES-CTR",
                counter: iv,
                length: 128,
            },
            key,
            new TextEncoderClass().encode(plaintext)
        );

        // Combine IV and encrypted content: [IV][encrypted data]
        const combined = new Uint8Array(16 + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), 16);

        // Convert to hex string (same as Cryptr v4 output format)
        return arrayBufferToHex(combined.buffer);
    } catch (error) {
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Converts ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}
