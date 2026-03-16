import { APP_VERSION, PRESET } from "./config.js";
import { todayStr, timeStr, uid, normalizeNames, escapeHtml, downloadJson, fileToBase64 } from "./utils.js";
import { getData, setData, getConfig, setConfig, getTheme, setTheme } from "./storage.js";
import { pingApi, saveEntryWithImage, syncPendingEntries } from "./api.js";

const $ = (id) => document.getElementById(id);

const state = {
  currentImageDataUrl: "",
};

function applyTheme() {
  document.body.dataset.theme = getTheme();
}
function toggleTheme() {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  document.body.dataset.theme = next;
  setTheme(next);
}

function init() {
  console.info("Story Tracker", APP_VERSION, PRESET);
  applyTheme();
  $("entryDate").value = todayStr();
  $("entryTime").value = timeStr();

  const config = getConfig();
  $("apiUrl").value = config.apiUrl || "";
  $("ownerName").value = config.ownerName || "";

  bind();
  render();
}

function bind() {
  $("toggleThemeBtn").addEventListener("click", toggleTheme);
  $("saveConfigBtn").addEventListener("click", saveConfig);
  $("testBtn").addEventListener("click", testApi);
  $("entryImage").addEventListener("change", handleImageSelect);
  $("entryForm").addEventListener("submit", handleSaveEntry);
  $("syncBtn").addEventListener("click", handleSyncPending);
  $("demoBtn").addEventListener("click", seedDemo);
  $("exportBtn").addEventListener("click", () => downloadJson(getData(), "story_tracker_screenshot_export.json"));
  $("searchInput").addEventListener("input", render);
  $("startDate").addEventListener("input", render);
  $("endDate").addEventListener("input", render);
}

function saveConfig() {
  const config = {
    apiUrl: $("apiUrl").value.trim(),
    ownerName: $("ownerName").value.trim(),
  };
  setConfig(config);
  alert("บันทึกการตั้งค่าแล้ว");
}

async function testApi() {
  try {
    await pingApi();
    $("apiStatus").textContent = "สถานะ: เชื่อมต่อสำเร็จ";
  } catch (error) {
    $("apiStatus").textContent = `สถานะ: ${error.message}`;
  }
}

async function handleImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await fileToBase64(file);
  state.currentImageDataUrl = dataUrl;
  $("imagePreview").src = dataUrl;
  $("imagePreview").classList.remove("hidden");
  $("imagePreviewEmpty").classList.add("hidden");
}

function buildEntry() {
  const viewers = normalizeNames($("entryViewers").value);
  if (!viewers.length) throw new Error("กรุณากรอกรายชื่ออย่างน้อย 1 ชื่อ");

  const config = getConfig();
  return {
    id: uid(),
    date: $("entryDate").value || todayStr(),
    time: $("entryTime").value || timeStr(),
    type: $("entryType").value,
    label: $("entryLabel").value.trim() || "ไม่ได้ระบุ",
    note: $("entryNote").value.trim(),
    viewers,
    ownerName: config.ownerName || "",
    imageBase64: state.currentImageDataUrl || "",
    imageDriveUrl: "",
    syncStatus: "pending",
    updatedAt: new Date().toISOString(),
  };
}

async function handleSaveEntry(event) {
  event.preventDefault();
  try {
    const entry = buildEntry();
    const rows = getData();
    rows.unshift(entry);
    setData(rows);

    if (getConfig().apiUrl) {
      await saveEntryWithImage(entry);
    }

    resetForm();
    render();
    alert("บันทึกข้อมูลแล้ว");
  } catch (error) {
    alert(error.message || "เกิดข้อผิดพลาด");
  }
}

function resetForm() {
  $("entryLabel").value = "";
  $("entryNote").value = "";
  $("entryViewers").value = "";
  $("entryImage").value = "";
  state.currentImageDataUrl = "";
  $("imagePreview").src = "";
  $("imagePreview").classList.add("hidden");
  $("imagePreviewEmpty").classList.remove("hidden");
}

async function handleSyncPending() {
  try {
    const result = await syncPendingEntries();
    render();
    alert(`Sync สำเร็จ ${result.syncedCount} รายการ`);
  } catch (error) {
    alert(error.message || "Sync ไม่สำเร็จ");
  }
}

function seedDemo() {
  const config = getConfig();
  const sample = [
    { date:"2026-03-14", time:"09:45", type:"story", label:"Story เช้า", note:"ตัวอย่าง", viewers:["Aom","Biggy","Mint"] },
    { date:"2026-03-15", time:"18:30", type:"story", label:"Story เย็น", note:"ตัวอย่าง", viewers:["Aom","Biggy","Beam","Fern"] },
    { date:"2026-03-16", time:"20:15", type:"reel", label:"Reel สั้น", note:"ตัวอย่าง", viewers:["Biggy","Mint","Ploy"] },
  ].map(entry => ({
    ...entry,
    id: uid(),
    ownerName: config.ownerName || "",
    imageBase64: "",
    imageDriveUrl: "",
    syncStatus: "pending",
    updatedAt: new Date().toISOString(),
  }));
  setData([...sample, ...getData()]);
  render();
}

function filteredData() {
  const query = $("searchInput").value.trim().toLowerCase();
  const start = $("startDate").value;
  const end = $("endDate").value;

  return getData().filter(entry => {
    const matchesQuery = !query
      || entry.viewers.some(name => name.toLowerCase().includes(query))
      || String(entry.label || "").toLowerCase().includes(query)
      || String(entry.note || "").toLowerCase().includes(query);

    const matchesStart = !start || entry.date >= start;
    const matchesEnd = !end || entry.date <= end;

    return matchesQuery && matchesStart && matchesEnd;
  });
}

function renderStats(rows) {
  const totalEntries = rows.length;
  const totalViewers = rows.reduce((sum, entry) => sum + entry.viewers.length, 0);
  const uniqueViewers = new Set(rows.flatMap(entry => entry.viewers.map(name => name.toLowerCase()))).size;
  const withImage = rows.filter(entry => entry.imageDriveUrl || entry.imageBase64).length;
  const pendingSync = getData().filter(entry => entry.syncStatus !== "synced").length;

  const stats = [
    ["จำนวนรายการ", totalEntries],
    ["จำนวนชื่อรวม", totalViewers],
    ["คนไม่ซ้ำ", uniqueViewers],
    ["มีภาพแนบ", withImage],
    ["ค้างรอ Sync", pendingSync],
  ];

  $("statsGrid").innerHTML = stats.map(([label, value]) => `
    <div class="stat-card">
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>
  `).join("");
}

function renderRanking(rows) {
  const count = {};
  const days = {};
  const byDate = {};
  const display = {};

  for (const row of rows) {
    byDate[row.date] ||= new Set();
    const seen = new Set();
    for (const name of row.viewers) {
      const key = name.toLowerCase();
      count[key] = (count[key] || 0) + 1;
      display[key] ||= name;
      byDate[row.date].add(key);
      if (!seen.has(key)) {
        days[key] = (days[key] || 0) + 1;
        seen.add(key);
      }
    }
  }

  const ranked = Object.keys(count)
    .map(key => ({ name: display[key], total: count[key], days: days[key] || 0 }))
    .sort((a,b) => b.total - a.total || b.days - a.days || a.name.localeCompare(b.name, "th"));

  $("rankingList").innerHTML = ranked.length ? ranked.slice(0,10).map((row, index) => `
    <div class="row-card">
      <div>
        <div class="row-title">${index + 1}. ${escapeHtml(row.name)}</div>
        <div class="row-meta">รวม ${row.total} ครั้ง • โผล่ ${row.days} วัน</div>
      </div>
      <span class="badge">${row.total}</span>
    </div>
  `).join("") : '<div class="empty">ยังไม่มีข้อมูล</div>';
}

function renderHistory(rows) {
  const ordered = [...rows].sort((a,b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  $("historyList").innerHTML = ordered.length ? ordered.map(row => `
    <div class="row-card">
      <div>
        <div class="row-title">${escapeHtml(row.date)} ${escapeHtml(row.time || "")} • ${escapeHtml(row.type)}</div>
        <div class="row-meta">${escapeHtml(row.label || "")}${row.note ? " • " + escapeHtml(row.note) : ""}</div>
        <div class="row-meta">sync: ${escapeHtml(row.syncStatus || "pending")}${row.imageDriveUrl ? ' • <a href="' + escapeHtml(row.imageDriveUrl) + '" target="_blank" rel="noopener">เปิดรูปใน Drive</a>' : ''}</div>
        <div class="tags">${row.viewers.map(name => `<span class="tag">${escapeHtml(name)}</span>`).join("")}</div>
      </div>
      <div>
        <span class="badge">${row.viewers.length} รายชื่อ</span>
      </div>
    </div>
  `).join("") : '<div class="empty">ยังไม่มีประวัติ</div>';
}

function render() {
  const rows = filteredData();
  renderStats(rows);
  renderRanking(rows);
  renderHistory(rows);
}

init();
