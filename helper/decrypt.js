import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Convert the key and IV from environment variables
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

const key = Buffer.from(encryptionKey, "utf8");
const iv = Buffer.from(encryptionIV, "utf8");
const algorithm = "aes-256-cbc"; // Common encryption algorithm

/**
 * Decrypts the provided text using AES-256-CBC.
 * @param {string} encryptedText - The encrypted text to decrypt (hex-encoded).
 * @returns {string} - The decrypted plain text.
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== "string") {
    throw new Error("Invalid input: encryptedText must be a non-empty string.");
  }

  try {
    // Create the decipher instance
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    // Perform decryption
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      "Failed to decrypt the text. Ensure the encrypted data, key, and IV are correct."
    );
  }
};

export default decrypt;
