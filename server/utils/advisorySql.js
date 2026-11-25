// An urgent advisory stays pinned only while it is in effect (not expired, not lifted)
const inEffectSql = (t) =>
  `(${t}.priority = 'urgent' AND ${t}.lifted_at IS NULL AND (${t}.expires_at IS NULL OR ${t}.expires_at > NOW()))`;

module.exports = { inEffectSql };
