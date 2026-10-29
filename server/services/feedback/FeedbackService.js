const pool = require("../../config/db");
const { notifyUser } = require("../notif/userNotificationService");

class FeedbackService {
  async getUserFeedbacks(userId) {
    const query = `
      SELECT 
        f.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', fm.id,
                'sender_type', fm.sender_type,
                'sender_id', fm.sender_id,
                'message', fm.message,
                'created_at', fm.created_at
              ) ORDER BY fm.created_at ASC
            ) FILTER (WHERE fm.id IS NOT NULL)
            FROM public.feedback_messages fm
            WHERE fm.feedback_id = f.id
          ),
          '[]'::json
        ) AS thread
      FROM public.feedbacks f
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  async submitFeedback(userId, feedbackData) {
    const { recipient, type, subject, message } = feedbackData;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO public.feedbacks (user_id, recipient, type, subject, message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const { rows } = await client.query(query, [
        userId,
        recipient,
        type,
        subject,
        message,
      ]);

      await client.query(
        `
        INSERT INTO public.feedback_messages (feedback_id, sender_type, sender_id, message)
        VALUES ($1, 'resident', $2, $3)
      `,
        [rows[0].id, userId, message]
      );

      await client.query("COMMIT");
      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async userReplyToFeedback(userId, feedbackId, reply) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const checkQuery = `
        SELECT f.id, f.status
        FROM public.feedbacks f
        WHERE f.id = $1 AND f.user_id = $2
        FOR UPDATE;
      `;
      const checkRes = await client.query(checkQuery, [feedbackId, userId]);

      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        const error = new Error("Feedback record not found or unauthorized.");
        error.statusCode = 404;
        throw error;
      }

      if (checkRes.rows[0].status === "Closed") {
        await client.query("ROLLBACK");
        const error = new Error("Cannot reply to a closed ticket.");
        error.statusCode = 409;
        error.conflictType = "TICKET_CLOSED";
        throw error;
      }

      const insertMsg = `
        INSERT INTO public.feedback_messages (feedback_id, sender_type, sender_id, message)
        VALUES ($1, 'resident', $2, $3)
        RETURNING *;
      `;
      const { rows } = await client.query(insertMsg, [feedbackId, userId, reply]);

      await client.query("COMMIT");
      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getAdminFeedbacks(adminContext, queryParams) {
    const { role: adminRole, barangay_id: adminBarangayId } = adminContext;
    const isMdrrmoOrSystem =
      adminRole.includes("mdrrmo") || adminRole === "system_admin";

    let query = `
      SELECT
        f.*,
        'Anonymous Resident' AS resident_name,
        u.barangay_id,
        b.name AS barangay_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', fm.id,
                'sender_type', fm.sender_type,
                'sender_id', CASE WHEN fm.sender_type = 'resident' THEN NULL ELSE fm.sender_id END,
                'message', fm.message,
                'created_at', fm.created_at
              ) ORDER BY fm.created_at ASC
            ) FILTER (WHERE fm.id IS NOT NULL)
            FROM public.feedback_messages fm
            WHERE fm.feedback_id = f.id
          ),
          '[]'::json
        ) AS thread
      FROM public.feedbacks f
      INNER JOIN public."user" u ON f.user_id = u.id
      LEFT JOIN public.barangays b ON u.barangay_id = b.id
    `;

    const sqlParams = [];
    const conditions = [];

    if (isMdrrmoOrSystem) {
      if (queryParams.barangay_id && queryParams.barangay_id !== "all") {
        sqlParams.push(parseInt(queryParams.barangay_id, 10));
        conditions.push(`u.barangay_id = $${sqlParams.length}`);
      }
      conditions.push(`f.recipient = 'mdrrmo'`);
    } else if (adminRole === "barangay_admin") {
      if (!adminBarangayId) {
        const error = new Error("Forbidden. Admin account is not assigned to a barangay.");
        error.statusCode = 403;
        throw error;
      }
      sqlParams.push(parseInt(adminBarangayId, 10));
      conditions.push(`u.barangay_id = $${sqlParams.length}`);
      conditions.push(`f.recipient = 'barangay'`);
    } else {
      const error = new Error("Forbidden. Insufficient permissions.");
      error.statusCode = 403;
      throw error;
    }

    // Tab counts cover the admin's whole scope (not the search), matching the inbox tabs
    const scopeWhere = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const countsResult = await pool.query(
      `SELECT
         COUNT(*) AS all,
         COUNT(*) FILTER (WHERE f.status = 'Pending') AS pending,
         COUNT(*) FILTER (WHERE f.status = 'Replied') AS replied,
         COUNT(*) FILTER (WHERE f.status = 'Closed') AS closed
       FROM public.feedbacks f
       INNER JOIN public."user" u ON f.user_id = u.id${scopeWhere}`,
      sqlParams
    );
    const c = countsResult.rows[0];
    const counts = {
      all: parseInt(c.all, 10),
      pending: parseInt(c.pending, 10),
      replied: parseInt(c.replied, 10),
      closed: parseInt(c.closed, 10),
    };

    // Paging, tab, search and sort run here so only one page of tickets (and their
    // threads) is sent, instead of every ticket ever filed
    const listParams = [...sqlParams];
    const listConditions = [...conditions];
    const STATUS_BY_TAB = { pending: "Pending", replied: "Replied", closed: "Closed" };
    const tabStatus = STATUS_BY_TAB[String(queryParams.status || "").toLowerCase()];
    if (tabStatus) {
      listParams.push(tabStatus);
      listConditions.push(`f.status = $${listParams.length}`);
    }
    const search = String(queryParams.search || "").trim();
    if (search) {
      // Escape LIKE wildcards; residents are shown as 'Anonymous Resident', so that is the name searched
      listParams.push(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
      const p = `$${listParams.length}`;
      listConditions.push(`(f.subject ILIKE ${p} OR f.type ILIKE ${p} OR 'Anonymous Resident' ILIKE ${p})`);
    }
    const listWhere = listConditions.length > 0 ? ` WHERE ${listConditions.join(" AND ")}` : "";

    const ORDER_BY = {
      newest: "f.created_at DESC, f.id DESC",
      oldest: "f.created_at ASC, f.id ASC",
      status: "CASE f.status WHEN 'Pending' THEN 0 WHEN 'Replied' THEN 1 WHEN 'Closed' THEN 2 ELSE 3 END, f.created_at DESC, f.id DESC",
    };
    const orderBy = Object.hasOwn(ORDER_BY, queryParams.sort) ? ORDER_BY[queryParams.sort] : ORDER_BY.newest;

    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 50);
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM public.feedbacks f INNER JOIN public."user" u ON f.user_id = u.id${listWhere}`,
      listParams
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const { rows } = await pool.query(
      `${query}${listWhere} ORDER BY ${orderBy} LIMIT $${listParams.length + 1} OFFSET $${listParams.length + 2}`,
      [...listParams, limit, (page - 1) * limit]
    );

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts,
    };
  }

  async replyToFeedback(adminContext, feedbackId, replyData) {
    const { role: adminRole, barangay_id: adminBarangayId, id: adminId } = adminContext;
    const { reply, status } = replyData;
    const isMdrrmoOrSystem =
      adminRole.includes("mdrrmo") || adminRole === "system_admin";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const checkQuery = `
        SELECT f.id, f.status, f.recipient, u.barangay_id AS resident_barangay_id
        FROM public.feedbacks f
        INNER JOIN public."user" u ON f.user_id = u.id
        WHERE f.id = $1
        FOR UPDATE
      `;
      const checkRes = await client.query(checkQuery, [feedbackId]);

      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        const error = new Error("Feedback record not found.");
        error.statusCode = 404;
        throw error;
      }

      const ticket = checkRes.rows[0];

      if (adminRole === "barangay_admin") {
        if (
          !adminBarangayId ||
          ticket.recipient !== "barangay" ||
          ticket.resident_barangay_id !== parseInt(adminBarangayId, 10)
        ) {
          await client.query("ROLLBACK");
          const error = new Error("Forbidden. Out-of-scope ticket.");
          error.statusCode = 403;
          throw error;
        }
      } else if (isMdrrmoOrSystem) {
        if (ticket.recipient !== "mdrrmo") {
          await client.query("ROLLBACK");
          const error = new Error("Forbidden. Ticket is addressed to a Barangay department.");
          error.statusCode = 403;
          throw error;
        }
      } else {
        await client.query("ROLLBACK");
        const error = new Error("Forbidden. Insufficient permissions.");
        error.statusCode = 403;
        throw error;
      }

      if (ticket.status === "Closed") {
        await client.query("ROLLBACK");
        const error = new Error("Cannot reply to a closed ticket.");
        error.statusCode = 409;
        error.conflictType = "TICKET_CLOSED";
        throw error;
      }

      const updateQuery = `
        UPDATE public.feedbacks
        SET status = $1
        WHERE id = $2
        RETURNING *;
      `;
      await client.query(updateQuery, [status, feedbackId]);

      const senderType = "admin";
      const insertMessageQuery = `
        INSERT INTO public.feedback_messages (feedback_id, sender_type, sender_id, message)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      await client.query(insertMessageQuery, [feedbackId, senderType, adminId, reply]);

      const fetchCompleteQuery = `
        SELECT
          f.*,
          'Anonymous Resident' AS resident_name,
          u.barangay_id,
          b.name AS barangay_name,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', fm.id,
                  'sender_type', fm.sender_type,
                  'sender_id', CASE WHEN fm.sender_type = 'resident' THEN NULL ELSE fm.sender_id END,
                  'message', fm.message,
                  'created_at', fm.created_at
                ) ORDER BY fm.created_at ASC
              ) FILTER (WHERE fm.id IS NOT NULL)
              FROM public.feedback_messages fm
              WHERE fm.feedback_id = f.id
            ),
            '[]'::json
          ) AS thread
        FROM public.feedbacks f
        INNER JOIN public."user" u ON f.user_id = u.id
        LEFT JOIN public.barangays b ON u.barangay_id = b.id
        WHERE f.id = $1;
      `;
      const finalRes = await client.query(fetchCompleteQuery, [feedbackId]);

      await client.query("COMMIT");

      const updated = finalRes.rows[0];
      notifyUser(
        updated.user_id,
        "feedback_reply",
        `An administrator replied to your feedback "${updated.subject}". Status: ${status}.`
      );
      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async closeFeedbackThread(adminContext, feedbackId) {
    const { role: adminRole, barangay_id: adminBarangayId } = adminContext;
    const isMdrrmoOrSystem =
      adminRole.includes("mdrrmo") || adminRole === "system_admin";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const checkQuery = `
        SELECT f.id, f.status, f.recipient, u.barangay_id AS resident_barangay_id
        FROM public.feedbacks f
        INNER JOIN public."user" u ON f.user_id = u.id
        WHERE f.id = $1
        FOR UPDATE
      `;
      const checkRes = await client.query(checkQuery, [feedbackId]);

      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        const error = new Error("Feedback record not found.");
        error.statusCode = 404;
        throw error;
      }

      const ticket = checkRes.rows[0];

      if (adminRole === "barangay_admin") {
        if (
          !adminBarangayId ||
          ticket.recipient !== "barangay" ||
          ticket.resident_barangay_id !== parseInt(adminBarangayId, 10)
        ) {
          await client.query("ROLLBACK");
          const error = new Error("Forbidden. Out-of-scope ticket.");
          error.statusCode = 403;
          throw error;
        }
      } else if (isMdrrmoOrSystem) {
        if (ticket.recipient !== "mdrrmo") {
          await client.query("ROLLBACK");
          const error = new Error("Forbidden. Ticket is addressed to a Barangay department.");
          error.statusCode = 403;
          throw error;
        }
      } else {
        await client.query("ROLLBACK");
        const error = new Error("Forbidden. Insufficient permissions.");
        error.statusCode = 403;
        throw error;
      }

      const updateQuery = `
        UPDATE public.feedbacks
        SET status = 'Closed'
        WHERE id = $1
        RETURNING *;
      `;
      const updateRes = await client.query(updateQuery, [feedbackId]);

      await client.query("COMMIT");
      return updateRes.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new FeedbackService();