/**
 * Story Tracker Screenshot + Drive Edition
 * ผูกกับ Google Sheet ID และ Drive Folder ID ที่ผู้ใช้ส่งมา
 */

const SHEET_ID = '16O2RbsLlDIQFqFiPGEctfuPy-Ke9Lz-ayHqjOIHUEjo';
const DRIVE_FOLDER_ID = '1bTq3bEORC82W6DUGvmgXd7NgP54QbaCm';

const SHEET_ENTRIES = 'Entries';
const SHEET_CONFIG = 'Config';

function doGet(e) {
  return jsonOutput({
    ok: true,
    message: 'Story Tracker Screenshot API running',
    spreadsheetId: SHEET_ID,
    driveFolderId: DRIVE_FOLDER_ID,
    ts: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    ensureSchema_();
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const payload = body.payload || {};

    switch (action) {
      case 'ping':
        return jsonOutput({
          ok: true,
          message: 'pong',
          spreadsheetId: SHEET_ID,
          driveFolderId: DRIVE_FOLDER_ID,
          ts: new Date().toISOString()
        });
      case 'saveEntryWithImage':
        return jsonOutput(handleSaveEntryWithImage_(payload));
      case 'listEntries':
        return jsonOutput(handleListEntries_());
      default:
        return jsonOutput({ ok: false, message: 'Unknown action' });
    }
  } catch (err) {
    return jsonOutput({
      ok: false,
      message: err.message,
      stack: String(err.stack || '')
    });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function ensureSchema_() {
  const ss = getSpreadsheet_();
  getOrCreateSheet_(ss, SHEET_ENTRIES, [
    'id', 'date', 'time', 'type', 'label', 'note',
    'viewers_count', 'viewers_json', 'ownerName',
    'imageDriveUrl', 'imageFileId', 'syncStatus', 'updatedAt'
  ]);
  getOrCreateSheet_(ss, SHEET_CONFIG, [
    'key', 'value', 'updatedAt'
  ]);
}

function getOrCreateSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else {
    const currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    if (currentHeaders.join('|') !== headers.join('|')) {
      sh.clear();
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function handleSaveEntryWithImage_(payload) {
  const entry = payload.entry || {};
  if (!entry.id) throw new Error('Missing entry.id');

  let imageDriveUrl = entry.imageDriveUrl || '';
  let imageFileId = '';

  if (entry.imageBase64) {
    const uploaded = uploadImageToDrive_(entry.imageBase64, entry);
    imageDriveUrl = uploaded.url;
    imageFileId = uploaded.fileId;
  }

  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(SHEET_ENTRIES);
  const values = sh.getDataRange().getValues();
  let foundRow = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(entry.id)) {
      foundRow = i + 1;
      break;
    }
  }

  const row = [
    entry.id,
    entry.date || '',
    entry.time || '',
    entry.type || '',
    entry.label || '',
    entry.note || '',
    Array.isArray(entry.viewers) ? entry.viewers.length : 0,
    JSON.stringify(entry.viewers || []),
    entry.ownerName || '',
    imageDriveUrl,
    imageFileId,
    'synced',
    entry.updatedAt || new Date().toISOString()
  ];

  if (foundRow) {
    sh.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }

  return {
    ok: true,
    message: 'Entry saved',
    imageDriveUrl: imageDriveUrl,
    imageFileId: imageFileId,
    id: entry.id
  };
}

function uploadImageToDrive_(dataUrl, entry) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const match = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data');

  const mimeType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const extension = mimeType.split('/')[1] || 'png';
  const filename = buildFilename_(entry, extension);
  const blob = Utilities.newBlob(bytes, mimeType, filename);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // บางองค์กรอาจไม่ให้แชร์ public
  }

  return {
    fileId: file.getId(),
    url: file.getUrl()
  };
}

function buildFilename_(entry, extension) {
  const safeLabel = String(entry.label || 'story')
    .replace(/[^A-Za-z0-9ก-๙_-]+/g, '_')
    .slice(0, 40);
  return [entry.date || 'date', entry.time || 'time', safeLabel, entry.id].join('_') + '.' + extension;
}

function handleListEntries_() {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(SHEET_ENTRIES);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return { ok: true, entries: [] };

  const rows = values.slice(1).map(r => ({
    id: r[0],
    date: r[1],
    time: r[2],
    type: r[3],
    label: r[4],
    note: r[5],
    viewers_count: r[6],
    viewers: safeJsonParse_(r[7], []),
    ownerName: r[8],
    imageDriveUrl: r[9],
    imageFileId: r[10],
    syncStatus: r[11],
    updatedAt: r[12]
  }));

  return { ok: true, entries: rows };
}

function safeJsonParse_(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function setupScreenshotEdition() {
  ensureSchema_();
  const ss = getSpreadsheet_();
  [SHEET_ENTRIES, SHEET_CONFIG].forEach(name => {
    const sh = ss.getSheetByName(name);
    sh.getRange(1, 1, 1, sh.getLastColumn())
      .setFontWeight('bold')
      .setBackground('#d9eaff');
    sh.autoResizeColumns(1, sh.getLastColumn());
  });
  return 'Screenshot Edition setup complete';
}
