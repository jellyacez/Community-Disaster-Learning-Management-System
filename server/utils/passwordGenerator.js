const crypto = require("crypto");

/** 12 chars with at least one upper, lower, digit and symbol, shuffled with a crypto RNG. */
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
  
  const arr = pass.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr.join('');
}

module.exports = { generateSecurePassword };
