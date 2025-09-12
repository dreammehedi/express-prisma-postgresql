import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Ensure environment variables are set and valid
const encryptionKey = process.env.ENCRYPTION_KEY;
const encryptionIV = process.env.ENCRYPTION_IV;

if (!encryptionKey || encryptionKey.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must be defined in the environment variables and be 32 characters (256 bits) long!"
  );
}

if (!encryptionIV || encryptionIV.length !== 16) {
  throw new Error(
    "ENCRYPTION_IV must be defined in the environment variables and be 16 characters (128 bits) long!"
  );
}

// Convert the key and IV to buffers
const key = Buffer.from(encryptionKey, "utf8");
const iv = Buffer.from(encryptionIV, "utf8");
const algorithm = "aes-256-cbc"; // Common encryption algorithm

/**
 * Encrypts a plain text using AES-256-CBC.
 * @param {string} text - The plain text to encrypt.
 * @returns {string} - The encrypted text in hex format.
 */
const encrypt = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: text must be a non-empty string.");
  }

  try {
    // Create a cipher instance
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
  } catch (error) {
    throw new Error(
      "Encryption failed! Please check the input and configuration."
    );
  }
};

export default encrypt;
