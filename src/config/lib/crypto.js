const crypto = require("crypto");
const { config } = require("../env/default.js");

function encryptData(dataToEncrypt) {
  try {
    if (!config.cryptoAlgorithm || !config.cryptoPassword || !config.cryptoSalt) {
      throw new Error("Encryption configuration is incomplete.");
    }

    // Derive a secure key from the password and salt
    const key = crypto.scryptSync(config.cryptoPassword, config.cryptoSalt, 32);

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create a cipher object with aes-256-gcm algorithm
    const cipher = crypto.createCipheriv(config.cryptoAlgorithm, key, iv);

    // Encrypt the data and get the authentication tag
    let encryptedData = cipher.update(dataToEncrypt.toString());
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);
    const tag = cipher.getAuthTag();

    // Return the encrypted data, IV, and tag as a buffer
    return Buffer.concat([iv, encryptedData, tag]);
  } catch (error) {
    console.error("Encryption failed:", error.message);
    throw error; // Re-throw the error for the caller to handle, if needed
  }
}

function decryptData(dataToDecrypt) {

  try {
    if (!config.cryptoAlgorithm || !config.cryptoPassword || !config.cryptoSalt) {
      throw new Error("Decryption configuration is incomplete.");
    }

    // Extract the IV, encrypted data, and tag from the buffer
    const iv = dataToDecrypt.slice(0, 16);
    const encryptedData = dataToDecrypt.slice(16, -16);
    const tag = dataToDecrypt.slice(-16);

    // Derive the same key from the password and salt
    const key = crypto.scryptSync(config.cryptoPassword, config.cryptoSalt, 32);

    // Create a decipher object with the same algorithm, key, and IV
    const decipher = crypto.createDecipheriv(config.cryptoAlgorithm, key, iv);

    // Set the authentication tag
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decryptedData = decipher.update(encryptedData);
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);

    // Return the decrypted data as a buffer
    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    throw error; // Re-throw the error for the caller to handle, if needed
  }
}

module.exports = { decryptData, encryptData };
