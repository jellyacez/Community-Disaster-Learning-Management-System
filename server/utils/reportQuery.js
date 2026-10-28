const Joi = require("joi");

// Shared by the MDRRMO and barangay accomplishment report exports
const MAX_REPORT_DAYS = 366 * 3;

// Rejects impossible dates like 2026-02-30 instead of rolling them over
const calendarDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((v, helpers) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : helpers.error("any.invalid");
  });

// Validates ?from=&to=&sheets= for a report. `sheets` is comma-separated: omitted means
// every optional sheet, empty means Summary only. Returns { error } or { from, to, sheets }.
function parseReportQuery(query, optionalSheets) {
  const sheetName = `(${optionalSheets.join("|")})`;
  const { error, value } = Joi.object({
    from: calendarDate.required(),
    to: calendarDate.required(),
    sheets: Joi.string().allow("").pattern(new RegExp(`^${sheetName}(,${sheetName})*$`)),
  }).validate(query, { stripUnknown: true });
  if (error) return { error: "Provide valid from and to dates (YYYY-MM-DD) and sheet names." };

  const { from, to } = value;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (days < 0) return { error: "The start date must be on or before the end date." };
  if (days > MAX_REPORT_DAYS) return { error: "The reporting period can be at most 3 years." };

  const sheets = new Set(value.sheets === undefined ? optionalSheets : value.sheets.split(",").filter(Boolean));
  return { from, to, sheets };
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

module.exports = { parseReportQuery, XLSX_TYPE };
