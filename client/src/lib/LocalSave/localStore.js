import { localDb } from "./localDb";


export const saveToLocalDb = async (tableName, data) => {
    try {
        // Appending last_synced universally if required by your offline-sync architecture
        const payload = {
            ...data,
            last_synced: Date.now() 
        };
        
        await localDb[tableName].put(payload);
    } catch (error) {
        console.error(`Failed to save data locally to ${tableName}:`, error);
        throw error; // Rethrowing allows the calling component to handle UI error states
    }
}