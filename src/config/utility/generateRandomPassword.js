function generateRandomPassword(length) {
    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numericChars = "0123456789";
    const specialChars = "@#$%&*()?";
  
    const allChars =
      lowercaseChars + uppercaseChars + numericChars + specialChars;
  
    if (length < 4) {
      throw new Error("Password length must be at least 4 characters");
    }
  
    // Initialize the password with one character of each type
    let password = [
      lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)),
      uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length)),
      numericChars.charAt(Math.floor(Math.random() * numericChars.length)),
      specialChars.charAt(Math.floor(Math.random() * specialChars.length)),
    ];
  
    // Fill the remaining characters randomly
    for (let i = 4; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allChars.length);
      password.push(allChars.charAt(randomIndex));
    }
  
    // Shuffle the password to ensure randomness
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }
  
    return password.join("");
  }
  
  module.exports = { generateRandomPassword };
  