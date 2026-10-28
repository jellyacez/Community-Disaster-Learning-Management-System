const ExcelJS = require("exceljs");

const TZ = "Asia/Manila";
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
const SECTION_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
const TOTAL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const BORDER = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

const ROLE_LABELS = {
  super_admin: "Super Administrator",
  system_admin: "System Administrator",
  head_mdrrmo_admin: "Head, MDRRMO",
  mdrrmo_admin: "MDRRMO Administrator",
  barangay_admin: "Barangay Administrator",
};

const formatDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00+08:00`).toLocaleDateString("en-US", {
    timeZone: TZ, year: "numeric", month: "long", day: "numeric",
  });

const formatDateTime = (date) =>
  date.toLocaleString("en-US", {
    timeZone: TZ, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  });

// Rates are fractions (0-1); null means there was nothing to measure in the period
const rate = (v) => (v === null || v === undefined ? "—" : v);

// Excel stores dates without a timezone; keep the Manila calendar day
const toExcelDate = (d) =>
  d ? new Date(`${new Date(d).toLocaleDateString("en-CA", { timeZone: TZ })}T00:00:00Z`) : "—";

function addTitleBlock(ws, lastCol, { office, title, period, generated }) {
  const lines = [
    ["MUNICIPALITY OF BACOLOR", { bold: true, size: 14 }],
    [office, { bold: true, size: 12 }],
    [title, { bold: true, size: 12, color: { argb: "FFB91C1C" } }],
    [`Reporting period: ${period}`, { size: 10 }],
    [`Generated: ${generated}`, { size: 10, italic: true, color: { argb: "FF6B7280" } }],
  ];
  lines.forEach(([text, font], i) => {
    const row = i + 1;
    ws.mergeCells(row, 1, row, lastCol);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = font;
    cell.alignment = { horizontal: "center" };
  });
  return lines.length + 2; // first free row, leaving a blank line
}

function addSectionHeading(ws, rowNum, lastCol, text) {
  ws.mergeCells(rowNum, 1, rowNum, lastCol);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { bold: true, size: 11 };
  cell.fill = SECTION_FILL;
  return rowNum + 1;
}

// Excel never breaks a word across lines and the filter button covers ~3 characters,
// so widen each column to its longest header word and size the row to the wrapped lines.
const FILTER_BUTTON_CHARS = 3;
const LINE_HEIGHT_PT = 15;

function fitHeader(columns, { withFilter }) {
  const reserve = withFilter ? FILTER_BUTTON_CHARS : 1;
  let maxLines = 1;
  const widths = columns.map((col) => {
    const words = String(col.header).split(/\s+/);
    const width = Math.max(col.width || 10, Math.max(...words.map((w) => w.length)) + reserve + 1);
    const capacity = width - reserve - 1;
    let lines = 1;
    let used = 0;
    for (const w of words) {
      if (used && used + 1 + w.length > capacity) {
        lines += 1;
        used = w.length;
      } else {
        used += (used ? 1 : 0) + w.length;
      }
    }
    maxLines = Math.max(maxLines, lines);
    return width;
  });
  return { widths, height: maxLines * LINE_HEIGHT_PT + 6 };
}

// Writes a header row plus data rows; returns the row number after the table
function addTable(ws, startRow, columns, rows, { totals, headerHeight = 30 } = {}) {
  const header = ws.getRow(startRow);
  columns.forEach((col, i) => {
    const cell = header.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: col.align || "center", wrapText: true };
  });
  header.height = headerHeight;

  const writeRow = (rowNum, values, extra = {}) => {
    const row = ws.getRow(rowNum);
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      const value = values[col.key];
      cell.value = col.percent ? rate(value) : value;
      cell.border = BORDER;
      if (col.percent) cell.numFmt = "0.0%";
      if (col.date && value instanceof Date) cell.numFmt = "mmm d, yyyy";
      cell.alignment = {
        vertical: "top",
        horizontal: col.align || (typeof value === "string" && !col.percent ? "left" : "right"),
        wrapText: !!col.wrap,
      };
      if (extra.fill) cell.fill = extra.fill;
      if (extra.bold) cell.font = { bold: true };
    });
  };

  rows.forEach((r, i) => writeRow(startRow + 1 + i, r));
  let next = startRow + 1 + rows.length;
  if (totals) {
    writeRow(next, totals, { fill: TOTAL_FILL, bold: true });
    next += 1;
  }
  return next;
}

// Data sheets: title block, one table, frozen header and filter buttons
function addDataSheet(wb, name, meta, columns, rows, totals) {
  const ws = wb.addWorksheet(name, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const { widths, height } = fitHeader(columns, { withFilter: rows.length > 0 });
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitleBlock(ws, columns.length, { ...meta, title: `${meta.title} — ${name}` });
  addTable(ws, headerRow, columns, rows, { totals, headerHeight: height });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
  if (rows.length) {
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + rows.length, column: columns.length } };
  }
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  return ws;
}

const sum = (rows, key) => rows.reduce((acc, r) => acc + (r[key] || 0), 0);

// barangayName switches the report to a single barangay: its letterhead, the resident
// roster sheet, and the Punong Barangay as the noting official
async function buildMdrrmoReportWorkbook(
  data,
  { from, to, preparedBy, barangayName = null, sheets = new Set(["monthly", "barangays", "modules"]) },
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bacolor Disaster LMS Portal";
  wb.created = new Date();

  const barangayLabel =
    barangayName && (/^barangay\b/i.test(barangayName) ? barangayName : `Barangay ${barangayName}`);
  const meta = {
    office: barangayLabel || "Municipal Disaster Risk Reduction and Management Office",
    title: barangayLabel ? "Barangay Training Accomplishment Report" : "Training Accomplishment Report",
    period: `${formatDate(from)} – ${formatDate(to)}`,
    generated: `${formatDateTime(new Date())} by ${preparedBy.name}`,
  };
  const { summary: s, certificationStatus: c } = data;

  // --- Summary sheet ---
  const ws = wb.addWorksheet("Summary", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.getColumn(1).width = 42;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 62;
  const summaryCols = [
    { header: "Indicator", key: "label", align: "left" },
    { header: "Value", key: "value" },
    { header: "How it is counted", key: "note", align: "left", wrap: true },
  ];

  let row = addTitleBlock(ws, 3, meta);
  row = addSectionHeading(ws, row, 3, "A. Accomplishments during the reporting period");
  const accomplishments = [
    { label: "New resident registrations", value: s.new_residents, note: "Resident accounts created within the period." },
    { label: "Module enrollments", value: s.enrollments, note: "Residents who started a training module within the period." },
    { label: "Module completions", value: s.completions, note: "Modules residents finished within the period." },
    { label: "Certificates issued or renewed", value: s.certificates_issued, note: "Certificates whose issue date falls within the period, including renewals." },
    { label: "   of which: recertifications", value: s.recertifications, note: "Expired or expiring certificates renewed by passing the assessment again." },
    { label: "Assessment attempts", value: s.assessment_attempts, note: "Graded assessment submissions by residents." },
    { label: "Assessment pass rate", value: rate(s.pass_rate), note: "Share of assessment attempts that passed.", isRate: true },
    { label: "Average assessment score", value: rate(s.avg_score), note: "Mean of score ÷ total points across attempts.", isRate: true },
  ];
  const firstDataRow = row + 1;
  row = addTable(ws, row, summaryCols, accomplishments) + 1;
  accomplishments.forEach((a, i) => {
    if (a.isRate) {
      const cell = ws.getCell(firstDataRow + i, 2);
      cell.numFmt = "0.0%";
      cell.alignment = { ...cell.alignment, horizontal: "right" };
    }
  });

  row = addSectionHeading(ws, row, 3, "B. Program status (as of generation)");
  const statusRows = [
    { label: "Active registered residents", value: s.registered_residents, note: "Resident accounts registered by the end of the period that are not archived or banned." },
    ...(barangayLabel
      ? [
          { label: "Certified residents", value: s.certified_residents, note: "Active residents holding at least one valid certificate." },
          {
            label: "Preparedness rate",
            value: rate(s.registered_residents ? s.certified_residents / s.registered_residents : null),
            note: "Certified residents ÷ active registered residents.",
            isRate: true,
          },
        ]
      : []),
    { label: "Published training modules", value: s.published_modules, note: "Modules currently available to residents." },
    { label: "Active certificates", value: c.active, note: "Valid certificates of competency held by residents." },
    { label: "Certificates expiring within 30 days", value: c.expiring_30_days, note: "Active certificates due for recertification soon." },
    { label: "Expired certificates", value: c.expired, note: "Certificates past their validity that were not renewed." },
    { label: "Revoked certificates", value: c.revoked, note: "Certificates withdrawn by an administrator." },
  ];
  const firstStatusRow = row + 1;
  row = addTable(ws, row, summaryCols, statusRows) + 1;
  statusRows.forEach((r, i) => {
    if (r.isRate) {
      const cell = ws.getCell(firstStatusRow + i, 2);
      cell.numFmt = "0.0%";
      cell.alignment = { ...cell.alignment, horizontal: "right" };
    }
  });

  row = addSectionHeading(ws, row, 3, "C. Notes");
  [
    barangayLabel
      ? `Figures count residents of ${barangayLabel} only; administrator activity is excluded.`
      : "Figures count resident accounts only; administrator activity is excluded.",
    ...(sheets.size ? ["Further breakdowns are on the other sheets of this workbook."] : []),
  ].forEach((text) => {
    ws.mergeCells(row, 1, row, 3);
    ws.getCell(row, 1).value = `• ${text}`;
    ws.getCell(row, 1).alignment = { wrapText: true };
    row += 1;
  });

  // Signature block
  row += 2;
  ws.getCell(row, 1).value = "Prepared by:";
  ws.getCell(row, 3).value = "Noted by:";
  row += 3;
  const nameLine = { top: { style: "thin", color: { argb: "FF000000" } } };
  ws.getCell(row, 1).value = preparedBy.name;
  ws.getCell(row, 1).font = { bold: true };
  ws.getCell(row, 1).border = nameLine;
  ws.getCell(row, 3).border = nameLine;
  ws.getCell(row, 1).alignment = { horizontal: "center" };
  row += 1;
  ws.getCell(row, 1).value = ROLE_LABELS[preparedBy.role] || "Administrator";
  ws.getCell(row, 3).value = barangayLabel ? "Punong Barangay" : "MDRRMO Head";
  ws.getCell(row, 1).alignment = { horizontal: "center" };
  ws.getCell(row, 3).alignment = { horizontal: "center" };
  row += 1;
  ws.getCell(row, 1).value = `Date: ${formatDate(new Date().toLocaleDateString("en-CA", { timeZone: TZ }))}`;
  ws.getCell(row, 3).value = "Date: ____________________";
  ws.getCell(row, 1).alignment = { horizontal: "center" };
  ws.getCell(row, 3).alignment = { horizontal: "center" };

  // --- Monthly sheet ---
  const monthlyCols = [
    { header: "Month", key: "month", width: 14, align: "left" },
    { header: "New Residents", key: "new_residents", width: 14 },
    { header: "Enrollments", key: "enrollments", width: 13 },
    { header: "Completions", key: "completions", width: 13 },
    { header: "Certificates Issued / Renewed", key: "certificates_issued", width: 16 },
    { header: "Assessment Attempts", key: "assessment_attempts", width: 14 },
    { header: "Pass Rate", key: "pass_rate", width: 11, percent: true },
  ];
  if (sheets.has("monthly")) addDataSheet(wb, "Monthly", meta, monthlyCols, data.monthly, {
    month: "TOTAL",
    new_residents: s.new_residents,
    enrollments: s.enrollments,
    completions: s.completions,
    certificates_issued: s.certificates_issued,
    assessment_attempts: s.assessment_attempts,
    pass_rate: s.pass_rate,
  });

  // --- Barangay sheet ---
  const barangayCols = [
    { header: "Barangay", key: "barangay", width: 24, align: "left" },
    { header: "Active Registered Residents", key: "registered_residents", width: 14 },
    { header: "New Residents", key: "new_residents", width: 12 },
    { header: "Enrollments", key: "enrollments", width: 12 },
    { header: "Completions", key: "completions", width: 12 },
    { header: "Certificates Issued / Renewed", key: "certificates_issued", width: 15 },
    { header: "Certified Responders (Active)", key: "certified_responders", width: 15 },
    { header: "Assessment Attempts", key: "assessment_attempts", width: 12 },
    { header: "Pass Rate", key: "pass_rate", width: 11, percent: true },
    { header: "Average Score", key: "avg_score", width: 11, percent: true },
  ];
  if (!barangayLabel && sheets.has("barangays")) addDataSheet(wb, "Barangay Coverage", meta, barangayCols, data.barangays, {
    barangay: "TOTAL",
    registered_residents: sum(data.barangays, "registered_residents"),
    new_residents: sum(data.barangays, "new_residents"),
    enrollments: sum(data.barangays, "enrollments"),
    completions: sum(data.barangays, "completions"),
    certificates_issued: sum(data.barangays, "certificates_issued"),
    certified_responders: sum(data.barangays, "certified_responders"),
    assessment_attempts: sum(data.barangays, "assessment_attempts"),
    pass_rate: s.pass_rate,
    avg_score: s.avg_score,
  });

  // --- Resident roster (barangay report only) ---
  const residentCols = [
    { header: "Resident", key: "name", width: 26, align: "left" },
    { header: "Email", key: "email", width: 30, align: "left" },
    { header: "Registered", key: "registered_at", width: 14, date: true },
    { header: "Modules Completed (All Time)", key: "completed_total", width: 14 },
    { header: "Completed in Period", key: "completed_in_period", width: 12 },
    { header: "Active Certificates", key: "active_certificates", width: 12 },
    { header: "Next Certificate Expiry", key: "next_expiry", width: 15, date: true },
    { header: "Status", key: "status", width: 15, align: "left" },
  ];
  if (barangayLabel && sheets.has("residents")) {
    const residents = data.residents.map((r) => ({
      ...r,
      registered_at: toExcelDate(r.registered_at),
      next_expiry: toExcelDate(r.next_expiry),
    }));
    const certified = data.residents.filter((r) => r.active_certificates > 0).length;
    addDataSheet(wb, "Resident Roster", meta, residentCols, residents, {
      name: `TOTAL: ${residents.length} residents`,
      email: "",
      registered_at: "",
      completed_total: sum(residents, "completed_total"),
      completed_in_period: sum(residents, "completed_in_period"),
      active_certificates: sum(residents, "active_certificates"),
      next_expiry: "",
      status: `${certified} certified`,
    });
  }

  // --- Module sheet ---
  const moduleCols = [
    { header: "Module ID", key: "mod_id", width: 10, align: "center" },
    { header: "Module Title", key: "title", width: 40, align: "left", wrap: true },
    { header: "Category", key: "category", width: 18, align: "left" },
    { header: "Status", key: "status", width: 12, align: "left" },
    { header: "Enrollments", key: "enrollments", width: 12 },
    { header: "Completions", key: "completions", width: 12 },
    { header: "Certificates Issued / Renewed", key: "certificates_issued", width: 15 },
    { header: "Assessment Attempts", key: "assessment_attempts", width: 12 },
    { header: "Pass Rate", key: "pass_rate", width: 11, percent: true },
    { header: "Average Score", key: "avg_score", width: 11, percent: true },
  ];
  if (sheets.has("modules")) addDataSheet(wb, "Module Performance", meta, moduleCols, data.modules, {
    mod_id: "",
    title: "TOTAL",
    category: "",
    status: "",
    enrollments: sum(data.modules, "enrollments"),
    completions: sum(data.modules, "completions"),
    certificates_issued: sum(data.modules, "certificates_issued"),
    assessment_attempts: sum(data.modules, "assessment_attempts"),
    pass_rate: s.pass_rate,
    avg_score: s.avg_score,
  });

  return wb.xlsx.writeBuffer();
}

module.exports = { buildMdrrmoReportWorkbook };
