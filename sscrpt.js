// طباعة
document.getElementById('print-button')?.addEventListener('click', ()=>window.print());

// مُختصر لجلب العناصر
const $ = (id)=>document.getElementById(id);

// ضبط التاريخ الهجري + اليوم تلقائيًا + إرسالها للباك إن توفّر Electron
function setHijriAndDayNow(){
  const now = new Date();
  let useYesterday = false;

  const hour = now.getHours();
  const minute = now.getMinutes();

  // بين 00:00 و 05:40 نرجع لليوم السابق
  if (hour < 5 || (hour === 5 && minute < 40)) {
    now.setDate(now.getDate() - 1);
    useYesterday = true;
  }
// داخل setHijriAndDayNow()… بعد حساب hour/minute وتعبئة الحقول
{
  const mins = hour * 60 + minute;
  const inShiftChangeWindow = (mins >= 5*60 && mins < 6*60); // 05:00–05:59

  const dateEl = $('custom-hijri-date');
  const dayEl  = $('custom-weekday');
  const hdrEl  = $('header-date');
  const noteEl = $('shift-change-note');

  [dateEl, dayEl].forEach(el => el?.classList.toggle('orange-highlight', inShiftChangeWindow));
  hdrEl?.classList.toggle('orange-text', inShiftChangeWindow);
  if (noteEl) noteEl.style.display = inShiftChangeWindow ? 'block' : 'none';
}

  const fmt = new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value || '';
  const m = parts.find(p => p.type === 'month')?.value || '';
  const d = parts.find(p => p.type === 'day')?.value || '';
  const RLM = "\u200F";
  const hijri = `${RLM}${d}/${m}/${y} هـ`; // ستُعرض بأرقام إنجليزية

  const weekday = new Intl.DateTimeFormat('ar-SA',{weekday:'long', numberingSystem:'arab'}).format(now);

  $('custom-hijri-date') && ( $('custom-hijri-date').value = hijri );
  $('custom-weekday')    && ( $('custom-weekday').value    = weekday );

  const hdr = $('header-date');
  if (hdr) hdr.textContent = `${weekday} - ${hijri}`;

  const alertBox = $('shift-alert');
  if (alertBox) alertBox.style.display = useYesterday ? 'block' : 'none';

  // إرسال للباك لكتابة deta.txt
  if (window.electronAPI && typeof window.electronAPI.sendDateInfo === 'function') {
    try { window.electronAPI.sendDateInfo(hijri, weekday); } catch(e){}
  }

  // ===== الإضافات الجديدة: تعبئة "تاريخ الموازنة" و"يوم الموازنة" بالغد تلقائيًا =====
  try {
    // نعتمد نفس "now" المعدّل أعلاه، ثم نأخذ الغد (+1)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // نفس Formatter الهجري المستخدم فوق
    const partsT = fmt.formatToParts(tomorrow);
    const yT = partsT.find(p => p.type === 'year')?.value || '';
    const mT = partsT.find(p => p.type === 'month')?.value || '';
    const dT = partsT.find(p => p.type === 'day')?.value || '';
    const hijriTomorrow = `${RLM}${dT}/${mT}/${yT} هـ`;

    const weekdayTomorrow = new Intl.DateTimeFormat('ar-SA', { weekday:'long', numberingSystem:'arab' }).format(tomorrow);

    // نملأها فقط إذا كانت فارغة (حتى لا نكتب فوق تعديل المستخدم)
    const balDateEl = document.getElementById('BalanceDateNight');
    if (balDateEl && !balDateEl.value) balDateEl.value = hijriTomorrow;

    const balDayEl = document.getElementById('BalanceWeekday');
    if (balDayEl && !balDayEl.value) balDayEl.value = weekdayTomorrow;
  } catch (e) {
    // تجاهُل أي خطأ غير متوقع
  }
}




// تحميل الجنسيات إلى datalist#nationalities
async function loadNationalities() {
  try {
    const res = await fetch('nationalities.json', { cache: 'no-store' });
    const items = await res.json();
    const dl = $('nationalities');
    if (!dl) return;
    dl.innerHTML = '';
    items.forEach(it => {
      const name = typeof it === 'string' ? it : (it.name_ar || it.name);
      if (!name) return;
      const opt = document.createElement('option');
      opt.value = name;
      dl.appendChild(opt);
    });
  } catch (e) {
    console.error('❌ خطأ في تحميل nationalities.json:', e);
  }
}

// تحميل أنواع التأشيرات إلى datalist#visaTypes (إن توفر الملف)
async function loadVisaTypes() {
  const dl = $('visaTypes');
  if (!dl) return;
  dl.innerHTML = '';
  try {
    const res = await fetch('visa_types.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('لا يوجد visa_types.json');
    const types = await res.json();
    (Array.isArray(types) ? types : []).forEach(t => {
      const val = typeof t === 'string' ? t : (t.name_ar || t.name);
      if (!val) return;
      const opt = document.createElement('option');
      opt.value = val;
      dl.appendChild(opt);
    });
  } catch {
    // قائمة افتراضية في حال عدم وجود الملف
    ['زيارة','خروج وعودة',' خروج نهائي',' زيارة سياحية','مرور','عمرة','زيارة عائلية','زيارة رجال اعمال'].forEach(v=>{
      const opt = document.createElement('option'); opt.value = v; dl.appendChild(opt);
    });
  }
}

// تحميل الضباط وربط الرتب تلقائياً + دعم الآمر المناوب
// تحميل الضباط وربط الرتب تلقائياً
async function loadOfficers() {
  try {
    const response = await fetch("officers.json", { cache: 'no-store' });
    const officers = await response.json();

    const officerInput = $('officer-name');
    const rankInput    = $('officer-rank');
    const namesDL      = $('names');

    if (namesDL) {
      namesDL.innerHTML = "";
      officers.forEach(officer => {
        const option = document.createElement("option");
        option.value = officer.name;
        namesDL.appendChild(option);
      });
    }

    if (officerInput && rankInput) {
      officerInput.addEventListener("change", () => {
        const selected = officers.find(o => o.name === officerInput.value.trim());
        rankInput.value = selected ? selected.rank : "";
      });
    }
  } catch (err) {
    console.error("❌ خطأ في تحميل officers.json:", err);
  }
}
// تحميل الآمر المناوب وربط الرتب تلقائياً
async function loadCommander() {
  try {
    const response = await fetch("commander-name.json", { cache: 'no-store' });
    const commanders = await response.json();

    const commanderInput     = $('commander-name');
    const commanderRankInput = $('commander-rank');
    const commandersDL       = $('commanders');

    if (commandersDL) {
      commandersDL.innerHTML = "";
      commanders.forEach(commander => {
        const opt = document.createElement("option");
        opt.value = commander.name;
        commandersDL.appendChild(opt);
      });
    }

    if (commanderInput && commanderRankInput) {
      commanderInput.addEventListener("change", () => {
        const selected = commanders.find(c => c.name === commanderInput.value.trim());
        commanderRankInput.value = selected ? selected.rank : "";
      });
    }
  } catch (err) {
    console.error("❌ خطأ في تحميل commander-name.json:", err);
  }
}


// جمع القيم المراد حفظها
function collect(){
  return {
    TodayDate:        $('custom-hijri-date')?.value || '',
    Day:              $('custom-weekday')?.value    || '',
    Shift:            $('shift-number')?.value      || '',
    HallNumber:       $('hall-number')?.value       || '',
    OfficerName:      $('officer-name')?.value      || '',
    Rank:             $('officer-rank')?.value      || '',
    // المسافر
    TravelerName:     $('TravelerName')?.value      || '',
    Nationality:      $('Nationality')?.value       || '',
    PassportNumber:   $('PassportNumber')?.value    || '',
    TravelerID:       $('id')?.value                || '', // جديد: رقم (الحدود/الإقامة/الهوية) - مفتاح واضح بدل id
    VisaType:         $('VisaType')?.value          || '', // جديد: نوع التأشيرة
    // الرحلة
    AirlineName:      $('AirlineName')?.value       || '',
    FlightNumber:     $('FlightNumber')?.value      || '',
    TravelDestination:$('TravelDestination')?.value || '',
    IssuedNumber:     $('IssuedNumber')?.value      || '',
    // ✅ جديد: عدد المشفوعات
    AttachedCount:    $('AttachedCount')?.value     || '', 
    // الآمر المناوب
    CommanderName:    $('commander-name')?.value    || '', // جديد
    CommanderRank:    $('commander-rank')?.value    || '',  // جديد
      // بيانات الفرد (تظهر فقط عند absence)
    IndividualName:    $('IndividualName')?.value    || '',
    IndividualRank:    $('IndividualRank')?.value    || '',
          // وقت الاستلام
    ReceiveTimeFrom: $('ReceiveTimeFrom')?.value || '',
ReceiveTimeTo:   $('ReceiveTimeTo')?.value   || '',

BalanceTimeFrom:        $('BalanceTimeFrom')?.value        || '',
BalanceTimeTo:          $('BalanceTimeTo')?.value          || '',
EveningBalanceFrom:     $('EveningBalanceFrom')?.value     || '',
EveningBalanceTo:       $('EveningBalanceTo')?.value       || '',
BalanceDateNight:       $('BalanceDateNight')?.value       || ''
  };
}

// تحويل الكائن إلى نص INI على شكل سطور key=value
function payloadToIni(obj){
  return Object.entries(obj)
    .map(([k,v])=>`${k}=${(v??'').toString().replace(/\r|\n/g,' ').trim()}`)
    .join("\r\n");
}

// حفظ/تنفيذ
async function saveAll() {
  const data = collect();
  const ini  = payloadToIni(data);

  // حفظ نسخة في المتصفح + تنبيه مصغر
  localStorage.setItem('receipt_today_payload', JSON.stringify(data));
  const ok = $('check-officer-name');
  if (ok) { ok.style.display = 'inline'; setTimeout(() => ok.style.display = 'none', 1500); }

 // حفظ ملف المناوبة — معطّل افتراضيًا
const ENABLE_SHIFT_FILE = false;
if (ENABLE_SHIFT_FILE && window.electronAPI?.saveShift) {
  try { window.electronAPI.saveShift(data); } catch(e){}
}


  // إنشاء form.txt بترميز windows-1256 عبر IPC إن توفر، وإلا تنزيل مباشر
  if (window.electronAPI?.saveFormFile) {
    try {
      const res = await window.electronAPI.saveFormFile(ini);
      if (!res?.ok) alert('تعذّر إنشاء form.txt:\n' + (res?.error || ''));
    } catch (e) {
      alert('تعذّر حفظ form.txt عبر :\n' + (e?.message || e));
    }
  } else {
    try {
      const blob = new Blob([ini], { type: 'text/plain;charset=windows-1256' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'form.txt';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('تعذّر إنشاء form.txt (وضع المتصفح): ' + (e?.message || e));
    }
  }

  // فتح ملف Word بعد الحفظ
 try {
  const wordLink = document.createElement("a");

  // ✅ اختيار الرابط بناءً على القيمة المخزنة في localStorage
  const choice = localStorage.getItem("wordLinkChoice");

  if (choice === "refused") {
    wordLink.href = "dic/نــماذج  اليومية/خطاب باسم .docm";
  } else if (choice === "canceled") {
    wordLink.href = "dic/نــماذج  اليومية/خطاب بدون اسم.docm";
    } else if (choice === "moatan") {
    wordLink.href = "dic/السعودين/مواطن مغادر.docm";
    } else if (choice === "Unable") {
    wordLink.href = "dic/نــماذج  اليومية/تعذر مغادرة.docm";
     }else if (choice === "absence") {
    // ✅ غياب أفراد
    wordLink.href = "dic/نماذج الافراد/غياب افراد.docm";
    }else if (choice === "absence2") {
    wordLink.href = "dic/نماذج الافراد/غياب مجندات.docm";
    }else if (choice === "FINGER") {
    wordLink.href = "dic/خطابات جاهزة لتعديل/عدم قبول الخصائص الحيوية.docm";
  } else {
    wordLink.href = "default.docm"; // أو رابط افتراضي إن أردت
  }

  

  wordLink.target = "_top";
  wordLink.click();
  console.log(`✔ تم فتح ${wordLink.href} بعد حفظ form.txt`);
} catch (e) {
  console.error("❌ فشل في فتح الملف:", e);
}


 setTimeout(() => {
  try {
    localStorage.removeItem('wordLinkChoice');
    localStorage.removeItem('lastWordLinkChoice'); // إن كنت ستستخدم نسخة احتياطية
  } catch(e){}
  window.history.back();
}, 2 * 60 * 1000);

}




// اخفاء حقول بشروط 
// إخفاء حقول وبطاقات عندما تكون wordLinkChoice = "canceled"
document.addEventListener("DOMContentLoaded", () => {
  const choice = localStorage.getItem("wordLinkChoice");

  if (choice === "canceled") {
    // 1) إخفاء رقم الهوية
    const idField = document.getElementById("id");
    const idLabel = document.querySelector("label[for='id']");
    if (idField) idField.style.display = "none";
    if (idLabel) idLabel.style.display = "none";

    // 2) إخفاء نوع التأشيرة
    const visaField = document.getElementById("VisaType");
    const visaLabel = document.querySelector("label[for='VisaType']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";

    // 3) إخفاء بطاقة بيانات الرحلة كاملة
    const flightCard = document.getElementById("card-flight");
    if (flightCard) flightCard.style.display = "none";

    // 4) إخفاء بطاقة بيانات المسافر كاملة
    const travelerCard = document.getElementById("card-traveler");
    if (travelerCard) travelerCard.style.display = "none";
  }


  if (choice === "moatan") {
    

    // 2) إخفاء نوع التأشيرة
    const visaField = document.getElementById("VisaType");
    const visaLabel = document.querySelector("label[for='VisaType']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";
    
    
  }
  

if (choice === "Unable") {
    

    // 2) إخفاء نوع التأشيرة
    const visaField = document.getElementById("VisaType");
    const visaLabel = document.querySelector("label[for='VisaType']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";

  }
  
// ===================
// وضع absence
// ===================
if (choice === "absence") {
  // 1) إظهار بطاقة "بيانات الفرد"
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  // 2) إخفاء جميع البطاقات ما عدا: التاريخ/المستلم + بيانات الفرد + بيانات الصادر
  const keepIds = new Set(["card-receipt", "card-individual", "card-issued"]);
  document.querySelectorAll(".card").forEach(card => {
    if (!keepIds.has(card.id)) card.style.display = "none";
  });

  // 3) إخفاء اسم/رتبة الآمر المناوب مع الـ labels
  const commanderName = document.getElementById("commander-name");
  const commanderRank = document.getElementById("commander-rank");

  if (commanderName) {
    commanderName.style.display = "none";
    const labelName = document.querySelector('label[for="commander-name"]');
    if (labelName) labelName.style.display = "none";
  }

  if (commanderRank) {
    commanderRank.style.display = "none";
    const labelRank = document.querySelector('label[for="commander-rank"]');
    if (labelRank) labelRank.style.display = "none";
  }
}

// ===================
// وضع absence2
// ===================
if (choice === "absence2") {
  // 1) إظهار بطاقة "بيانات الفرد"
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  // 2) إخفاء جميع البطاقات ما عدا: التاريخ/المستلم + بيانات الفرد + بيانات الصادر
  const keepIds = new Set(["card-receipt", "card-individual", "card-issued"]);
  document.querySelectorAll(".card").forEach(card => {
    if (!keepIds.has(card.id)) card.style.display = "none";
  });

  // 3) إخفاء اسم/رتبة الآمر المناوب مع الـ labels
  const commanderName = document.getElementById("commander-name");
  const commanderRank = document.getElementById("commander-rank");

  if (commanderName) {
    commanderName.style.display = "none";
    const labelName = document.querySelector('label[for="commander-name"]');
    if (labelName) labelName.style.display = "none";
  }

  if (commanderRank) {
    commanderRank.style.display = "none";
    const labelRank = document.querySelector('label[for="commander-rank"]');
    if (labelRank) labelRank.style.display = "none";
  }
}
// ===== وضع shafttime =====
if (choice === "shafttime") {
  // 1) إظهار بطاقة وقت الشفت والموازنة
  const shiftBalanceCard = document.getElementById("card-shift-balance");
  if (shiftBalanceCard) shiftBalanceCard.style.display = "block";

  // 2) إظهار بطاقة الصادر الخاصة بالشفت
  const issuedShaftCard = document.getElementById("card-issued-shaft");
  if (issuedShaftCard) issuedShaftCard.style.display = "block";

  // 3) إظهار حقول موظف القائمة + الأعمال الإدارية داخل بطاقة الاستلام/التاريخ
  const shaftOnlyFields = document.getElementById("shaft-only-fields");
  if (shaftOnlyFields) shaftOnlyFields.style.display = "block";

  // 4) إخفاء اسم/رتبة الآمر المناوب + ملصقاتها
  const hideSelectors = [
    "#commander-name",
    "label[for='commander-name']",
    "#commander-rank",
    "label[for='commander-rank']"
  ];
  hideSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.display = "none";
  });

  // 5) إظهار فقط البطاقات: التاريخ/المستلم + وقت الشفت + الصادر الخاص بالشفت
  const keep = new Set(["card-receipt","card-shift-balance","card-issued-shaft"]);
  document.querySelectorAll(".card").forEach(card => {
    card.style.display = keep.has(card.id) ? "block" : "none";
  });
}


  
});

// تفريغ الحقول
function clearAll(){
  const ids = [
    'officer-name','officer-rank','shift-number','hall-number',
    'TravelerName','Nationality','PassportNumber',
    'AirlineName','FlightNumber','TravelDestination','IssuedNumber','AttachedCount',
    'id','VisaType','commander-name','commander-rank','ReceiveTimeFrom','ReceiveTimeTo',
    // ✅ الحقول الجديدة
    'IndividualName','IndividualRank','ReceiveTimeFrom','ReceiveTimeTo',
'BalanceTimeFrom','BalanceTimeTo',
'EveningBalanceFrom','EveningBalanceTo',
'BalanceDateNight',

  ];

  ids.forEach(id => { const el = $(id); if (el) el.value=''; });
  localStorage.removeItem('receipt_today_payload');
  _userEditedReceiveTime = false;
setReceiveTimeAuto(true);

}



// أزرار الاختيارات السريعة (chips) — نسخة محسَّنة
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;

  const wrap = btn.closest('.actions');
  const targetSel = wrap?.getAttribute('data-target');
  if (!targetSel) return;

  const target = document.querySelector(targetSel);
  if (target) {
    // 1) عيّن القيمة
    target.value = btn.getAttribute('data-value') || '';

    // 2) أطلق حدث change يدويًا (المهم لكي تلتقطه بقية الأكواد)
    target.dispatchEvent(new Event('change', { bubbles: true }));

    // 3) إن كان الهدف المناوبة أو القاعة، عبّئ اقتراحات الأسماء فورًا
    if (targetSel === '#shift-number' || targetSel === '#hall-number') {
      if (typeof populateNamesForCurrentSelection === 'function') {
        populateNamesForCurrentSelection();
      }
      // (اختياري) ركّز المؤشر على حقل الاسم لتسهيل الكتابة لرؤية الاقتراحات
      const nameInput = document.getElementById('IndividualName');
      if (nameInput) {
        nameInput.focus();
        // لو تريد تهيئة الحقل: nameInput.value = ''; // (اختياري)
      }
    }
  }

  // مظهر تفعيل الزر
  wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
});


// ربط الأزرار الأساسية
$('save-btn')?.addEventListener('click', saveAll);
$('clear-btn')?.addEventListener('click', clearAll);
$('close-btn')?.addEventListener('click', ()=>{
  localStorage.removeItem('wordLinkChoice');
  localStorage.removeItem('lastWordLinkChoice');
  window.location.href = "Departure.html";
});


// اختياري: تبديل لغة الإدخال في رقم الجواز (إن وُجد دعم بالـ preload)
(function bindPassportLangToggle(){
  const passportInput = $('PassportNumber');
  if (!passportInput) return;
  passportInput.addEventListener("focus", () => { window.electronAPI?.switchLang?.(); });
  passportInput.addEventListener("blur",  () => { window.electronAPI?.switchLang?.(); });
})();

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", () => {
  setHijriAndDayNow();
  setInterval(setHijriAndDayNow, 60000);

  loadNationalities();
  loadVisaTypes();
  loadOfficers();
  loadCommander();

  // === وقت الاستلام التلقائي ===
  bindReceiveTimeEditGuards();
  setReceiveTimeAuto(true);              // أول تعبئة
  setInterval(()=> setReceiveTimeAuto(), 60000); // تحديث كل دقيقة طالما لم يحرره المستخدم
});

// نفس دوال التعليم المختصرة
function getFormInputs(){
  return Array.from(document.querySelectorAll('input, textarea, select'))
    .filter(el => el.type !== 'hidden' && !el.disabled && el.offsetParent !== null);
}
function updateFieldState(el){
  const val = (el.value ?? '').toString().trim();
  if (val === '') el.classList.add('empty-field');
  else el.classList.remove('empty-field');
}
function markEmptyFields(){ getFormInputs().forEach(updateFieldState); }

// تهيئة + فحص دوري (أسهل حل)
document.addEventListener('DOMContentLoaded', () => {
  markEmptyFields();                    // فحص أولي
  setInterval(markEmptyFields, 500);    // فحص كل 0.5 ثانية
});
// ==========================
// سكربت بيانات الفرد (بديل كامل)
// ==========================
"use strict";

// قاعدة الأسماء
let NAME_DB = null;

// توحيد قيمة المناوبة
function normalizeShift(val) {
  if (!val) return null;
  val = String(val).trim();
  const map = {
    "ا":"ا","أ":"ا","أ":"ا","A":"ا","a":"ا",
    "ب":"ب","B":"ب","b":"ب",
    "ج":"ج","J":"ج","j":"ج","C":"ج","c":"ج",
    "د":"د","D":"د","d":"د"
  };
  return map[val] || val;
}

// قراءة المناوبة والصالة من الحقول
function getShiftHall() {
  const shiftEl = document.getElementById("shift-number");
  const hallEl  = document.getElementById("hall-number");
  const shift = normalizeShift(shiftEl && shiftEl.value);
  const hall  = hallEl && hallEl.value ? String(hallEl.value).trim() : null;
  return { shift, hall };
}

// تعبئة اقتراحات الأسماء (datalist) حسب المناوبة والصالة
function populateNamesForCurrentSelection() {
  const dataList   = document.getElementById("individual-list");
  const nameInput  = document.getElementById("IndividualName");
  if (!dataList || !nameInput || !NAME_DB) return;

  dataList.innerHTML = ""; // تنظيف

  const { shift, hall } = getShiftHall();
  if (!shift || !hall || !NAME_DB[shift] || !NAME_DB[shift][hall]) return;

  NAME_DB[shift][hall].forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.name;   // يظهر كاقتراح
    opt.label = item.rank;   // بعض المتصفحات تعرض الرتبة بجانب الاسم
    dataList.appendChild(opt);
  });
}

// تعبئة الرتبة تلقائيًا عند مطابقة الاسم المختار/المكتوب
function autoFillRankByName() {
  const nameInput = document.getElementById("IndividualName");
  const rankInput = document.getElementById("IndividualRank");
  if (!nameInput || !rankInput || !NAME_DB) return;

  const { shift, hall } = getShiftHall();
  if (!shift || !hall || !NAME_DB[shift] || !NAME_DB[shift][hall]) return;

  const name = String(nameInput.value || "").trim();
  if (!name) return;

  const hit = NAME_DB[shift][hall].find(e => e.name === name);
  // نملأ الرتبة إن وجدنا الاسم، مع إبقاء إمكانية تعديلها يدويًا
  rankInput.value = hit ? (hit.rank || "") : rankInput.value;
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) تحميل قاعدة الأسماء name.json
  fetch("name.json")
    .then(r => r.json())
    .then(db => {
      NAME_DB = db;
      // تعبئة أولية إن كانت المناوبة/الصالة محددة
      populateNamesForCurrentSelection();
    })
    .catch(err => console.error("فشل تحميل name.json", err));

  // 2) تحديث الاقتراحات عند تغيير المناوبة أو الصالة
  const shiftEl = document.getElementById("shift-number");
  const hallEl  = document.getElementById("hall-number");
  if (shiftEl) shiftEl.addEventListener("change", populateNamesForCurrentSelection);
  if (hallEl)  hallEl.addEventListener("change",  populateNamesForCurrentSelection);

  // 3) تعبئة الرتبة تلقائيًا عند اختيار/كتابة الاسم
  const nameInput = document.getElementById("IndividualName");
  if (nameInput) {
    nameInput.addEventListener("change",  autoFillRankByName);
    nameInput.addEventListener("input",   autoFillRankByName);
    nameInput.addEventListener("blur",    autoFillRankByName);
  }

  // 4) منطق حالة absence (اختياري لكن مُفَعَّل هنا كما طلبت سابقًا)
  //    - إظهار بطاقة "بيانات الفرد"
  //    - إخفاء كل البطاقات عدا: التاريخ/المستلم + بيانات الفرد + بيانات الصادر
  //    - ربط نموذج الوورد لملف غياب الأفراد
  const choice = localStorage.getItem("wordLinkChoice");
  if (choice === "absence") {
    const individualCard = document.getElementById("card-individual");
    if (individualCard) individualCard.style.display = "block";

    const keepIds = new Set(["card-receipt", "card-individual", "card-issued"]);
    document.querySelectorAll(".card").forEach(card => {
      if (!keepIds.has(card.id)) card.style.display = "none";
    });

    const wordLink = document.getElementById("wordLink");
    if (wordLink) wordLink.href = "dic/نماذج الافراد/غياب افراد.docm";

    // إخفاء اسم/رتبة الآمر المناوب إن وُجدت عناصرها (بما فيها الـ label)
    ["#commander-name","label[for='commander-name']",
     "#commander-rank","label[for='commander-rank']"
    ].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = "none";
    });
  }
});




// ====== تحسين تفاعل الـ Chips (اختصارات) ======
// - إبقاء منطق الإدراج كما هو: إدخال القيمة في الحقل الهدف.
// - إبراز الاختيار بلون واضح (إضافة active + aria-pressed).
// - دعم لوحة المفاتيح.

(function(){
  function setActiveChip(container, btn){
    // إزالة التفعيل عن البقية
    container.querySelectorAll('.chip').forEach(c=>{
      c.classList.remove('active');
      c.setAttribute('aria-pressed','false');
    });
    // تفعيل الحالي
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');
  }

  // بالنقر
// ===== أزرار الاختيارات السريعة (chips) — تصحيح لحفظ قيمة shift/hall =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;

  // جد الحاوية التي تحتوي attribute data-target (قد تكون .chips أو أي عنصر)
  const wrap = btn.closest('[data-target]') || btn.parentElement;
  const targetSel = wrap?.getAttribute ? wrap.getAttribute('data-target') : null;
  if (!targetSel) return;

  const target = document.querySelector(targetSel);
  if (target) {
    // 1) عيّن القيمة في الحقل
    const val = btn.getAttribute('data-value') || '';
    target.value = val;

    // 2) أطلق أحداث change و input ليُلتقط التغيير من أي استماع
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));

    // 3) إذا كان الهدف هو المناوبة أو الصالة — خزّن فورًا ونفّذ تحديثات مرتبطة
    if (targetSel === '#shift-number' || targetSel === '#hall-number') {
      if (typeof populateNamesForCurrentSelection === 'function') {
        populateNamesForCurrentSelection();
      }
      // حفظ القيم المختارة مباشرة حتى لو لم ينتظر المستخدم كتابة إضافية
      if (typeof saveShiftFields === 'function') saveShiftFields();

      // تركيز على حقل الاسم لتسهيل اختيار الاسم
      const nameInput = document.getElementById('IndividualName');
      if (nameInput) nameInput.focus();
    }
  }

  // مظهر تفعيل الزر: إزالة active من الأخريات وإضافة للزِر الحالي
  const container = wrap || btn.parentElement;
  container.querySelectorAll?.('.chip')?.forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
});

})();
// ======== وقت الاستلام التلقائي ========
let _userEditedReceiveTime = false;

function _minutesNow(){
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// يحسب القيم الافتراضية بناءً على الوقت الحالي
function computeReceiveDefaults(mins = _minutesNow()){
  // الحدود بالدقائق
  const M_13_40 = 13*60 + 40; // 820
  const M_21_40 = 21*60 + 40; // 1300
  const M_21_41 = 21*60 + 41; // 1301
  const M_05_40 = 5*60 + 40;  // 340
  const M_05_41 = 5*60 + 41;  // 341

  // 13:40 - 21:40
  if (mins >= M_13_40 && mins <= M_21_40){
    return { from: '2م', to: '10م' };
  }
  // 21:41 - 23:59 أو 00:00 - 05:40
  if (mins >= M_21_41 || mins <= M_05_40){
    return { from: '10م', to: '6ص' };
  }
  // 05:41 - 13:40
  if (mins >= M_05_41 && mins <= M_13_40){
    return { from: '6ص', to: '2م' };
  }
  // افتراضي احتياطي
  return { from: '6ص', to: '2م' };
}

// يطبّق القيم تلقائيًا إذا لم يغيّر المستخدم يدويًا
function setReceiveTimeAuto(force = false){
  const fromEl = $('ReceiveTimeFrom');
  const toEl   = $('ReceiveTimeTo');
  if (!fromEl || !toEl) return;

  if (!_userEditedReceiveTime || force){
    const def = computeReceiveDefaults();
    if (!fromEl.value) fromEl.value = def.from; else if (force) fromEl.value = def.from;
    if (!toEl.value)   toEl.value   = def.to;   else if (force) toEl.value   = def.to;
  }
}

// علامات تعديل المستخدم
function bindReceiveTimeEditGuards(){
  const fromEl = $('ReceiveTimeFrom');
  const toEl   = $('ReceiveTimeTo');
  if (!fromEl || !toEl) return;

  ['input','change','blur'].forEach(evt=>{
    fromEl.addEventListener(evt, ()=>{ _userEditedReceiveTime = true; });
    toEl.addEventListener(evt,   ()=>{ _userEditedReceiveTime = true; });
  });
}



// ===== حفظ / تحميل حقول المناوبة المحددة فقط =====
const SHIFT_KEYS = ['officer-name','officer-rank','shift-number','hall-number','summary'];
const SHIFT_STORAGE_KEY = 'shift_fields_payload';
const LAST_CLEAR_KEY = 'lastShiftClearTime';

// اقرأ القيم من DOM إلى كائن
function collectShiftFields(){
  const out = {};
  SHIFT_KEYS.forEach(id=>{
    const el = document.getElementById(id);
    if (el) out[id] = (el.value ?? '').toString();
  });
  return out;
}

// حفظ البيانات
function saveShiftFields(){
  try {
    const data = collectShiftFields();
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(data));
    const ok = document.getElementById('check-officer-name');
    if (ok) { ok.style.display = 'inline'; setTimeout(()=> ok.style.display = 'none', 1400); }
  } catch(e){ console.error('حفظ حقول المناوبة فشل:', e); }
}

// تحميل البيانات
function loadShiftFields(){
  try {
    const raw = localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = data[id] ?? '';
    });
  } catch(e){ console.error('تحميل حقول المناوبة فشل:', e); }
}

// حذف التخزين
function clearShiftFieldsStorage(){
  try { localStorage.removeItem(SHIFT_STORAGE_KEY); } catch(e){}
}

// منظّم التنظيف
function scheduleShiftStorageCleaner(){
  const TARGET_HOURS = [6,14,22];

  function runCheck(){
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    // فقط ساعات دقيقة 00
    if (!TARGET_HOURS.includes(h) || m !== 0) return;

    const key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${h}-${m}`;
    const last = localStorage.getItem(LAST_CLEAR_KEY);
    if (last !== key){
      // نظّف الحقول والتخزين
      SHIFT_KEYS.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      clearShiftFieldsStorage();
      localStorage.setItem(LAST_CLEAR_KEY, key);
      console.info('تم تنظيف حقول المناوبة والتخزين عند', now.toISOString());
    }
  }

  runCheck(); // فوري عند التحميل
  setInterval(runCheck, 30*1000); // تحقق كل 30 ثانية
}

// الحفظ التلقائي
function bindAutoSaveForShiftFields(){
  SHIFT_KEYS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', ()=>{
      if(el._saveTimer) clearTimeout(el._saveTimer);
      el._saveTimer = setTimeout(()=> saveShiftFields(), 400);
    });
  });
}

// تعديل clearAll
const _origClearAll = window.clearAll;
window.clearAll = function(){
  try { clearShiftFieldsStorage(); } catch(e){}
  if (typeof _origClearAll === 'function') _origClearAll();
};

// تهيئة
document.addEventListener('DOMContentLoaded', ()=>{
  loadShiftFields();
  bindAutoSaveForShiftFields();
  scheduleShiftStorageCleaner();
});

