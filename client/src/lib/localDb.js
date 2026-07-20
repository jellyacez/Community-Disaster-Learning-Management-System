import Dexie from 'dexie';

export const localDb = new Dexie("LMS_OfflineDB");

localDb.version(1).stores({
    // Only index primary keys and foreign keys used for lookups
    activity_log: "++act_id, user_id",
    certificates: "++cert_id, user_id, module_id",
    module_activity: "modact_id, user_id, mod_id, modstatus, progress",
    module_data: "mod_id, modcat", 
    levels: "level_id, mod_id",
    module_steps: "step_id, level_id",
    choices: "choice_id, question_id",
    
    //Offline sync tracking
    sync_queue: "++sync_id, action_type, status" 
});
