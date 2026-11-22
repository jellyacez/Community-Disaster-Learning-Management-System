const pool = require("../../config/db");

// Spec: docs/specs/emergency-contacts.md
const MAX_CONTACTS = 15;
const MAX_TEXT = 80;
const MAX_PHONE = 32; // emergency_contacts.phone is varchar(32)
const MAX_LOG = 500; // activity_log.act_log is varchar(500)
const PHONE_RE = /^\+?[0-9][0-9 -]*[0-9]$/; // same as emergency_contacts_phone_check
// Control, format (bidi overrides, zero-width), lone surrogate and line/paragraph separator characters
const HIDDEN_CHARS_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
const ROW_KEYS = new Set(["id", "agency", "label", "phone", "is_sample", "active"]);
const BODY_KEYS = new Set(["version", "contacts"]);
const VERSION_KEY = "emergency_contacts_version";
const MAX_INT = 2147483647;

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Dial string: the shown phone without spaces and dashes. Sample rows are never dialable.
const toTel = (phone, isSample) => (isSample ? null : phone.replace(/[ -]/g, ""));

const toPublic = (r) => ({
  id: r.id,
  agency: r.agency,
  label: r.label,
  phone: r.phone,
  tel: toTel(r.phone, r.is_sample),
  is_sample: r.is_sample,
});

function checkText(value, field, index, errors) {
  if (typeof value !== "string") {
    errors.push({ index, field, message: "Must be text." });
    return null;
  }
  const text = value.trim();
  // Count code points, as Postgres char_length does, not UTF-16 units
  const length = Array.from(text).length;
  if (length < 1 || length > MAX_TEXT) {
    errors.push({ index, field, message: `Must be 1 to ${MAX_TEXT} characters.` });
  } else if (HIDDEN_CHARS_RE.test(text)) {
    errors.push({ index, field, message: "Contains a line break or hidden character." });
  }
  return text;
}

function checkPhone(value, index, errors) {
  if (typeof value !== "string") {
    errors.push({ index, field: "phone", message: "Must be text." });
    return null;
  }
  const phone = value.trim();
  if (phone.length > MAX_PHONE || !PHONE_RE.test(phone)) {
    errors.push({
      index,
      field: "phone",
      message: "Use digits, spaces and dashes only, with an optional leading +.",
    });
    return phone;
  }
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 3 || digits > 15) {
    errors.push({ index, field: "phone", message: "Must have 3 to 15 digits." });
  }
  return phone;
}

// Returns { errors } or { value: { version, contacts } } with trimmed text.
function validate(body) {
  const errors = [];
  if (!isPlainObject(body)) {
    return { errors: [{ field: "body", message: "Expected a JSON object." }] };
  }
  for (const key of Object.keys(body)) {
    if (!BODY_KEYS.has(key)) errors.push({ field: key, message: "Unknown field." });
  }
  const { version, contacts } = body;
  if (!Number.isInteger(version) || version < 1 || version > Number.MAX_SAFE_INTEGER) {
    errors.push({ field: "version", message: "Must be a positive whole number." });
  }
  if (!Array.isArray(contacts)) {
    errors.push({ field: "contacts", message: "Must be a list." });
    return { errors };
  }
  if (contacts.length < 1 || contacts.length > MAX_CONTACTS) {
    errors.push({ field: "contacts", message: `Must have 1 to ${MAX_CONTACTS} entries.` });
    // Don't check (and answer for) every row of an oversized list
    return { errors };
  }

  const seenIds = new Set();
  const rows = contacts.map((row, index) => {
    if (!isPlainObject(row)) {
      errors.push({ index, field: "contacts", message: "Each entry must be an object." });
      return null;
    }
    for (const key of Object.keys(row)) {
      if (!ROW_KEYS.has(key)) errors.push({ index, field: key, message: "Unknown field." });
    }
    if (row.id !== undefined) {
      if (!Number.isInteger(row.id) || row.id < 1 || row.id > MAX_INT) {
        errors.push({ index, field: "id", message: "Must be a positive whole number." });
      } else if (seenIds.has(row.id)) {
        errors.push({ index, field: "id", message: "Appears more than once." });
      } else {
        seenIds.add(row.id);
      }
    }
    const agency = checkText(row.agency, "agency", index, errors);
    const label = checkText(row.label, "label", index, errors);
    const phone = checkPhone(row.phone, index, errors);
    for (const field of ["is_sample", "active"]) {
      if (typeof row[field] !== "boolean") errors.push({ index, field, message: "Must be true or false." });
    }
    return { id: row.id, agency, label, phone, is_sample: row.is_sample, active: row.active };
  });

  if (rows.length > 0 && !rows.some((r) => r && r.active === true)) {
    errors.push({ field: "contacts", message: "At least one entry must be active." });
  }
  return errors.length ? { errors } : { value: { version, contacts: rows } };
}

const name = (r) => `${r.agency}/${r.label}`;

// One activity_log line for a save, cut to the column's length in code points.
function summarize(before, after, removed) {
  const parts = [];
  const byId = new Map(before.map((r) => [r.id, r]));
  let reordered = false;
  after.forEach((row, i) => {
    const old = row.id === undefined ? null : byId.get(row.id);
    if (!old) {
      parts.push(`added ${name(row)}`);
      return;
    }
    if (old.sort_order !== i + 1) reordered = true;
    const changed = ["agency", "label", "phone"].filter((f) => old[f] !== row[f]);
    if (changed.length) parts.push(`changed ${changed.join(", ")} of ${name(row)}`);
    if (old.active !== row.active) parts.push(`${row.active ? "activated" : "deactivated"} ${name(row)}`);
    if (old.is_sample !== row.is_sample) {
      parts.push(`marked ${name(row)} as ${row.is_sample ? "a sample" : "a real number"}`);
    }
  });
  for (const r of removed) parts.push(`removed ${name(r)}`);
  if (reordered) parts.push("reordered the list");
  if (!parts.length) return null;
  const text = `Updated emergency contacts: ${parts.join("; ")}`;
  const chars = Array.from(text);
  return chars.length <= MAX_LOG ? text : `${chars.slice(0, MAX_LOG - 3).join("")}...`;
}

class EmergencyContactsService {
  constructor() {
    this.publicCache = null;
    this.publicCacheAt = 0;
  }

  clearPublicCache() {
    this.publicCache = null;
  }

  // Active rows for residents and visitors; cached 30 s so the public route can't hammer the DB.
  async listPublic() {
    const now = Date.now();
    if (this.publicCache && now - this.publicCacheAt < 30000) return this.publicCache;
    const { rows } = await pool.query(
      `SELECT id, agency, label, phone, is_sample
       FROM public.emergency_contacts WHERE active ORDER BY sort_order, id`
    );
    this.publicCache = rows.map(toPublic);
    this.publicCacheAt = now;
    return this.publicCache;
  }

  async listAdmin() {
    const [contacts, version] = await Promise.all([
      pool.query(
        `SELECT ec.id, ec.agency, ec.label, ec.phone, ec.is_sample, ec.active, ec.sort_order,
                ec.updated_at, u.name AS updated_by_name
         FROM public.emergency_contacts ec
         LEFT JOIN public."user" u ON u.id = ec.updated_by
         ORDER BY ec.sort_order, ec.id`
      ),
      pool.query(`SELECT value FROM public.system_settings WHERE key = $1`, [VERSION_KEY]),
    ]);
    return {
      version: Number.parseInt(version.rows[0]?.value ?? "1", 10),
      contacts: contacts.rows.map((r) => ({
        ...toPublic(r),
        active: r.active,
        sort_order: r.sort_order,
        updated_at: r.updated_at,
        updated_by_name: r.updated_by_name,
      })),
    };
  }

  // Replaces the whole list. Returns one of:
  //   { status: "invalid", errors }   { status: "conflict", version }
  //   { status: "saved", version, changed, summary }
  async replace(userId, body) {
    const checked = validate(body);
    if (checked.errors) return { status: "invalid", errors: checked.errors };
    const { version, contacts } = checked.value;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Locking the version row serializes saves, so two admins can't both pass the check.
      const v = await client.query(
        `SELECT value FROM public.system_settings WHERE key = $1 FOR UPDATE`,
        [VERSION_KEY]
      );
      if (!v.rows.length) throw new Error(`${VERSION_KEY} setting is missing; run migration.sql`);
      const current = Number.parseInt(v.rows[0].value, 10);
      if (current !== version) {
        await client.query("ROLLBACK");
        return { status: "conflict", version: current };
      }

      const { rows: before } = await client.query(
        `SELECT id, agency, label, phone, is_sample, active, sort_order
         FROM public.emergency_contacts ORDER BY sort_order, id`
      );
      const existing = new Set(before.map((r) => r.id));
      const unknown = [];
      contacts.forEach((r, index) => {
        if (r.id !== undefined && !existing.has(r.id)) {
          unknown.push({ index, field: "id", message: "This entry no longer exists. Reload and try again." });
        }
      });
      if (unknown.length) {
        await client.query("ROLLBACK");
        return { status: "invalid", errors: unknown };
      }

      const kept = new Set(contacts.filter((r) => r.id !== undefined).map((r) => r.id));
      const removed = before.filter((r) => !kept.has(r.id));
      const summary = summarize(before, contacts, removed);
      if (!summary) {
        await client.query("ROLLBACK");
        return { status: "saved", version: current, changed: false, summary: null };
      }

      if (removed.length) {
        await client.query(`DELETE FROM public.emergency_contacts WHERE id = ANY($1::int[])`, [
          removed.map((r) => r.id),
        ]);
      }
      const byId = new Map(before.map((r) => [r.id, r]));
      for (const [i, r] of contacts.entries()) {
        const sortOrder = i + 1;
        if (r.id === undefined) {
          await client.query(
            `INSERT INTO public.emergency_contacts
               (agency, label, phone, is_sample, active, sort_order, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
            [r.agency, r.label, r.phone, r.is_sample, r.active, sortOrder, userId]
          );
          continue;
        }
        const old = byId.get(r.id);
        const same =
          old.agency === r.agency && old.label === r.label && old.phone === r.phone &&
          old.is_sample === r.is_sample && old.active === r.active && old.sort_order === sortOrder;
        if (same) continue;
        await client.query(
          `UPDATE public.emergency_contacts
           SET agency = $2, label = $3, phone = $4, is_sample = $5, active = $6, sort_order = $7,
               updated_by = $8, updated_at = now()
           WHERE id = $1`,
          [r.id, r.agency, r.label, r.phone, r.is_sample, r.active, sortOrder, userId]
        );
      }
      await client.query(
        `UPDATE public.system_settings SET value = $2, updated_at = now() WHERE key = $1`,
        [VERSION_KEY, String(current + 1)]
      );
      await client.query("COMMIT");
      this.clearPublicCache();
      return { status: "saved", version: current + 1, changed: true, summary };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new EmergencyContactsService();
