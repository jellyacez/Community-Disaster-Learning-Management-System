const pool = require("../../config/db");

class MdrrmoOverviewService {
  async getMetrics() {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM "user" WHERE role = 'resident' AND archived = false AND (banned IS NULL OR banned = false)) AS registered_responders,
        (SELECT COUNT(*) FROM module_data WHERE moddateremove IS NULL AND status = 'published') AS active_modules,
        (SELECT COUNT(*) FROM module_data WHERE moddateremove IS NULL AND status = 'pending_review') AS pending_reviews,
        (SELECT COUNT(*) FROM certificates WHERE status = 'active') AS certificates_issued,
        (SELECT COUNT(*) FROM module_activity) AS total_enrollments
    `);

    return {
      registered_responders: parseInt(stats.rows[0].registered_responders, 10) || 0,
      active_modules: parseInt(stats.rows[0].active_modules, 10) || 0,
      pending_reviews: parseInt(stats.rows[0].pending_reviews, 10) || 0,
      certificates_issued: parseInt(stats.rows[0].certificates_issued, 10) || 0,
      total_enrollments: parseInt(stats.rows[0].total_enrollments, 10) || 0,
    };
  }

  async getModuleDistribution() {
    const result = await pool.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(modcat), ''), 'Uncategorized') as category,
        COUNT(*) as count
      FROM module_data 
      WHERE moddateremove IS NULL AND status = 'published'
      GROUP BY category
      ORDER BY count DESC
    `);
    
    return result.rows.map((row) => ({
      name: row.category,
      value: parseInt(row.count, 10) || 0,
    }));
  }

  async getEnrollmentTrend() {
    const query = `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW() - INTERVAL '6 days'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS day
      )
      SELECT 
        d.day,
        COUNT(ma.modact_id) AS enrollments
      FROM days d
      LEFT JOIN module_activity ma ON date_trunc('day', ma.started_at) = d.day
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;

    const result = await pool.query(query);

    return result.rows.map((row) => {
      const d = new Date(row.day);
      const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
      return {
        name: dayStr,
        enrollments: parseInt(row.enrollments, 10) || 0,
      };
    });
  }

  async getRecentActivity() {
    const result = await pool.query(`
      SELECT al.act_id, al.user_id, u.name AS user_name,
             al.act_date, al.act_log
      FROM activity_log al
      LEFT JOIN "user" u ON al.user_id = u.id
      WHERE al.act_log ILIKE '%certificate%'
         OR al.act_log ILIKE '%module%'
         OR al.act_log ILIKE '%register%'
         OR al.act_log ILIKE '%approv%'
         OR al.act_log ILIKE '%reject%'
         OR al.act_log ILIKE '%submit%'
      ORDER BY al.act_date DESC
      LIMIT 10
    `);

    return result.rows.map((row) => ({
      id: row.act_id,
      user_name: row.user_name || "System",
      source: row.user_name ? `User: ${row.user_name}` : `User ID: ${row.user_id}`,
      timestamp: row.act_date,
      log: row.act_log,
    }));
  }

  async getSectorOverview() {
    const query = `
      WITH unassigned_stats AS (
        SELECT 
          NULL::integer AS barangay_id,
          'Unassigned' AS barangay_name,
          COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END) AS resident_count,
          COUNT(DISTINCT CASE WHEN u.role = 'barangay_admin' THEN u.id END) AS active_admins,
          COUNT(DISTINCT c.cert_id) AS certificates_issued,
          COUNT(DISTINCT CASE WHEN u.role = 'resident' AND c.status = 'active' THEN u.id END) AS certified_responders,
          COALESCE(
            (COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / 
             NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modact_id IS NOT NULL THEN ma.modact_id END), 0)
            ) * 100, 0
          ) AS avg_completion_rate
        FROM "user" u
        LEFT JOIN certificates c ON u.id = c.user_id
        LEFT JOIN module_activity ma ON u.id = ma.user_id
        WHERE u.barangay_id IS NULL AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      ),
      barangay_stats AS (
        SELECT 
          b.id AS barangay_id,
          b.name AS barangay_name,
          COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END) AS resident_count,
          COUNT(DISTINCT CASE WHEN u.role = 'barangay_admin' THEN u.id END) AS active_admins,
          COUNT(DISTINCT c.cert_id) AS certificates_issued,
          COUNT(DISTINCT CASE WHEN u.role = 'resident' AND c.status = 'active' THEN u.id END) AS certified_responders,
          COALESCE(
            (COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / 
             NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modact_id IS NOT NULL THEN ma.modact_id END), 0)
            ) * 100, 0
          ) AS avg_completion_rate
        FROM barangays b
        LEFT JOIN "user" u ON u.barangay_id = b.id AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
        LEFT JOIN certificates c ON u.id = c.user_id
        LEFT JOIN module_activity ma ON u.id = ma.user_id
        GROUP BY b.id, b.name
      )
      SELECT * FROM (
        SELECT * FROM barangay_stats
        UNION ALL
        SELECT * FROM unassigned_stats
      ) combined_results
      ORDER BY 
        CASE WHEN barangay_name = 'Unassigned' THEN 1 ELSE 0 END, 
        barangay_name ASC;
    `;
    const result = await pool.query(query);

    const formattedData = result.rows.map((row) => ({
      id: row.barangay_id,
      barangay: row.barangay_name,
      resident_count: parseInt(row.resident_count, 10) || 0,
      active_admins: parseInt(row.active_admins, 10) || 0,
      certificates_issued: parseInt(row.certificates_issued, 10) || 0,
      certified_responders: parseInt(row.certified_responders, 10) || 0,
      avg_completion_rate: Math.round(parseFloat(row.avg_completion_rate) || 0),
    }));

    const trendQuery = `
      WITH current_stats AS (
        SELECT 
          COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'active') as certified_responders,
          COUNT(DISTINCT u.barangay_id) FILTER (WHERE u.role = 'resident') as covered_barangays,
          (SELECT COUNT(*) FROM (
             SELECT b.id, 
                    COALESCE((COUNT(DISTINCT CASE WHEN ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / NULLIF(COUNT(DISTINCT ma.modact_id), 0)) * 100, 0) as rate
             FROM barangays b
             JOIN "user" u ON u.barangay_id = b.id AND u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
             LEFT JOIN module_activity ma ON u.id = ma.user_id
             GROUP BY b.id
          ) sub WHERE rate = 0) as below_threshold
        FROM "user" u
        LEFT JOIN certificates c ON u.id = c.user_id
        WHERE u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      ),
      past_stats AS (
        SELECT 
          COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'active' AND c.completion_date <= NOW() - INTERVAL '30 days') as certified_responders,
          COUNT(DISTINCT u.barangay_id) FILTER (WHERE u.role = 'resident' AND u."createdAt" <= NOW() - INTERVAL '30 days') as covered_barangays,
          (SELECT COUNT(*) FROM (
             SELECT b.id, 
                    COALESCE((COUNT(DISTINCT CASE WHEN ma.modstatus ILIKE 'completed' AND ma.completed_at <= NOW() - INTERVAL '30 days' THEN ma.modact_id END)::float / 
                              NULLIF(COUNT(DISTINCT CASE WHEN ma.started_at <= NOW() - INTERVAL '30 days' THEN ma.modact_id END), 0)) * 100, 0) as rate
             FROM barangays b
             JOIN "user" u ON u.barangay_id = b.id AND u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false) AND u."createdAt" <= NOW() - INTERVAL '30 days'
             LEFT JOIN module_activity ma ON u.id = ma.user_id
             GROUP BY b.id
          ) sub WHERE rate = 0) as below_threshold
        FROM "user" u
        LEFT JOIN certificates c ON u.id = c.user_id
        WHERE u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      )
      SELECT 
        c.certified_responders - p.certified_responders AS cert_delta,
        c.covered_barangays - p.covered_barangays AS covered_delta,
        c.below_threshold - p.below_threshold AS threshold_delta
      FROM current_stats c, past_stats p;
    `;
    const trendResult = await pool.query(trendQuery);
    const deltas = trendResult.rows[0];

    const certDelta = parseInt(deltas?.cert_delta, 10) || 0;
    const coveredDelta = parseInt(deltas?.covered_delta, 10) || 0;
    const thresholdDelta = parseInt(deltas?.threshold_delta, 10) || 0;

    const trends = {
      certifiedResponders: {
        delta: certDelta,
        direction: certDelta > 0 ? "up" : certDelta < 0 ? "down" : "flat",
        text: certDelta > 0 ? `+${certDelta} this month` : certDelta < 0 ? `${certDelta} this month` : "Unchanged from last month",
        color: certDelta > 0 ? "green" : certDelta < 0 ? "red" : "gray",
      },
      coveredBarangays: {
        delta: coveredDelta,
        direction: coveredDelta > 0 ? "up" : coveredDelta < 0 ? "down" : "flat",
        text: coveredDelta > 0 ? `+${coveredDelta} this month` : coveredDelta < 0 ? `${coveredDelta} this month` : "Unchanged from last month",
        color: coveredDelta > 0 ? "green" : coveredDelta < 0 ? "red" : "gray",
      },
      belowThreshold: {
        delta: thresholdDelta,
        direction: thresholdDelta > 0 ? "up" : thresholdDelta < 0 ? "down" : "flat",
        text: thresholdDelta > 0 ? `+${thresholdDelta} since last month` : thresholdDelta < 0 ? `${Math.abs(thresholdDelta)} fewer this month` : "Unchanged from last month",
        color: thresholdDelta > 0 ? "red" : thresholdDelta < 0 ? "green" : "gray",
      },
    };

    return { formattedData, trends };
  }

  async getSectorOverviewCategoryBreakdown(barangayId) {
    let query = `
      SELECT 
        COALESCE(NULLIF(TRIM(md.modcat), ''), 'Uncategorized') AS category,
        COUNT(DISTINCT c.cert_id) AS certificate_count
      FROM certificates c
      JOIN "user" u ON c.user_id = u.id
      LEFT JOIN module_data md ON c.module_id = md.mod_id
      WHERE u.role = 'resident' 
        AND c.status = 'active'
        AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
    `;
    const params = [];

    if (barangayId) {
      if (barangayId === "unassigned") {
        query += ` AND u.barangay_id IS NULL`;
      } else {
        query += ` AND u.barangay_id = $1`;
        params.push(barangayId);
      }
    }

    query += ` GROUP BY category ORDER BY certificate_count DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      name: row.category,
      value: parseInt(row.certificate_count, 10) || 0,
    }));
  }

  async getMunicipalCertAnalytics() {
    const summaryQuery = `
      WITH municipal_certs AS (
        SELECT 
          c.cert_id,
          CASE 
            WHEN c.status = 'revoked' THEN 'revoked'
            WHEN c.expires_at < NOW() THEN 'expired'
            WHEN c.expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END AS computed_status
        FROM public.certificates c
        INNER JOIN public."user" u ON c.user_id = u.id AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      )
      SELECT 
        COUNT(*)::int AS total_certified,
        COUNT(CASE WHEN computed_status = 'active' THEN 1 END)::int AS active_count,
        COUNT(CASE WHEN computed_status = 'expiring_soon' THEN 1 END)::int AS expiring_soon_count,
        COUNT(CASE WHEN computed_status = 'expired' THEN 1 END)::int AS expired_count,
        COUNT(CASE WHEN computed_status = 'revoked' THEN 1 END)::int AS revoked_count
      FROM municipal_certs;
    `;
    const summaryRes = await pool.query(summaryQuery);
    const summary = summaryRes.rows[0] || {
      total_certified: 0,
      active_count: 0,
      expiring_soon_count: 0,
      expired_count: 0,
      revoked_count: 0,
    };

    const barangayQuery = `
      WITH cert_scoped AS (
        SELECT 
          c.cert_id,
          c.user_id,
          CASE 
            WHEN c.status = 'revoked' THEN 'revoked'
            WHEN c.expires_at < NOW() THEN 'expired'
            WHEN c.expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END AS computed_status
        FROM public.certificates c
      )
      SELECT 
        b.id AS barangay_id,
        b.name AS barangay_name,
        COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END)::int AS resident_count,
        COUNT(DISTINCT CASE WHEN u.role = 'resident' AND cs.computed_status = 'active' THEN u.id END)::int AS active_certified_count,
        COUNT(DISTINCT CASE WHEN cs.computed_status = 'expiring_soon' THEN cs.cert_id END)::int AS expiring_soon_count,
        COUNT(DISTINCT CASE WHEN cs.computed_status = 'expired' THEN cs.cert_id END)::int AS expired_count,
        COUNT(DISTINCT CASE WHEN cs.computed_status = 'revoked' THEN cs.cert_id END)::int AS revoked_count,
        COUNT(DISTINCT cs.cert_id)::int AS total_certs,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN u.role = 'resident' AND cs.computed_status = 'active' THEN u.id END)::numeric / 
             NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END), 0)
            ) * 100, 1
          ), 0.0
        )::float AS compliance_rate
      FROM public.barangays b
      LEFT JOIN public."user" u ON u.barangay_id = b.id AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      LEFT JOIN cert_scoped cs ON cs.user_id = u.id
      GROUP BY b.id, b.name
      ORDER BY compliance_rate DESC, b.name ASC;
    `;
    const barangayRes = await pool.query(barangayQuery);

    const moduleQuery = `
      WITH cert_scoped AS (
        SELECT 
          c.cert_id,
          c.module_id,
          CASE 
            WHEN c.status = 'revoked' THEN 'revoked'
            WHEN c.expires_at < NOW() THEN 'expired'
            WHEN c.expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END AS computed_status
        FROM public.certificates c
        INNER JOIN public."user" u ON c.user_id = u.id AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      )
      SELECT 
        m.mod_id AS module_id,
        m.modname AS module_title,
        COALESCE(m.modcat, 'General') AS category,
        COUNT(cs.cert_id)::int AS total_certificates,
        COUNT(CASE WHEN cs.computed_status = 'active' THEN 1 END)::int AS active_certificates,
        COUNT(CASE WHEN cs.computed_status = 'expiring_soon' THEN 1 END)::int AS expiring_soon_certificates,
        COUNT(CASE WHEN cs.computed_status = 'expired' THEN 1 END)::int AS expired_certificates
      FROM public.module_data m
      LEFT JOIN cert_scoped cs ON cs.module_id = m.mod_id
      WHERE m.status = 'published'
      GROUP BY m.mod_id, m.modname, m.modcat
      ORDER BY total_certificates DESC, m.modname ASC;
    `;
    const moduleRes = await pool.query(moduleQuery);

    return {
      summary,
      barangays: barangayRes.rows,
      modules: moduleRes.rows,
    };
  }

  async getMunicipalCertFeed(queryParams) {
    const { page = 1, limit = 10, search = "", barangayId = "", moduleId = "", status = "" } = queryParams;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions = ["u.archived = false", "(u.banned IS NULL OR u.banned = false)"];
    const params = [];

    if (barangayId && !isNaN(parseInt(barangayId, 10))) {
      params.push(parseInt(barangayId, 10));
      conditions.push(`u.barangay_id = $${params.length}`);
    }

    if (moduleId && !isNaN(parseInt(moduleId, 10))) {
      params.push(parseInt(moduleId, 10));
      conditions.push(`c.module_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const sIdx = params.length;
      conditions.push(`(
        u.name ILIKE $${sIdx} OR 
        u.email ILIKE $${sIdx} OR 
        c.cert_rec ILIKE $${sIdx} OR 
        m.modname ILIKE $${sIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const baseCte = `
      WITH municipal_feed AS (
        SELECT 
          c.cert_id,
          c.cert_rec,
          c.completion_date,
          c.expires_at,
          c.status AS raw_status,
          c.revoked_at,
          c.revocation_reason,
          u.id AS resident_id,
          u.name AS resident_name,
          u.email AS resident_email,
          u.barangay_id,
          b.name AS barangay_name,
          m.mod_id AS module_id,
          m.modname AS module_title,
          m.modcat AS module_category,
          CASE 
            WHEN c.status = 'revoked' THEN 'revoked'
            WHEN c.expires_at < NOW() THEN 'expired'
            WHEN c.expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END AS computed_status
        FROM public.certificates c
        INNER JOIN public."user" u ON c.user_id = u.id
        LEFT JOIN public.barangays b ON u.barangay_id = b.id
        INNER JOIN public.module_data m ON c.module_id = m.mod_id
        ${whereClause}
      )
    `;

    let statusFilter = "";
    if (status && ["active", "expiring_soon", "expired", "revoked"].includes(status)) {
      params.push(status);
      statusFilter = `WHERE computed_status = $${params.length}`;
    }

    const countQuery = `
      ${baseCte}
      SELECT COUNT(*)::int AS total FROM municipal_feed ${statusFilter};
    `;
    const countRes = await pool.query(countQuery, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataQuery = `
      ${baseCte}
      SELECT * FROM municipal_feed
      ${statusFilter}
      ORDER BY 
        CASE computed_status
          WHEN 'expiring_soon' THEN 1
          WHEN 'expired' THEN 2
          WHEN 'active' THEN 3
          WHEN 'revoked' THEN 4
          ELSE 5
        END,
        expires_at ASC,
        completion_date DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;
    const dataRes = await pool.query(dataQuery, params);

    return {
      certificates: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

module.exports = new MdrrmoOverviewService();
