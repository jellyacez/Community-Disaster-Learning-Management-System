const pool = require("../../config/db");

// $1 = start date, $2 = end date (both inclusive, YYYY-MM-DD).
// Counts cover residents only, so admin test activity does not inflate the report.
const inPeriod = (col) => `${col} >= $1::date AND ${col} < $2::date + 1`;

const toInt = (v) => parseInt(v, 10) || 0;
const toRate = (v) => (v === null || v === undefined ? null : Number(v));

class MdrrmoReportService {
  async getAccomplishmentReport(from, to) {
    const params = [from, to];

    const [summary, certStatus, monthly, barangays, modules] = await Promise.all([
      pool.query(
        `WITH res AS (SELECT id FROM "user" WHERE role = 'resident')
        SELECT
          (SELECT COUNT(*) FROM "user"
             WHERE role = 'resident' AND archived = false AND (banned IS NULL OR banned = false)
               AND "createdAt" < $2::date + 1) AS registered_residents,
          (SELECT COUNT(*) FROM "user" WHERE role = 'resident' AND ${inPeriod('"createdAt"')}) AS new_residents,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE ${inPeriod("ma.started_at")}) AS enrollments,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE ma.modstatus ILIKE 'completed' AND ${inPeriod("ma.completed_at")}) AS completions,
          (SELECT COUNT(*) FROM certificates c JOIN res ON res.id = c.user_id
             WHERE ${inPeriod("c.completion_date")}) AS certificates_issued,
          (SELECT COUNT(*) FROM activity_log al JOIN res ON res.id = al.user_id
             WHERE al.act_log LIKE 'Recertified module:%' AND ${inPeriod("al.act_date")}) AS recertifications,
          (SELECT COUNT(*) FROM results r JOIN res ON res.id = r.user_id
             WHERE ${inPeriod("r.date_taken")}) AS assessment_attempts,
          (SELECT AVG(r.passed::int) FROM results r JOIN res ON res.id = r.user_id
             WHERE ${inPeriod("r.date_taken")}) AS pass_rate,
          (SELECT AVG(r.score::numeric / NULLIF(r.total_points, 0)) FROM results r JOIN res ON res.id = r.user_id
             WHERE ${inPeriod("r.date_taken")}) AS avg_score,
          (SELECT COUNT(*) FROM module_data WHERE moddateremove IS NULL AND status = 'published') AS published_modules`,
        params
      ),

      // Snapshot at generation time, not limited to the period
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'active' AND expires_at <= NOW() + INTERVAL '30 days') AS expiring_30_days,
          COUNT(*) FILTER (WHERE status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE status = 'revoked') AS revoked
        FROM certificates
      `),

      pool.query(
        `WITH res AS (SELECT id FROM "user" WHERE role = 'resident'),
        months AS (
          SELECT m,
                 GREATEST(m, $1::date::timestamp) AS lo,
                 LEAST(m + INTERVAL '1 month', ($2::date + 1)::timestamp) AS hi
          FROM generate_series(
            date_trunc('month', $1::date::timestamp),
            date_trunc('month', $2::date::timestamp),
            INTERVAL '1 month'
          ) AS m
        )
        SELECT
          to_char(m, 'Mon YYYY') AS month,
          (SELECT COUNT(*) FROM "user" u
             WHERE u.role = 'resident' AND u."createdAt" >= lo AND u."createdAt" < hi) AS new_residents,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE ma.started_at >= lo AND ma.started_at < hi) AS enrollments,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE ma.modstatus ILIKE 'completed' AND ma.completed_at >= lo AND ma.completed_at < hi) AS completions,
          (SELECT COUNT(*) FROM certificates c JOIN res ON res.id = c.user_id
             WHERE c.completion_date >= lo AND c.completion_date < hi) AS certificates_issued,
          (SELECT COUNT(*) FROM results r JOIN res ON res.id = r.user_id
             WHERE r.date_taken >= lo AND r.date_taken < hi) AS assessment_attempts,
          (SELECT AVG(r.passed::int) FROM results r JOIN res ON res.id = r.user_id
             WHERE r.date_taken >= lo AND r.date_taken < hi) AS pass_rate
        FROM months
        ORDER BY m`,
        params
      ),

      pool.query(
        `WITH res AS (
          SELECT id, barangay_id, "createdAt", archived, banned FROM "user" WHERE role = 'resident'
        ),
        brgy AS (
          SELECT id, name FROM barangays
          UNION ALL
          SELECT NULL, 'Unassigned'
        )
        SELECT
          b.name AS barangay,
          (SELECT COUNT(*) FROM res
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id
               AND res.archived = false AND (res.banned IS NULL OR res.banned = false)
               AND res."createdAt" < $2::date + 1) AS registered_residents,
          (SELECT COUNT(*) FROM res
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod('res."createdAt"')}) AS new_residents,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod("ma.started_at")}) AS enrollments,
          (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id
               AND ma.modstatus ILIKE 'completed' AND ${inPeriod("ma.completed_at")}) AS completions,
          (SELECT COUNT(*) FROM certificates c JOIN res ON res.id = c.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod("c.completion_date")}) AS certificates_issued,
          (SELECT COUNT(DISTINCT c.user_id) FROM certificates c JOIN res ON res.id = c.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND c.status = 'active') AS certified_responders,
          (SELECT COUNT(*) FROM results r JOIN res ON res.id = r.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod("r.date_taken")}) AS assessment_attempts,
          (SELECT AVG(r.passed::int) FROM results r JOIN res ON res.id = r.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod("r.date_taken")}) AS pass_rate,
          (SELECT AVG(r.score::numeric / NULLIF(r.total_points, 0)) FROM results r JOIN res ON res.id = r.user_id
             WHERE res.barangay_id IS NOT DISTINCT FROM b.id AND ${inPeriod("r.date_taken")}) AS avg_score
        FROM brgy b
        ORDER BY (b.id IS NULL), b.name`,
        params
      ),

      // Published modules, plus any other module residents were active in during the period
      pool.query(
        `WITH res AS (SELECT id FROM "user" WHERE role = 'resident'),
        stats AS (
          SELECT
            md.mod_id, md.modname, md.modcat, md.status, md.level,
            (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
               WHERE ma.mod_id = md.mod_id AND ${inPeriod("ma.started_at")}) AS enrollments,
            (SELECT COUNT(*) FROM module_activity ma JOIN res ON res.id = ma.user_id
               WHERE ma.mod_id = md.mod_id AND ma.modstatus ILIKE 'completed' AND ${inPeriod("ma.completed_at")}) AS completions,
            (SELECT COUNT(*) FROM certificates c JOIN res ON res.id = c.user_id
               WHERE c.module_id = md.mod_id AND ${inPeriod("c.completion_date")}) AS certificates_issued,
            (SELECT COUNT(*) FROM results r JOIN res ON res.id = r.user_id
               WHERE r.mod_id = md.mod_id AND ${inPeriod("r.date_taken")}) AS assessment_attempts,
            (SELECT AVG(r.passed::int) FROM results r JOIN res ON res.id = r.user_id
               WHERE r.mod_id = md.mod_id AND ${inPeriod("r.date_taken")}) AS pass_rate,
            (SELECT AVG(r.score::numeric / NULLIF(r.total_points, 0)) FROM results r JOIN res ON res.id = r.user_id
               WHERE r.mod_id = md.mod_id AND ${inPeriod("r.date_taken")}) AS avg_score
          FROM module_data md
          WHERE md.moddateremove IS NULL
        )
        SELECT * FROM stats
        WHERE status = 'published' OR enrollments > 0 OR completions > 0 OR assessment_attempts > 0
        ORDER BY enrollments DESC, modname`,
        params
      ),
    ]);

    const s = summary.rows[0];
    const c = certStatus.rows[0];

    return {
      summary: {
        registered_residents: toInt(s.registered_residents),
        new_residents: toInt(s.new_residents),
        enrollments: toInt(s.enrollments),
        completions: toInt(s.completions),
        certificates_issued: toInt(s.certificates_issued),
        recertifications: toInt(s.recertifications),
        assessment_attempts: toInt(s.assessment_attempts),
        pass_rate: toRate(s.pass_rate),
        avg_score: toRate(s.avg_score),
        published_modules: toInt(s.published_modules),
      },
      certificationStatus: {
        active: toInt(c.active),
        expiring_30_days: toInt(c.expiring_30_days),
        expired: toInt(c.expired),
        revoked: toInt(c.revoked),
      },
      monthly: monthly.rows.map((r) => ({
        month: r.month,
        new_residents: toInt(r.new_residents),
        enrollments: toInt(r.enrollments),
        completions: toInt(r.completions),
        certificates_issued: toInt(r.certificates_issued),
        assessment_attempts: toInt(r.assessment_attempts),
        pass_rate: toRate(r.pass_rate),
      })),
      barangays: barangays.rows
        .map((r) => ({
          barangay: r.barangay,
          registered_residents: toInt(r.registered_residents),
          new_residents: toInt(r.new_residents),
          enrollments: toInt(r.enrollments),
          completions: toInt(r.completions),
          certificates_issued: toInt(r.certificates_issued),
          certified_responders: toInt(r.certified_responders),
          assessment_attempts: toInt(r.assessment_attempts),
          pass_rate: toRate(r.pass_rate),
          avg_score: toRate(r.avg_score),
        }))
        // Drop the "Unassigned" row when no resident falls into it
        .filter((r) => r.barangay !== "Unassigned" || r.registered_residents > 0 || r.enrollments > 0),
      modules: modules.rows.map((r) => ({
        mod_id: r.mod_id,
        title: r.modname,
        category: r.modcat || "Uncategorized",
        status: r.status,
        level: r.level || "",
        enrollments: toInt(r.enrollments),
        completions: toInt(r.completions),
        certificates_issued: toInt(r.certificates_issued),
        assessment_attempts: toInt(r.assessment_attempts),
        pass_rate: toRate(r.pass_rate),
        avg_score: toRate(r.avg_score),
      })),
    };
  }
}

module.exports = new MdrrmoReportService();
