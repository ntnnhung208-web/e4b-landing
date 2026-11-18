/** E4B · Máy chủ nhỏ ghi đăng ký vào Google Sheet (Apps Script)
 *  Triển khai: Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone
 */
const SH_REG = 'Đăng ký', SH_VIS = 'Lượt truy cập';
const REG_COLS = ['id','token','orderCode','createdAt','name','phone','email','plan','price','level','source','status','paidReportedAt','note','updatedAt'];
const VIS_COLS = ['id','day','source','createdAt'];
const STATUSES = ['Mới đăng ký','Đã liên hệ','Đã thanh toán','Đã kích hoạt','Không mua'];

const SHEET_ID = '1zL7llZJQ52ZEetgLhaTrPkWXdJ-KeEEAvzxJ57pD1is';
function ss_(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet_(name, cols){
  let s = ss_().getSheetByName(name);
  if (!s){ s = ss_().insertSheet(name); s.appendRow(cols); s.setFrozenRows(1); }
  return s;
}
function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss"); }
function today_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function str_(v, n){ return String(v == null ? '' : v).slice(0, n || 300); }
function rows_(s, cols){
  const v = s.getDataRange().getValues(); v.shift();
  return v.map((r, i) => { const o = {_row: i + 2}; cols.forEach((c, j) => o[c] = r[j] instanceof Date ? Utilities.formatDate(r[j], 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss") : r[j]); return o; });
}
function findReg_(s, id){ return rows_(s, REG_COLS).find(r => r.id === id); }
const ADMIN_KEY = '__ADMIN_KEY__'; // mật khẩu trang quản trị
function checkKey_(k){ return k === ADMIN_KEY; }

function doGet(){ return out_({ok: true, service: 'e4b'}); }

function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    const a = b.action;
    if (a === 'dang-ky') return out_(register_(b));
    if (a === 'bao-thanh-toan') return out_(markPaid_(b));
    if (a === 'luot-truy-cap') return out_(visit_(b));
    if (a && a.startsWith('admin-')){
      if (!checkKey_(b.key)) return out_({ok: false, error: 'Sai mật khẩu quản trị.', auth: false});
      if (a === 'admin-list') return out_(adminList_());
      if (a === 'admin-update') return out_(adminUpdate_(b));
      if (a === 'admin-import') return out_(adminImport_(b));
    }
    return out_({ok: false, error: 'Yêu cầu không hợp lệ.'});
  } catch (err) {
    return out_({ok: false, error: 'Lỗi máy chủ: ' + err.message});
  } finally { lock.releaseLock(); }
}

function register_(b){
  const name = str_(b.name, 120).trim(), phone = str_(b.phone, 30).trim(), email = str_(b.email, 160).trim();
  if (!b.id || !b.token || !name || !phone) return {ok: false, error: 'Thiếu họ tên hoặc số điện thoại.'};
  const s = sheet_(SH_REG, REG_COLS), ex = findReg_(s, str_(b.id, 64));
  const vals = {name, phone, email, plan: str_(b.plan, 200), price: str_(b.price, 40), level: str_(b.level, 60), source: str_(b.source, 40), updatedAt: now_()};
  if (ex){
    if (ex.token !== b.token) return {ok: false, error: 'Không cập nhật được đăng ký.'};
    REG_COLS.forEach((c, j) => { if (c in vals) s.getRange(ex._row, j + 1).setValue(vals[c]); });
    return {ok: true, orderCode: ex.orderCode};
  }
  const row = Object.assign({id: str_(b.id, 64), token: str_(b.token, 64), orderCode: str_(b.orderCode, 30), createdAt: now_(), status: 'Mới đăng ký', paidReportedAt: '', note: ''}, vals);
  s.appendRow(REG_COLS.map(c => row[c] || ''));
  return {ok: true, orderCode: row.orderCode};
}
function markPaid_(b){
  const s = sheet_(SH_REG, REG_COLS), ex = findReg_(s, str_(b.id, 64));
  if (!ex || ex.token !== b.token) return {ok: false, error: 'Không tìm thấy đăng ký. Bạn liên hệ Zalo 0876807971 nhé.'};
  s.getRange(ex._row, REG_COLS.indexOf('paidReportedAt') + 1).setValue(now_());
  s.getRange(ex._row, REG_COLS.indexOf('updatedAt') + 1).setValue(now_());
  return {ok: true};
}
function visit_(b){
  const s = sheet_(SH_VIS, VIS_COLS), id = str_(b.id, 64), day = today_();
  if (!id) return {ok: false};
  const ids = s.getRange(Math.max(2, s.getLastRow() - 3000), 1, Math.min(3001, Math.max(1, s.getLastRow() - 1)), 2).getValues();
  if (ids.some(r => r[0] === id && String(r[1]).slice(0,10) === day)) return {ok: true};
  s.appendRow([id, day, str_(b.source, 40) || 'direct', now_()]);
  return {ok: true};
}
function adminList_(){
  return {ok: true, statuses: STATUSES,
    regs: rows_(sheet_(SH_REG, REG_COLS), REG_COLS).map(r => { delete r.token; return r; }),
    visits: rows_(sheet_(SH_VIS, VIS_COLS), VIS_COLS).map(r => ({day: String(r.day).slice(0,10), source: r.source}))};
}
function adminUpdate_(b){
  const s = sheet_(SH_REG, REG_COLS), ex = findReg_(s, b.id);
  if (!ex) return {ok: false, error: 'Không tìm thấy khách.'};
  ['name','phone','email','plan','price','status','note','paidReportedAt'].forEach(c => {
    if (b.fields && c in b.fields) s.getRange(ex._row, REG_COLS.indexOf(c) + 1).setValue(str_(b.fields[c], 500));
  });
  s.getRange(ex._row, REG_COLS.indexOf('updatedAt') + 1).setValue(now_());
  return {ok: true};
}
function adminImport_(b){
  const s = sheet_(SH_REG, REG_COLS), have = new Set(rows_(s, REG_COLS).map(r => r.orderCode));
  let n = 0;
  (b.rows || []).forEach(r => {
    if (!r.orderCode || have.has(r.orderCode)) return;
    const row = Object.assign({id: Utilities.getUuid(), token: Utilities.getUuid(), status: 'Mới đăng ký'}, r);
    s.appendRow(REG_COLS.map(c => row[c] || '')); n++;
  });
  return {ok: true, imported: n};
}
