const crypto = require("crypto");

/**
 * Generates a robust 12-character password that passes strict enterprise policies.
 * Contains at least one uppercase letter, one lowercase letter, one number, and one special character.
 * Characters are shuffled using a cryptographically secure Fisher-Yates shuffle.
 * @returns {string} The generated password.
 */
function generateSecurePassword() {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const num = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + num + special;
  
  let pass = "";
  pass += upper[crypto.randomInt(upper.length)];
  pass += lower[crypto.randomInt(lower.length)];
  pass += num[crypto.randomInt(num.length)];
  pass += special[crypto.randomInt(special.length)];
  
  for (let i = 0; i < 8; i++) {
    pass += all[crypto.randomInt(all.length)];
  }
  
  // Shuffle the characters cryptographically securely (Fisher-Yates)
  const arr = pass.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr.join('');
}

module.exports = { generateSecurePassword };
