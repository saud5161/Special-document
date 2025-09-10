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
    ['زيارة','خروج وعودة','نهائي',' زيارة سياحية','مرور','عمرة','زيارة عائلية','زيارة رجال اعمال'].forEach(v=>{
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
    AttachedCount:    $('AttachedCount')?.value     || '', // ✅ جديد: عدد المشفوعات
    // الآمر المناوب
    CommanderName:    $('commander-name')?.value    || '', // جديد
    CommanderRank:    $('commander-rank')?.value    || ''  // جديد
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
  window.location.href = "Departure.html";
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
  
});

// تفريغ الحقول
function clearAll(){
  const ids = [
    'officer-name','officer-rank','shift-number','hall-number',
    'TravelerName','Nationality','PassportNumber',
    'AirlineName','FlightNumber','TravelDestination','IssuedNumber','AttachedCount',
    // الحقول الجديدة
    'id','VisaType','commander-name','commander-rank'
  ];
  ids.forEach(id => { const el = $(id); if (el) el.value=''; });
  localStorage.removeItem('receipt_today_payload');
}


// أزرار الاختيارات السريعة (chips)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip');
  if(!btn) return;
  const wrap = btn.closest('.actions');
  const targetSel = wrap?.getAttribute('data-target');
  if (!targetSel) return;
  const target = document.querySelector(targetSel);
  if (target){ target.value = btn.getAttribute('data-value')||''; }
  wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
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
  setInterval(setHijriAndDayNow, 60000); // تحديث التاريخ/اليوم كل دقيقة
  loadNationalities();
  loadVisaTypes();
  loadOfficers();
    loadCommander(); // ✅ الآن ستُحمَّل أسماء الآمر المناوب

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


