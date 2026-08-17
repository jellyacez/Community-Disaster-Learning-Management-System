const pool = require("../../config/db");

// @desc    Get logged-in resident's feedback history
// @route   GET /api/feedbacks/my-submissions
exports.getFeedbacks = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

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
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch feedback history." });
  }
};

// @desc    Submit new feedback, inquiry, concern, or report
// @route   POST /api/feedbacks
exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const { recipient, type, subject, message } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
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

      await client.query(`
        INSERT INTO public.feedback_messages (feedback_id, sender_type, sender_id, message)
        VALUES ($1, 'resident', $2, $3)
      `, [rows[0].id, userId, message]);

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to submit feedback." });
  }
};

// @desc    Reply to an existing feedback ticket
// @route   PUT /api/feedbacks/:id/reply
exports.userReplyToFeedback = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ success: false, error: "Reply message is required." });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify ownership and status
      const checkQuery = `SELECT status FROM public.feedbacks WHERE id = $1 AND user_id = $2 FOR UPDATE`;
      const checkRes = await client.query(checkQuery, [id, userId]);
      
      if (checkRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: "Ticket not found or unauthorized." });
      }

      if (checkRes.rows[0].status === 'Closed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: "Cannot reply to a closed ticket." });
      }

      // 2. Insert the message
      const insertQuery = `
        INSERT INTO public.feedback_messages (feedback_id, sender_type, sender_id, message)
        VALUES ($1, 'resident', $2, $3)
        RETURNING *;
      `;
      const { rows: newMessages } = await client.query(insertQuery, [id, userId, reply]);

      // 3. Update status back to Pending
      const updateQuery = `
        UPDATE public.feedbacks 
        SET status = 'Pending' 
        WHERE id = $1
        RETURNING *;
      `;
      await client.query(updateQuery, [id]);

      await client.query('COMMIT');
      res.json({ success: true, data: newMessages[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to submit reply." });
  }
};
