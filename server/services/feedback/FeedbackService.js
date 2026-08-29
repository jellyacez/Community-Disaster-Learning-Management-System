const pool = require("../../config/db");

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
        error.statusCode = 400;
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
        u.name AS resident_name,
        u.barangay_id,
        b.name AS barangay_name,
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

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY f.created_at DESC;`;

    const { rows } = await pool.query(query, sqlParams);
    return rows;
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
        error.statusCode = 400;
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
          u.name AS resident_name,
          u.barangay_id,
          b.name AS barangay_name,
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
        INNER JOIN public."user" u ON f.user_id = u.id
        LEFT JOIN public.barangays b ON u.barangay_id = b.id
        WHERE f.id = $1;
      `;
      const finalRes = await client.query(fetchCompleteQuery, [feedbackId]);

      await client.query("COMMIT");
      return finalRes.rows[0];
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
