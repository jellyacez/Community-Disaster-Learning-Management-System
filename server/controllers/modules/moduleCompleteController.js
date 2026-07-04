const completeQuery =  async (client, userId,stepId,moduleId) =>{

    await client.query(
        `INSERT INTO public.user_step_progress (user_id, step_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, step_id) DO NOTHING`,
        [userId, stepId]
        );


         const statsQuery = await client.query(`
            SELECT 
                COUNT(s.step_id) AS total_steps,
                COUNT(p.step_id) AS completed_steps
            FROM public.module_steps s
            INNER JOIN public.levels l ON s.level_id = l.level_id
            LEFT JOIN public.user_step_progress p ON s.step_id = p.step_id AND p.user_id = $1
            WHERE l.mod_id = $2
        `, [userId, moduleId]);

        const { total_steps, completed_steps } = statsQuery.rows[0];
        
        const total = parseInt(total_steps, 10);
        const completed = parseInt(completed_steps, 10);
        
        let moduleStatus = "In Progress";
        let isFullyCompleted = false;

        if (total > 0 && completed === total) {
            moduleStatus = "Completed";
            isFullyCompleted = true;

            await client.query(
                `UPDATE public.module_activity 
                 SET modstatus = $1, completed_at = $2
                 WHERE user_id = $3 AND mod_id = $4`,
                [moduleStatus, new Date().toISOString(), userId, moduleId]
            );
        }
        return{
            total,
            completed,
            moduleStatus,
            isFullyCompleted
        }
        
}

module.exports = { completeQuery }

