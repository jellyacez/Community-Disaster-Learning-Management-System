// Shared by every list endpoint. Bad values are clamped, never rejected, so no request a client
// sends today starts failing: missing, non-numeric or 0 falls back to the default, negatives
// become 1, and page is capped so the OFFSET stays a safe integer (and inside bigint).
const toInt = (raw) => parseInt(raw, 10);

function parsePaging(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const limit = Math.min(Math.max(toInt(query.limit) || defaultLimit, 1), maxLimit);
  const maxPage = Math.floor(Number.MAX_SAFE_INTEGER / limit);
  const page = Math.min(Math.max(toInt(query.page) || 1, 1), maxPage);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { parsePaging };
