import { getConfig, getData, setData } from "./storage.js";

async function request(action, payload = {}) {
  const config = getConfig();
  if (!config.apiUrl) throw new Error("ยังไม่ได้ตั้งค่า Web App URL");
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || "API error");
  return data;
}

export async function pingApi() {
  return request("ping", {});
}

export async function saveEntryWithImage(entry) {
  const result = await request("saveEntryWithImage", { entry });
  const synced = getData().map(item => item.id === entry.id ? { ...item, syncStatus: "synced", imageDriveUrl: result.imageDriveUrl || item.imageDriveUrl || "" } : item);
  setData(synced);
  return result;
}

export async function syncPendingEntries() {
  const pending = getData().filter(item => item.syncStatus !== "synced");
  let count = 0;
  for (const entry of pending) {
    await saveEntryWithImage(entry);
    count += 1;
  }
  return { ok: true, syncedCount: count };
}
