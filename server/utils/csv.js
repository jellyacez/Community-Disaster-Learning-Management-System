// Excel and LibreOffice run a cell that starts with one of these as a formula (OWASP CSV injection)
const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell: null is "", formula starters get a leading ', and , " LF CR force quoting. */
function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  let s = String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

module.exports = { escapeCsv };
