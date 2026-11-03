// English Fun – progress report for parents.
// Paste this into Extensions → Apps Script of your Google Sheet, then deploy as a Web app.

// Choose a secret code for the parents' app (numbers or letters). Change it before deploying!
const PARENT_PIN = 'CHANGE-ME';

const SHEET_NAME = 'ילדים';
const HEAD = ['id', 'שם', 'רמה', 'כוכבים', 'ימים ברצף', 'שיחק לאחרונה', 'עודכן', 'נתונים', 'הורים'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}
function findRow_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function json_(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }

// Kids' phones send progress here; parents save goals and messages here.
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const b = JSON.parse(e.postData.contents);
    const sh = sheet_();
    if (b.action === 'progress') {
      const k = b.kid;
      if (!k || !k.id) return out_({ ok: false });
      const r = findRow_(sh, k.id);
      const parent = r ? String(sh.getRange(r, 9).getValue() || '{}') : '{}';
      const row = [String(k.id), k.name, k.levelName || k.level, k.earned, k.streak,
        k.lastPlayed ? new Date(k.lastPlayed) : '', new Date(), JSON.stringify(k), parent];
      if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
      return out_({ ok: true, parent: json_(parent) });
    }
    if (b.action === 'parent') {
      if (String(b.pin) !== PARENT_PIN) return out_({ ok: false, error: 'pin' });
      const r = findRow_(sh, b.id);
      if (!r) return out_({ ok: false, error: 'kid' });
      if (b.remove) { sh.deleteRow(r); return out_({ ok: true }); }
      sh.getRange(r, 9).setValue(JSON.stringify(b.parent || {}));
      return out_({ ok: true });
    }
    return out_({ ok: false, error: 'action' });
  } finally {
    lock.releaseLock();
  }
}

// The parents' app reads everything here (needs the code).
function doGet(e) {
  if (String(e.parameter.pin) !== PARENT_PIN) return out_({ ok: false, error: 'pin' });
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, 9).getValues() : [];
  const kids = rows.filter(r => r[0]).map(r => Object.assign(json_(r[7]), { parent: json_(r[8]) }));
  return out_({ ok: true, kids });
}
