// utils/generateRandomWithSpecialKey.js
import crypto from "crypto";

/**
 * Generate 60-character random code that contains SPECIAL_KEY at random position
 * @param {string} specialKey - e.g. "MehediHassan"
 * @param {number} totalLength - e.g. 60
 * @returns {string} 60-char string with specialKey inside
 */
export function generateRandomCodeWithSpecialKey(specialKey, totalLength = 60) {
  if (!specialKey || specialKey.length >= totalLength) {
    throw new Error("SPECIAL_KEY too long for totalLength");
  }

  const remainingLength = totalLength - specialKey.length;

  // generate random alphanumeric characters for remaining length
  const randomBytes = crypto.randomBytes(Math.ceil(remainingLength / 2));
  let randomStr = randomBytes.toString("hex").slice(0, remainingLength);

  // insert SPECIAL_KEY at a random position
  const insertPos = Math.floor(Math.random() * (remainingLength + 1));
  const left = randomStr.slice(0, insertPos);
  const right = randomStr.slice(insertPos);

  const finalCode = left + specialKey + right;

  // ensure exact length 60
  return finalCode.padEnd(totalLength, "X").slice(0, totalLength);
}
