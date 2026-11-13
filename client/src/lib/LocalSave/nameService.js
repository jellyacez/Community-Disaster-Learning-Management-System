import { localDb } from "../localDb";
import { enqueueMemoryTask } from "./syncManager";
import { preparePersonName } from "../../utils/personName";

// Unlike the legacy UPDATE_NAME payload, this carries all name components.
function patchOfflineSession(userId, data) {
  try {
    const key = "lms_offline_session";
    const session = JSON.parse(localStorage.getItem(key) || "null");
    if (String(session?.user?.id) !== String(userId)) return;
    session.user = { ...session.user, ...data };
    localStorage.setItem(key, JSON.stringify(session));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // the queued write still works without the session cache
  }
}

export async function saveOfflinePersonName(userId, input) {
  const { errors, data } = preparePersonName(input);
  if (!data) return { status: "failed", error: Object.values(errors)[0] };
  const payload = { user_id: userId, ...data };
  try {
    await localDb.transaction(
      "rw",
      localDb.user,
      localDb.sync_queue,
      async () => {
        const existing = await localDb.user.get(userId);
        await localDb.user.put({
          ...existing,
          id: userId,
          ...data,
          updatedAt: Date.now(),
        });
        await localDb.sync_queue.add({
          action_type: "UPDATE_NAME",
          status: "pending",
          payload,
        });
      },
    );
    patchOfflineSession(userId, data);
    window.dispatchEvent(new CustomEvent("offline-sync-queue-updated"));
    return { status: "queued" };
  } catch {
    try {
      const result = enqueueMemoryTask("UPDATE_NAME", payload);
      patchOfflineSession(userId, data);
      window.dispatchEvent(new CustomEvent("offline-sync-queue-updated"));
      return { status: "queued_memory_only", warning: result?.warning };
    } catch {
      return {
        status: "failed",
        error: "Your device could not save this name change offline.",
      };
    }
  }
}
