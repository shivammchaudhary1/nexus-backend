const { encryptData, decryptData } = require("../lib/crypto.js");

function createSession(userId, currentUserAgent){
    const sessionId = encryptData(userId).toString("hex");
    const userAgent = encryptData(currentUserAgent.toString()).toString("hex");
    return {sessionId: `${sessionId}.${userAgent}`, maxAge: 86400000 * 2};
}

function decodeSession(sessionId, currentUserAgent){
    const [userData, encryptedUserAgent] = sessionId.split(".");
    const userAgent = decryptData(Buffer.from(encryptedUserAgent, "hex")).toString();
    const userId = decryptData(Buffer.from(userData, "hex")).toString();

    if ((currentUserAgent !== userAgent) || !userId) {
        return {error: "invalid session"};
    }
    return {userId}
}

module.exports = { createSession, decodeSession };