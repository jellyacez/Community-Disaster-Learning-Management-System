import { localDb } from '../localDb';

export const saveOfflineModuleProgress = aync (userId, moduleId, newProgress) => {
	try {

		await localDb.transaction('rw', db.module_activity, db.sync_queue, async () => {
		
		await db.module_activity.put({
			modact_id:moduleId,
			user_id:userId,
			progress:newProgress,
			updated_at:Date.now()
			});
		})

		await db.sync_queue.add({
			action_type:'UPDATE_PROGRESS',
			status:'pending',
			payload:{
				user_id:userId,
				module_id:moduleId,
				progress:newProgress
			}
		});

		console.log("progress saved locally and queued for sync.");
	} catch (error) {
		console.error("failed to save progress offline.");
	}
}