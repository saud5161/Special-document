
const ALLOW_AUTO_SCROLL_ON_OPEN = false;



// طباعة
document.getElementById('print-button')?.addEventListener('click', ()=>window.print());

// مُختصر لجلب العناصر
const $ = (id)=>document.getElementById(id);


// === helper: هل الاختيار الحالي = "كشف" ؟ (يعتمد على التخزين) ===
function _isKashfChoice(){
  try {
    const c = (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();
    return c === 'كشف';
  } catch { return false; }
}
// حد الدقيقة الفاصل لاعتبار "اليوم السابق" (05:40 افتراضيًا، و05:20 في كشف)
function _cutMinuteForShift(){
  return _isKashfChoice() ? 20 : 40;
}

// ضبط التاريخ الهجري + اليوم تلقائيًا + إرسالها للباك إن توفّر Electron
function setHijriAndDayNow(){
  const now = new Date();
  let useYesterday = false;

  const hour = now.getHours();
  const minute = now.getMinutes();

  // بين 00:00 و 05:40 (أو 05:20 في كشف) نرجع لليوم السابق
  if (hour < 5 || (hour === 5 && minute < _cutMinuteForShift())) {
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
    // --- حساب صادر إضافي تلقائيًا اعتمادًا على IssuedExtra1 ---
  const ex1Raw = $('IssuedExtra1')?.value ?? '';
  const ex1Num = (() => {
    const s = String(ex1Raw).trim();
    if (!s) return NaN;
    const n = parseInt(s.replace(/[^0-9]/g,''), 10);
    return isNaN(n) ? NaN : n;
  })();

  const ex2 = isNaN(ex1Num) ? '' : String(ex1Num + 1);
  const ex3 = isNaN(ex1Num) ? '' : String(ex1Num + 2);
  const ex4 = isNaN(ex1Num) ? '' : String(ex1Num + 3);
  const ex5 = isNaN(ex1Num) ? '' : String(ex1Num + 4);
  const ex6 = isNaN(ex1Num) ? '' : String(ex1Num + 5);
  const ex7 = isNaN(ex1Num) ? '' : String(ex1Num + 6);

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
    Gender:           $('Gender')?.value            || '',
    // الرحلة
    AirlineName:      $('AirlineName')?.value       || '',
    FlightNumber:     $('FlightNumber')?.value      || '',
    TravelDestination:$('TravelDestination')?.value || '',
    IssuedNumber:     $('IssuedNumber')?.value      || '',
        // الرحلة مواصلة 
    TravelRoute: $('TravelRoute')?.value || '',

    // ✅ جديد: عدد المشفوعات
    AttachedCount:    $('AttachedCount')?.value     || '', 
    // الآمر المناوب
    CommanderName:    $('commander-name')?.value    || '', // جديد
    CommanderRank:    $('commander-rank')?.value    || '',  // جديد
     // بيانات الفرد (تظهر فقط عند absence)

// الفرد رقم 1
IndividualName:  $('IndividualName')?.value  || '',
IndividualRank:  $('IndividualRank')?.value  || '',
IndividualJobNature: $('IndividualJobNature')?.value   || '',  // ✅ طبيعة العمل
IndividualID:  $('IndividualID')?.value  || '',
OperatorNumber:  $('OperatorNumber1')?.value  || '',
// الفرد رقم 2
IndividualNameo: $('IndividualName2')?.value || '',
IndividualRanko: $('IndividualRank2')?.value || '',

IndividualIDo:    $('IndividualID2')?.value   || '',
OperatorNumbero: $('OperatorNumber2')?.value || '',
// الفرد رقم 3
IndividualNamet: $('IndividualName3')?.value || '',
IndividualRankt: $('IndividualRank3')?.value || '',

// مدة التطبيق
ApplicationDuration:  $('ApplyDuration')?.value  || '',  // الأول
ApplicationDurationo: $('ApplyDuration2')?.value || '',  // الثاني
ApplicationDurationt: $('ApplyDuration3')?.value || '',  // الثالث

// سبب التطبيق
ApplicationReason:   $('ApplyReason')?.value  || '',     // الأول
ApplicationReasono:  $('ApplyReason2')?.value || '',     // الثاني
ApplicationReasont:  $('ApplyReason3')?.value || '',     // الثالث

          // وقت الاستلام
    ReceiveTimeFrom: $('ReceiveTimeFrom')?.value || '',
ReceiveTimeTo:   $('ReceiveTimeTo')?.value   || '',

//الصادر الاضافي


MarkedCheck: document.getElementById("myCheckBox")?.checked ? "True" : "False",
// ===== القسم الأول: مغادر إلى إحدى الدول … =====
MC_Forbidden:           document.getElementById('mc-forbidden')?.checked ? 'True' : 'False',

MC_MOI:                 document.getElementById('mc-moi')?.checked ? 'True' : 'False',
MC_MOI_Num:             (document.getElementById('mc-moiNum')?.value ?? '').trim(),
MC_MOI_Date:            (document.getElementById('mc-moiDate')?.value ?? '').trim(),
MC_MOI_DirNum:          (document.getElementById('mc-moiDirNum')?.value ?? '').trim(),

MC_Jawazat:             document.getElementById('mc-jawazat')?.checked ? 'True' : 'False',
MC_Jawazat_Num:         (document.getElementById('mc-jawazatNum')?.value ?? '').trim(),
MC_Jawazat_Date:        (document.getElementById('mc-jawazatDate')?.value ?? '').trim(),

MC_Diplomatic:          document.getElementById('mc-diplomatic')?.checked ? 'True' : 'False',
MC_Diplomatic_Desc:     (document.getElementById('mc-diplomaticDesc')?.value ?? '').trim(),

MC_Under18:             document.getElementById('mc-under18')?.checked ? 'True' : 'False',

MC_Permit:              document.getElementById('mc-permit')?.checked ? 'True' : 'False',
MC_Permit_From:         (document.getElementById('mc-permitFrom')?.value ?? '').trim(),
MC_Permit_To:           (document.getElementById('mc-permitTo')?.value ?? '').trim(),
MC_Permit_Dest:         (document.getElementById('mc-permitDest')?.value ?? '').trim(),

// ===== القسم الثاني: من فئة العسكريين =====
MC_Military:            document.getElementById('mc-military')?.checked ? 'True' : 'False',
MC_Mil_NoDoc:           document.getElementById('mc-mil-nosdoc')?.checked ? 'True' : 'False',
MC_Mil_DestDiff:        document.getElementById('mc-mil-destdiff')?.checked ? 'True' : 'False',
MC_Mil_LeaveNotStart:   document.getElementById('mc-mil-leavenotstart')?.checked ? 'True' : 'False',
MC_Mil_Other:           document.getElementById('mc-mil-other')?.checked ? 'True' : 'False',
MC_Mil_AttachLeave:     document.getElementById('mc-mil-attach-leave')?.checked ? 'True' : 'False',

// ===== القسم الثالث: يحمل وثيقة أقل من المدة =====
MC_DocLess:             document.getElementById('mc-docless')?.checked ? 'True' : 'False',
MC_Doc_3m:              document.getElementById('mc-doc-3m')?.checked ? 'True' : 'False',
MC_Doc_6m:              document.getElementById('mc-doc-6m')?.checked ? 'True' : 'False',


// ===== معلومات الجهة الطالبة =====
RequestingAgency:      $('RequestingAgency')?.value || '',

// ===== معلومات الجواز (إضافية) =====
PassportIssueDate:     $('PassportIssueDate')?.value || '',
PassportSource:        $('PassportSource')?.value || '',

// ===== معلومات الميلاد =====
BirthPlace:            $('BirthPlace')?.value || '',
BirthDate:             $('BirthDate')?.value || '',

// ===== معلومات الأمر =====
RegistrationNumber:    $('RegistrationNumber')?.value || '',
CommandNumber:         $('CommandNumber')?.value || '',
CommandDate:           $('CommandDate')?.value || '',
CommandBody:           $('CommandBody')?.value || '',
CommandSystem:         $('CommandSystem')?.value || '',

// ===== الإجراء المطلوب =====
ActionType:            $('ActionType')?.value || '',
// داخل return في collect():
ForgeryOfficerName: $('ForgeryOfficerName')?.value || '',
ForgeryOfficerRank: $('ForgeryOfficerRank')?.value || '',

SuspectIn:          $('SuspectIn')?.value || '',
AfterCheck:         $('AfterCheck')?.value || '',
// تعقب مغادرة رحلة ():

AirlineNameNow:       $('AirlineNameNow')?.value || '',
FlightNumberNow:      $('FlightNumberNow')?.value || '',
TravelDestinationNow: $('TravelDestinationNow')?.value || '',
ChiefIssuedNum:  $('mc-issuedNum')?.value || '',
ChiefDate:       $('mc-chiefDate')?.value || '',
ChiefShiftCopy:  $('mc-shift')?.value || '',
ChiefHallCopy:   $('mc-hall')?.value || '',

ListOfficerName:  $('ListOfficerName')?.value  || '',
ListOfficerRank:  $('ListOfficerRank')?.value  || '',
AdminOfficerName: $('AdminOfficerName')?.value || '',
AdminOfficerRank: $('AdminOfficerRank')?.value || '',
// ——— أسماء القوائم والأعمال الإدارية ———
ListOfficerName:  $('ListOfficerName')?.value  || '',
ListOfficerRank:  $('ListOfficerRank')?.value  || '',
AdminOfficerName: $('AdminOfficerName')?.value || '',
AdminOfficerRank: $('AdminOfficerRank')?.value || '',
    // بيانات الاستئذان
    PermitDate:     $('PermitDate')?.value     || '',
    PermitDay:      $('PermitDay')?.value      || '',
    PermitReason:   $('PermitReason')?.value   || '',
    PermitDuration: $('PermitDuration')?.value || '',
    ShiftPower:     $('ShiftPower')?.value     || '',

// ——— يوم الموازنة ———
BalanceWeekday:   $('BalanceWeekday')?.value   || '',
BalanceTimeFrom:    $('BalanceTimeFrom')?.value    || '', // وقت الموازنة (من) — الفترة الأساسية
BalanceTimeTo:      $('BalanceTimeTo')?.value      || '', // وقت الموازنة (إلى) — الفترة الأساسية
EveningBalanceFrom: $('EveningBalanceFrom')?.value || '', // وقت الموازنة المسائية (من)
EveningBalanceTo:   $('EveningBalanceTo')?.value   || '', // وقت الموازنة المسائية (إلى)
BalanceDateNight:   $('BalanceDateNight')?.value   || '', // تاريخ الموازنة (اليوم/التاريخ)
//صادر
IssuedAttendance: $('IssuedAttendance')?.value || '', // الحضور والانصراف (رقم الصادر الأساسي)
IssuedBalance:    $('IssuedBalance')?.value    || '', // الموازنة (يزيد تلقائياً عن الحضور +1 أو حسب إدخالك)
IssuedManifests:  $('IssuedManifests')?.value  || '', // المنفستات (يزيد تلقائياً عن الحضور +2)
IssuedReports:    $('IssuedReports')?.value    || '', // التقارير (يزيد تلقائياً عن الحضور +3)
IssuedGates:      $('IssuedGates')?.value      || '', // البوابات (يزيد تلقائياً عن الحضور +4)
IssuedExtra1:     $('IssuedExtra1')?.value     || '', // صادر إضافي 1 (يزيد تلقائياً عن الحضور +5)
    //صادر
    IssuedAttendance: $('IssuedAttendance')?.value || '', // الحضور والانصراف (رقم الصادر الأساسي)
    IssuedBalance:    $('IssuedBalance')?.value    || '', // الموازنة
    IssuedManifests:  $('IssuedManifests')?.value  || '', // المنفستات
    IssuedReports:    $('IssuedReports')?.value    || '', // التقارير
    IssuedGates:      $('IssuedGates')?.value      || '', // البوابات
    IssuedTitle: $('IssuedTitle')?.value || '', // عنوان الصادر
    // صادر إضافي — يُحسب تلقائيًا من IssuedExtra1 بدون حقول إضافية
    IssuedExtra1:     ex1Raw, // من الحقل الوحيد الموجود
    IssuedExtra2:     ex2,
    IssuedExtra3:     ex3,
    IssuedExtra4:     ex4,
    IssuedExtra5:     ex5,
    IssuedExtra6:     ex6,
    IssuedExtra7:     ex7,
//صلاحيات
TransferReason: $('TransferReason')?.value || "",
Permission1: $('Permission1')?.value || "",
Permission2: $('Permission2')?.value || "",
Permission3: $('Permission3')?.value || "",
Permission4: $('Permission4')?.value || "",

OperatorNumber1: $('OperatorNumber1')?.value || "",
OperatorNumber2: $('OperatorNumber2')?.value || "",

IndividualID1: $('IndividualID1')?.value || "",
IndividualID2: $('IndividualID2')?.value || ""


  };
}

// تحويل الكائن إلى نص INI على شكل سطور key=value
function payloadToIni(obj){
  const lines = [];
  for (const [k, vRaw] of Object.entries(obj)) {
    const v = (vRaw ?? '').toString().replace(/\r|\n/g, ' ').trim();
    // ❗️تجاهُل المفاتيح ذات القيم الفارغة (مربعات نص فقط)
    if (v === '') continue;
    lines.push(`${k}=${v}`);
  }
  return lines.join('\r\n');
}



//دالة تفريغ بيانات الفرد (بدون نوع محضر/بدون قفل)
function clearIndividualFields() {
  const ids = [
    "IndividualName","IndividualRank",
    "IndividualName2","IndividualRank2",
    "IndividualName3","IndividualRank3",
    "IssuedNumber",
    "ApplyDuration","ApplyReason",
    "ApplyDuration2","ApplyReason2",
    "ApplyDuration3","ApplyReason3",
    "IndividualID","OperatorNumber",
    "IndividualID2","OperatorNumber2",
    "IndividualID3","OperatorNumber3"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // تأكد أن حقول الفرد الأساسية قابلة للكتابة دائمًا
  ["IndividualName","IndividualRank"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
}

// ===== مسارات "كشف الحضور والانصراف" حسب الصالة + المناوبة =====
const KASHF_FILES = {
  "1": {
    "ا": { pdf: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبة ا.pdf", doc: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبةا.docm" },
    "ب": { pdf: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبة ب.pdf", doc: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبةب.docm" },
    "ج": { pdf: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبة ج.pdf", doc: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبةج.docm" },
    "د": { pdf: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبة د.pdf", doc: "dic/الحضور والانصراف/صالة1/حضور وانصراف مناوبةد.docm" },
  },
  "3": {
    "ا": { pdf: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبة ا.pdf", doc: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبةا.docm" },
    "ب": { pdf: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبة ب.pdf", doc: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبةب.docm" },
    "ج": { pdf: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبة ج.pdf", doc: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبةج.docm" },
    "د": { pdf: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبة د.pdf", doc: "dic/الحضور والانصراف/صالة3/حضور وانصراف مناوبةد.docm" },
  },
  "4": {
    "ا": { pdf: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبة ا.pdf", doc: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبةا.docm" },
    "ب": { pdf: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبة ب.pdf", doc: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبةب.docm" },
    "ج": { pdf: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبة ج.pdf", doc: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبةج.docm" },
    "د": { pdf: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبة د.pdf", doc: "dic/الحضور والانصراف/صالة4/حضور وانصراف مناوبةد.docm" },
  }
};

function normalizeShiftKey(v){
  return (v || "").trim().replace(/أ/g, "ا"); // تحويل "أ" إلى "ا" لأن المفاتيح عندك "ا"
}

function storeKashfSelection(){
  const hall = document.getElementById('hall-number')?.value?.trim() || "";
  const shift = normalizeShiftKey(document.getElementById('shift-number')?.value || "");
  if (!hall || !shift) return;
  localStorage.setItem('kashf_selection', JSON.stringify({ hall, shift }));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('hall-number')?.addEventListener('change', storeKashfSelection);
  document.getElementById('shift-number')?.addEventListener('change', storeKashfSelection);

  // ===== واجهة "كشف": عناصر تظهر فقط إذا كان الاختيار = كشف =====
  const currentChoice = (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();
  const isKashf = currentChoice === 'كشف';

  // (1) إضافة خيار "فتح PDF" بجانب زر تنفيذ وحفظ — مخفي دائمًا إلا في وضع كشف
  if (!document.getElementById('open-kashf-pdf')) {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      const wrap = document.createElement('label');
      wrap.id = 'open-kashf-pdf-wrap';
      wrap.className = 'open-pdf-toggle';
      wrap.style.cssText = 'display:none;align-items:center;gap:8px;margin-inline-start:12px;user-select:none;';
      wrap.innerHTML = '<input type="checkbox" id="open-kashf-pdf"><span>فتح PDF</span>';
      saveBtn.insertAdjacentElement('afterend', wrap);
    }
  }
  const pdfWrap = document.getElementById('open-kashf-pdf-wrap');
  if (pdfWrap) pdfWrap.style.display = isKashf ? 'inline-flex' : 'none';

  // (2) إضافة عبارة "إلزامي لعرض الكشف" بجانب (المناوبة + رقم الصالة) — تظهر فقط في كشف
  const ensureReqNote = (forId) => {
    const label = document.querySelector(`label[for='${forId}']`);
    if (!label) return;
    let note = label.querySelector('.kashf-required-note');
    if (!note) {
      note = document.createElement('span');
      note.className = 'kashf-required-note';
      note.textContent = ' الزامي  ';
      note.style.cssText = 'color:#d11;font-size:11px;font-weight:700;margin-inline-start:6px;display:none;';
      label.appendChild(note);
    }
    note.style.display = isKashf ? 'inline' : 'none';
  };
  ensureReqNote('shift-number');
  ensureReqNote('hall-number');

  // (3) أيقونة تفريغ بجانب المناوبة (تفريغ shift-number) — تظهر فقط في كشف
  (function ensureShiftClear(){
    const shiftInput = document.getElementById('shift-number');
    if (!shiftInput) return;

    const host = shiftInput.closest('.with-chips') || shiftInput.parentElement;
    if (!host) return;

    let btn = document.getElementById('shift-clear-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'shift-clear-btn';
      btn.title = 'تفريغ المناوبة';
      btn.setAttribute('aria-label','تفريغ المناوبة');
      btn.innerHTML = '🧹';
      btn.style.cssText = 'margin-inline-start:8px;border:1px solid #e5e7eb;background:#fff;border-radius:10px;height:34px;width:40px;cursor:pointer;display:none;line-height:1;';
      btn.addEventListener('click', () => {
        shiftInput.value = '';
        try { shiftInput.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        // تحديث التخزين إن وُجد
        try {
          const hall = (document.getElementById('hall-number')?.value || '').trim();
          localStorage.removeItem('kashf_selection');
          if (hall) localStorage.setItem('kashf_selection', JSON.stringify({ hall, shift: '' }));
        } catch {}
      });
      host.appendChild(btn);
    }
    btn.style.display = isKashf ? 'inline-flex' : 'none';
  })();
});
// حفظ/تنفيذ
async function saveAll() {
  const data = collect();
  const ini  = payloadToIni(data);
    clearIndividualFields();

// === حل مشكلة بقاء "بيانات الصادر" ظاهرة بعد تنفيذ وحفظ ===
// تحديد الاختيار الحالي
const choice =
  (localStorage.getItem('wordLinkChoice') ||
   localStorage.getItem('lastWordLinkChoice') || '').trim();

// إن لم تكن استلام-اليوم نحذف التخزين ونخفي القسم، وإلا نخزّن ونُظهره
const issuedCard = document.getElementById('card-issued-data');






// فرض الإخفاء/الإظهار النهائي لبطاقة "بيانات الصادر" مباشرة بعد الحفظ
try { if (typeof __issued_enforceVisibility === 'function') __issued_enforceVisibility(); } catch {}
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
const choice = (localStorage.getItem("wordLinkChoice") || localStorage.getItem("lastWordLinkChoice") || "").trim();

// ✅ كشف الحضور والانصراف: فتح المسار حسب الصالة + المناوبة (Doc/PDF)
if (choice === "كشف") {
  const hall = (document.getElementById("hall-number")?.value || "").trim();
  const shiftRaw = (document.getElementById("shift-number")?.value || "").trim();
  const shift = normalizeShiftKey(shiftRaw);

  // خزّن الاختيار (للاحتياط)
  try {
    if (hall && shift) localStorage.setItem("kashf_selection", JSON.stringify({ hall, shift }));
  } catch {}

  // خيار فتح PDF (إن وُجدت الخانة)
  const openPdf = !!document.getElementById("open-kashf-pdf")?.checked;

  const file = (KASHF_FILES && hall && shift) ? (KASHF_FILES[hall]?.[shift]) : null;

  // لا تعرض أي رسالة عند فتح الصفحة — الرسالة فقط عند الضغط على تنفيذ وحفظ داخل saveAll
  if (!file) {
    // إذا لم يحدد المستخدم الصالة/المناوبة أو لا يوجد مسار مطابق
    // نوقف الفتح بدل الذهاب إلى default.docm
    if (!hall || !shift) {
      alert("حدد رقم الصالة والمناوبة أولاً لفتح كشف الحضور والانصراف.");
    } else {
      alert(`لا يوجد مسار مطابق للكشف.\nالصالة: ${hall}\nالمناوبة: ${shiftRaw || shift}`);
    }
    return;
  }

  // ✅ فتح PDF في نافذة منبثقة (Popup) بدل نفس الصفحة
  if (openPdf) {
    try {
      const w = window.open(
        file.pdf,
        'kashf_pdf',
        'width=1100,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
      );
      if (w) w.focus();
    } catch (e) {
      // كحل احتياطي لو تم منع النافذة المنبثقة
      window.open(file.pdf, '_blank');
    }
    return; // لا نفتح ملف الـ Word عند اختيار PDF
  }

  // افتراضيًا: افتح ملف Word
  wordLink.href = file.doc;
  // نكمل بدون الدخول في بقية الشروط
} else
if (choice === "خطاب-باسم") {
  wordLink.href = "dic/نــماذج  اليومية/خطاب باسم .docm";
} else if (choice === "خطاب-بدون") {
  wordLink.href = "dic/نــماذج  اليومية/خطاب بدون اسم.docm";
} else if (choice === "مغادرة-مواطن") {
  wordLink.href = "dic/السعودين/مواطن مغادر.docm";
} else if (choice === "تعذر-مغادرة") {
  wordLink.href = "dic/نــماذج  اليومية/تعذر مغادرة.docm";
} else if (choice === "غياب-افراد") {
  wordLink.href = "dic/نماذج الافراد/غياب افراد.docm";} else if (choice === "عدم-قبول-بصمات") {
  wordLink.href = "dic/خطابات جاهزة لتعديل/عدم قبول الخصائص الحيوية.docm";
} else if (choice === "ارتباط-بصمات") {
  wordLink.href = "dic/خطابات جاهزة لتعديل/ارتباط بصمات.docm";
} else if (choice === "التزوير") {
  wordLink.href = "dic/نــماذج  اليومية/تزوير فحص.docm";
} else if (choice === "اشعار") {
  wordLink.href = "dic/نماذج الممنوعين/اشعار مباحث.docm";
} else if (choice === "قبض") {
  wordLink.href = "dic/نماذج الممنوعين/قبض.docm";
} else if (choice === "اشعار-منع") {
  wordLink.href = "dic/نماذج الممنوعين/منع سفر مباحث.docm";
} else if (choice === "عسكري-رحلة-مواصلة") {
  wordLink.href = "dic/نــماذج  اليومية/رحلة مواصلة عسكري.docm";
} else if (choice === "تأشيرات-منتهية-سياحية") {
  wordLink.href = "dic/نــماذج  اليومية/الزيارة المنتهية.docm";
} else if (choice === "حذف-السجلات") {
  wordLink.href = "dic/نــماذج  اليومية/حذف السجلات.docm";
  } else if (choice === "مواليد") {
  wordLink.href = "dic/نــماذج  اليومية/مواليد.docm";
  } else if (choice === "تخلف-مغادرة") {
  wordLink.href = "dic/خطابات جاهزة لتعديل/تخلف على الرحلة فقط.docm";
  } else if (choice === "تعقب-مغادرة") {
  wordLink.href = "dic/خطابات جاهزة لتعديل/خطاب اشارة الى تخلف.docm";
} else if (choice === "تاشيرات-المشاريع") {
  wordLink.href = "dic/خطابات جاهزة لتعديل/تاشيرات حكومية لمكتب المشاريع .docm";
} else if (choice === "استلام-اليوم") {
  wordLink.href = "dic/نــماذج  اليومية/نموذج استلام.docm";
  } else if (choice === "تبليغ-مراجعة") {
  wordLink.href = "dic/نماذج الممنوعين/مطلوبين تبليغ مراجعة.docm";
   } else if (choice === "تطبيق") {
  wordLink.href = "dic/نماذج الافراد/تطبيق.docm";
  } else if (choice === "صلاحيات") {
  wordLink.href = "dic/نماذج الافراد/صلاحيات.docm";
} else if (choice === "منع-سفر") {
  wordLink.href = "dic/نماذج الممنوعين/منع سفر جوازات جديد.docm";
  } else if (choice === "خطاب-فرد") {
  wordLink.href = "dic/نــماذج  اليومية/خطاب فرد.docm";
  } else if (choice === "خطاب-المناوبات") {
  wordLink.href = "dic/نــماذج  اليومية/خطاب مناوبات.docm";
   } else if (choice === "مخالفة") {
  wordLink.href = "dic/خطوط/مخالفة خطوط.docm";
  } else if (choice === "استاذان") {
  wordLink.href = "dic/نماذج الافراد/استاذان.docm";
   } else if (choice === "منفستات") {
  wordLink.href = "dic/خطوط/ملاحظة على المنفست.docm";
  } else if (choice === "صلاحيات") {
  wordLink.href = "dic/نماذج الافراد/صلاحيات.docm";
} else {
  wordLink.href = "default.docm";
}

wordLink.target = "_top";
wordLink.click();
console.log(`✔ تم فتح ${wordLink.href} بعد حفظ form.txt`);

} catch (e) {
  console.error("❌ فشل في فتح الملف:", e);
}

const keepOpen = document.getElementById("KeepPageOpen");

if (!keepOpen || !keepOpen.checked) {
  scheduleAutoBack(AUTO_BACK_MS);
}


}




// اخفاء حقول بشروط 
// إخفاء حقول وبطاقات عندما تكون wordLinkChoice = "canceled"
document.addEventListener("DOMContentLoaded", () => {
  const choice = localStorage.getItem("wordLinkChoice");
// === نفس أسلوبك تمامًا: if (choice === "...") مع forEach ===
(function(){
  // نحسب choice بناءً على التخزين: إذا ReceiveTimeFrom محفوظة نعدّه "استلام-اليوم"
  let computedChoice = choice;
  try {
    const raw = localStorage.getItem("receipt_today_payload");
    if (raw) {
      const obj = JSON.parse(raw);
      if ((obj?.ReceiveTimeFrom || "").trim() !== "") {
        computedChoice = "استلام-اليوم";
      }
    }
  } catch {}

  if (computedChoice === "استلام-اليوم") {
    ["ListOfficerName","ListOfficerRank","ListOfficerSuggestions","AdminOfficerName","AdminOfficerRank"].forEach(id => {
      const el  = document.getElementById(id);
      const lbl = document.querySelector(`label[for='${id}']`);
      if (el)  el.style.display  = "block";
      if (lbl) lbl.style.display = "block";
    });
  } else {
    ["ListOfficerName","ListOfficerRank","ListOfficerSuggestions","AdminOfficerName","AdminOfficerRank"].forEach(id => {
      const el  = document.getElementById(id);
      const lbl = document.querySelector(`label[for='${id}']`);
      if (el)  el.style.display  = "none";
      if (lbl) lbl.style.display = "none";
    });
  }
  // [FIX] "بيانات الصادر" مربوطة بالاختيار الحالي فقط
(() => {
  const issuedCard = document.getElementById('card-issued-data');
  if (!issuedCard) return;
  const currentChoice =
    (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();

  // السماح بظهور "بيانات الصادر" مع استلام-اليوم و استاذان
  const allowedChoices = ['استلام-اليوم', 'استاذان'];
  issuedCard.style.display = allowedChoices.includes(currentChoice) ? 'block' : 'none';
})();


})();
// ================== قاعدة بيانات الأسماء والرتب ==================
const nameDB = {
  lists: new Map(),   // أسماء القوائم
  admin: new Map()    // أسماء الأعمال الإدارية
};

async function loadNameDB() {
  try {
    const res = await fetch('namecont.json', {cache: 'no-cache'});
    const data = await res.json();
    nameDB.rawLists = Array.isArray(data.lists) ? data.lists : [];
nameDB.rawAdmin = Array.isArray(data.admin) ? data.admin : [];

    // املأ الخرائط
    (data.lists || []).forEach(item => nameDB.lists.set(item.name, item.rank));
    (data.admin || []).forEach(item => nameDB.admin.set(item.name, item.rank));

    // دمج كل الأسماء لإضافتها لقائمة الإكمال التلقائي الحالية (إن وُجدت)
    const dl = document.getElementById('names');
    if (dl) {
      const existing = new Set(Array.from(dl.querySelectorAll('option')).map(o => o.value));
      [...nameDB.lists.keys(), ...nameDB.admin.keys()].forEach(n => {
        if (!existing.has(n)) {
          const opt = document.createElement('option');
          opt.value = n;
          dl.appendChild(opt);
        }
      });
    }
  } catch (e) {
    console.error('فشل تحميل قاعدة الأسماء namecont.json:', e);
  }
}
// يظهر "بيانات الصادر" فقط إذا كان الاختيار الحالي = استلام-اليوم
function __issued_enforceVisibility(){
  const card = document.getElementById('card-issued-data');
  if (!card) return;

  const choice = (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();

  // السماح بالظهور مع استلام-اليوم و استاذان
  const allowedChoices = ['استلام-اليوم', 'استاذان'];
  card.style.display = allowedChoices.includes(choice) ? 'block' : 'none';
}


// ربط إدخال الاسم بتعبئة الرتبة تلقائيًا
function bindAutoRank(nameInputId, rankInputId, source /* 'lists' | 'admin' */) {
  const nameInput = document.getElementById(nameInputId);
  const rankInput = document.getElementById(rankInputId);
  if (!nameInput || !rankInput) return;

  const fill = () => {
    const v = nameInput.value.trim();
    // أولاً من المصدر المحدد، ثم من أي مصدر آخر كاحتياط
    const r =
      nameDB[source]?.get(v) ||
      nameDB.lists.get(v) ||
      nameDB.admin.get(v) || '';
    if (r) rankInput.value = r;
  };

  // عند الاختيار من القائمة/التغيير/الخروج من الحقل
  nameInput.addEventListener('change', fill);
  nameInput.addEventListener('blur',   fill);
  // ولو أردت أن يعمل أثناء الكتابة:
  // nameInput.addEventListener('input', fill);
}


  // ===== وضع "كشف": إظهار وقت الاستلام فقط + إخفاءات خاصة =====
  // ===== وضع "كشف": إخفاء المطلوب + إبقاء "وقت الاستلام" فقط =====
if (choice === "كشف") {

  // ✅ قفل الإخفاء بـ CSS قوي (حتى لو سكربت ثاني أعاد إظهارها)
  if (!document.getElementById("kashf-hide-balance-style")) {
    const st = document.createElement("style");
    st.id = "kashf-hide-balance-style";
    st.textContent = `
      /* إخفاء حقول الموازنة نهائياً في وضع "كشف" */
      #BalanceTimeFrom, label[for="BalanceTimeFrom"],
      #BalanceTimeTo,   label[for="BalanceTimeTo"],
      #EveningBalanceFrom, label[for="EveningBalanceFrom"],
      #EveningBalanceTo,   label[for="EveningBalanceTo"],
      #BalanceDateNight, label[for="BalanceDateNight"],
      #BalanceWeekday,   label[for="BalanceWeekday"]{
        display:none !important;
      }
    `;
    document.head.appendChild(st);
  }

  // 1) إخفاء الآمر المناوب (الحقل + الليبل)
  ["commander-name","commander-rank"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display  = "none";
    if (lbl) lbl.style.display = "none";
  });

  // 2) إخفاء بطاقات: بيانات المسافر + بيانات الرحلة + بيانات الصادر
  ["card-traveler","card-flight","card-issued-data"].forEach(cardId => {
    const card = document.getElementById(cardId);
    if (card) card.style.display = "none";
  });

  // 3) إبقاء وقت الاستلام فقط ظاهر
  ["ReceiveTimeFrom","ReceiveTimeTo"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display  = "";
    if (lbl) lbl.style.display = "";
  });

  // (اختياري) إخفاء الملاحظة الخضراء بجانب عنوان وقت الشفت إن رغبت
  const note = document.getElementById("note-shift-balance-now");
  if (note) note.style.display = "none";
  
}


  if (choice === "خطاب-بدون") {
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
if (
  choice === "مخالفة" ||
  choice === "منفستات"
) {
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
 // إخفاء اسم الآمر المناوب ورتبته
  const cmdName  = document.getElementById("commander-name");
  const cmdRank  = document.getElementById("commander-rank");
  const cmdNameL = document.querySelector("label[for='commander-name']");
  const cmdRankL = document.querySelector("label[for='commander-rank']");
  if (cmdName)  cmdName.style.display = "none";
  if (cmdRank)  cmdRank.style.display = "none";
  if (cmdNameL) cmdNameL.style.display = "none";
  if (cmdRankL) cmdRankL.style.display = "none";
    

    // 4) إخفاء بطاقة بيانات المسافر كاملة
    const travelerCard = document.getElementById("card-traveler");
    if (travelerCard) travelerCard.style.display = "none";
  }
  
// ===== وضع matlopan =====
if (
  choice === "اشعار" ||
  choice === "قبض" ||
  choice === "اشعار-منع" ||
    choice === "منع-سفر" ||
  choice === "تبليغ-مراجعة"
) {
  // 1) إظهار بطاقة "معلومات الأمر وجهة الطالبة"
  const cmdCard = document.getElementById("card-command");
  if (cmdCard) cmdCard.style.display = "block";

  // 2) إظهار الحقول المنقولة داخل "بيانات المسافر": (مكان/تاريخ الميلاد + تاريخ/مصدر الجواز)
  const showIds = ["PassportIssueDate","PassportSource","BirthPlace","BirthDate"];
  showIds.forEach(id => {
    const input = document.getElementById(id);
    const label = document.querySelector(`label[for='${id}']`);
    if (input) input.style.display = "block";
    if (label) label.style.display = "block";
  });
// ✅ جديد: إذا كانت قيمة التخزين "اشعار" اختر CommandSystem تلقائياً
if (choice === "اشعار") {
  const cs = document.getElementById("CommandSystem");
  if (cs && !cs.value) {
    cs.value = "الممنوعين ترقب عند المغادرة والقدوم";
    cs.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
  // 3) إخفاء "نوع التأشيرة"
  (function hideVisa(){
    const visaField = document.getElementById("VisaType");
    const visaLabel = document.querySelector("label[for='VisaType']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";
  })();

  // 4) إخفاء اسم الآمر المناوب ورتبته (مع الملصقات)
  [
    "#commander-name",
    "label[for='commander-name']",
    "#commander-rank",
    "label[for='commander-rank']"
  ].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.display = "none";
      // إذا كان النموذج الحالي "منع-سفر" نضبط القيم تلقائياً
  if (choice === "منع-سفر") {
    const actionTypeEl = document.getElementById("ActionType");
    const agencyEl     = document.getElementById("RequestingAgency");

    if (actionTypeEl && !actionTypeEl.value) {
      actionTypeEl.value = "منع من السفر";
    }

    if (agencyEl && !agencyEl.value) {
      agencyEl.value = "جوازات";
    }
  }
    if (choice === "تبليغ-مراجعة") {
      
    const genderField = document.getElementById("Gender");
    const genderLabel = document.querySelector('label[for="Gender"]');
      
    if (genderField) {
      genderField.style.display = "block";   // إظهار القائمة
      genderField.disabled = false;          // للتأكد أنها قابلة للاختيار
    }
    if (genderLabel) {
      genderLabel.style.display = "block";   // إظهار الليبل
      
    }
  } else {
    // في باقي الحالات يبقى مخفي
    const genderField = document.getElementById("Gender");
    const genderLabel = document.querySelector('label[for="Gender"]');
    if (genderField) genderField.style.display = "none";
    if (genderLabel) genderLabel.style.display = "none";
    
  }
  // ✅ إذا كان الاختيار "تبليغ-مراجعة" خلي CommandSystem = "المطلوبين" فقط
  (function () {
    const cmdSystem = document.getElementById("CommandSystem");
    if (!cmdSystem) return;

    if (choice === "تبليغ-مراجعة") {
      const wantedVal = "المطلوبين";

      // تأكد أن الخيار موجود ضمن القائمة
      const hasOption = Array.from(cmdSystem.options)
        .some(opt => (opt.value || opt.textContent.trim()) === wantedVal);

      if (hasOption) {
        cmdSystem.value = wantedVal;   // يضعها تلقائياً
        // إذا حاب تمنع التعديل تماماً، فكّ التعليق عن السطر التالي:
        // cmdSystem.disabled = true;
      }
      
    }
  })();

  });


}
// (2) إخفاءات دقيقة عند اختيار "تبليغ-مراجعة"
if (choice === "تبليغ-مراجعة") {
  // دالة تخفي الحقل وملصقه وأي تغليف بسيط حوله
  function hidePair(id) {
    const input = document.getElementById(id);
    const label = document.querySelector(`label[for='${id}']`);

    // أخفِ المدخل
    if (input) {
      input.style.display = "none";
      // إن كان هناك تغليف قريب (اختياري)
      const wrap = input.closest(".form-group, .field, .mb-3, .row");
      if (wrap) wrap.style.display = "none";
    }

    // أخفِ اللِـيبل
    if (label) label.style.display = "none";

    // احتياطي: لو ما فيه تغليف، أخفِ العنصر السابق مباشرةً إذا كان Label
    if (input && !label && input.previousElementSibling?.tagName === "LABEL") {
      input.previousElementSibling.style.display = "none";
      
    }
  }

  // الحقول المطلوب إخفاؤها تحديدًا:
  const idsToHide = [
    // من "بيانات المسافر":
    "PassportIssueDate",   // تاريخ الإصدار
    "PassportSource",      // مصدر الجواز
    "BirthPlace",          // مكان الميلاد

    // من "معلومات الأمر وجهة الطالبة":
    "RequestingAgency",    // جهة الخطاب
    "RegistrationNumber",  // رقم السجل
    "ActionType"           // الإجراء المطلوب
  ];

  idsToHide.forEach(hidePair);

  // فallback قوي عبر CSS لمنع أي سكربت آخر من إعادة إظهارها لاحقًا
  const css = `
    #PassportIssueDate, label[for="PassportIssueDate"],
    #PassportSource, label[for="PassportSource"],
    #BirthPlace, label[for="BirthPlace"],
    #RequestingAgency, label[for="RequestingAgency"],
    #RegistrationNumber, label[for="RegistrationNumber"],
    #ActionType, label[for="ActionType"] { display: none !important; }
  `;
  if (!document.getElementById("hide-for-review-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "hide-for-review-style";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
}

if (choice === "مواليد") {
  ["id", "VisaType", "AirlineName"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });
}
// ===== وضع حذف-السجلات: أظهر «أسماء القوائم والأعمال الإدارية» كاملة =====
if (choice === "حذف-السجلات") {
  // 1) أظهر البطاقة نفسها
  const card = document.getElementById("card-lists-admin");
  if (card) card.style.display = "block"; // يزيل display:none الموجود في HTML

  // 2) أظهر حقول أسماء القوائم + الأعمال الإدارية (مع الملصقات)
  [
    "ListOfficerName","ListOfficerRank","ListOfficerSuggestions",
    "AdminOfficerName","AdminOfficerRank"
  ].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  { el.style.display = ""; el.hidden = false; }
    if (lbl) { lbl.style.display = ""; lbl.hidden = false; }
  });
}



if (choice === "تعقب-مغادرة") {
  const note = document.getElementById("prev-flight-note");
  if (note) note.hidden = false;

  const nowSec = document.getElementById("card-flight-now");
  if (nowSec) nowSec.style.display = "";

  const chiefSignal = document.getElementById("mc-chief-signal");
  if (chiefSignal) chiefSignal.hidden = false;

  const cmdName  = document.getElementById("commander-name");
  const cmdRank  = document.getElementById("commander-rank");
  const cmdNameL = document.querySelector("label[for='commander-name']");
  const cmdRankL = document.querySelector("label[for='commander-rank']");
  if (cmdName)  cmdName.style.display = "none";
  if (cmdRank)  cmdRank.style.display = "none";
  if (cmdNameL) cmdNameL.style.display = "none";
  if (cmdRankL) cmdRankL.style.display = "none";

  const visaEl  = document.getElementById("VisaType");
  const visaLbl = document.querySelector("label[for='VisaType']");
  if (visaEl)  visaEl.style.display = "none";
  if (visaLbl) visaLbl.style.display = "none";

  // إظهار تنبيه الإشارة بأسفل المقطع بنفس الستايل
  const chiefAlert = document.getElementById("chief-signal-alert");
  if (chiefAlert) chiefAlert.hidden = false;
}

 if (choice === "استاذان") {

  // 1) إخفاء جميع الكروت
  document.querySelectorAll(".card").forEach(card => {
    card.style.display = "none";
  });

  // 2) إظهار بطاقة التاريخ والمستلم
  const receipt = document.getElementById("card-receipt");
  if (receipt) receipt.style.display = "block";

  // 3) إظهار بطاقة بيانات الفرد
  const indivCard = document.getElementById("card-individual");
  if (indivCard) indivCard.style.display = "block";

  // 4) فتح الحقول (إلغاء التعطيل)
  const indivName = document.getElementById("IndividualName");
  const indivRank = document.getElementById("IndividualRank");
  if (indivName) indivName.disabled = false;
  if (indivRank) indivRank.disabled = false;

  // 5) الحقول المطلوب إظهارها داخل بطاقة الفرد
  const showFields = [
    "IndividualName",
    "IndividualRank",
    "IndividualID"
  ];

  // إظهار الحقول + عناوينها
  showFields.forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);

    if (el)  el.style.display  = "block";
    if (lbl) lbl.style.display = "block";
  });

  // 6) إخفاء باقي عناصر بطاقة الفرد (inputs + selects + labels)
  document
    .querySelectorAll("#card-individual input, #card-individual select, #card-individual label")
    .forEach(el => {
      if (el.tagName === "LABEL") {
        const f = el.getAttribute("for");
        if (!showFields.includes(f)) {
          el.style.display = "none";
        }
      } else {
        if (!showFields.includes(el.id)) {
          el.style.display = "none";
        }
      }
    });

  // 7) إخفاء الآمر المناوب (الاسم والرتبة + العناوين)
  const cmdName  = document.getElementById("commander-name");
  const cmdRank  = document.getElementById("commander-rank");
  const cmdNameL = document.querySelector("label[for='commander-name']");
  const cmdRankL = document.querySelector("label[for='commander-rank']");

  if (cmdName)  cmdName.style.display = "none";
  if (cmdRank)  cmdRank.style.display = "none";
  if (cmdNameL) cmdNameL.style.display = "none";
  if (cmdRankL) cmdRankL.style.display = "none";

  // 8) إظهار بطاقة الاستئذان
  const permit = document.getElementById("card-permit");
  if (permit) permit.style.display = "block";
const issuedSimple = document.getElementById("card-issued");
  if (issuedSimple) issuedSimple.style.display = "block";
  
}

    



if (choice === "تخلف-مغادرة") {
  // إخفاء اسم الآمر المناوب ورتبته
  const cmdName  = document.getElementById("commander-name");
  const cmdRank  = document.getElementById("commander-rank");
  const cmdNameL = document.querySelector("label[for='commander-name']");
  const cmdRankL = document.querySelector("label[for='commander-rank']");
  if (cmdName)  cmdName.style.display = "none";
  if (cmdRank)  cmdRank.style.display = "none";
  if (cmdNameL) cmdNameL.style.display = "none";
  if (cmdRankL) cmdRankL.style.display = "none";

  // إخفاء نوع التأشيرة فقط
  const visaEl  = document.getElementById("VisaType");
  const visaLbl = document.querySelector("label[for='VisaType']");
  if (visaEl)  visaEl.style.display = "none";
  if (visaLbl) visaLbl.style.display = "none";
}


if (
  choice === "تأشيرات-منتهية-سياحية" ||
  choice === "حذف-السجلات"
) {

  // إخفاء قسم بيانات المسافر
  const travelerSec = document.getElementById("card-traveler");
  if (travelerSec) travelerSec.style.display = "none";

  // إخفاء قسم بيانات الرحلة
  const flightSec = document.getElementById("card-flight");
  if (flightSec) flightSec.style.display = "none";

  // إبقاء قسم بيانات الصادر ظاهر
  const issuedSec = document.getElementById("card-issued");
  if (issuedSec) issuedSec.style.display = "";

  // إخفاء "خط سير الرحلة" إن وُجد
  const trRow   = document.getElementById("travel-route-row");
  const trLbl   = document.querySelector("label[for='TravelRoute']");
  const trInput = document.getElementById("TravelRoute");
  if (trRow)   trRow.hidden = true;
  if (trLbl)   trLbl.style.display = "none";
  if (trInput) trInput.style.display = "none";
}

// ===== وضع tazwar =====
if (choice === 'التزوير') {
    // إظهار موظف التزوير + رتبته
    const fo = document.getElementById('ForgeryOfficerName');
    const fr = document.getElementById('ForgeryOfficerRank');
    const foL = document.querySelector("label[for='ForgeryOfficerName']");
    const frL = document.querySelector("label[for='ForgeryOfficerRank']");
    if (fo) fo.style.display = 'block';
    if (fr) fr.style.display = 'block';
    if (foL) foL.style.display = 'block';
    if (frL) frL.style.display = 'block';

    // إظهار حقول الاشتباه/النتيجة
    const si = document.getElementById('SuspectIn');
    const ac = document.getElementById('AfterCheck');
    const siL = document.querySelector("label[for='SuspectIn']");
    const acL = document.querySelector("label[for='AfterCheck']");
    if (si) si.style.display = 'block';
    if (ac) ac.style.display = 'block';
    if (siL) siL.style.display = 'block';
    if (acL) acL.style.display = 'block';

    // إخفاء نوع التأشيرة + الآمر المناوب ورتبته
    const visa = document.getElementById('VisaType');
    const visaL = document.querySelector("label[for='VisaType']");
    const cmdN = document.getElementById('commander-name');
    const cmdNL = document.querySelector("label[for='commander-name']");
    const cmdR = document.getElementById('commander-rank');
    const cmdRL = document.querySelector("label[for='commander-rank']");
    if (visa) visa.style.display = 'none';
    if (visaL) visaL.style.display = 'none';
    if (cmdN) cmdN.style.display = 'none';
    if (cmdNL) cmdNL.style.display = 'none';
    if (cmdR) cmdR.style.display = 'none';
    if (cmdRL) cmdRL.style.display = 'none';
    // 2) إخفاء اسم شركة الطيران
    const visaField = document.getElementById("AirlineName");
    const visaLabel = document.querySelector("label[for='AirlineName']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";

    const idField = document.getElementById("id");
    const idLabel = document.querySelector("label[for='id']");
    if (idField) idField.style.display = "none";
    if (idLabel) idLabel.style.display = "none";
  }



// ===== moatan: إظهار اللوح المستقل فقط وإخفاء "نوع التأشيرة" كالسابق =====
if (choice === "مغادرة-مواطن") {
  // إخفاء نوع التأشيرة فقط
  const visaField = document.getElementById("VisaType");
  const visaLabel = document.querySelector("label[for='VisaType']");
  if (visaField) visaField.style.display = "none";
  if (visaLabel) visaLabel.style.display = "none";

  // إظهار اللوح المستقل
  const mc = document.getElementById("moatan-compact");
  if (mc) {
    mc.hidden = false;
  }

  // تعبئة الجنسية تلقائيًا بالسعودية
  const nat = document.getElementById("Nationality");
  if (nat && !nat.value.trim()) {
    nat.value = "السعودية";
  }


}
if (choice === "عسكري-رحلة-مواصلة") {
  // إخفاء اسم الآمر المناوب ورتبته
  const cmdName  = document.getElementById("commander-name");
  const cmdRank  = document.getElementById("commander-rank");
  const cmdNameL = document.querySelector("label[for='commander-name']");
  const cmdRankL = document.querySelector("label[for='commander-rank']");
  if (cmdName)  cmdName.style.display = "none";
  if (cmdRank)  cmdRank.style.display = "none";
  if (cmdNameL) cmdNameL.style.display = "none";
  if (cmdRankL) cmdRankL.style.display = "none";

  // إخفاء رقم الهوية والجنسية ونوع التأشيرة
  ["id","Nationality","VisaType"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });

  // إخفاء الخطوط الناقلة ورقم الرحلة وجهة السفر
  ["AirlineName","FlightNumber","TravelDestination"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });

  // إظهار "خط سير الرحلة"
  const trRow  = document.getElementById("travel-route-row");
  const trLbl  = document.querySelector("label[for='TravelRoute']");
  const trInput= document.getElementById("TravelRoute");
  if (trRow)   trRow.hidden = false;        // إظهار الصف
  if (trLbl)   trLbl.style.display = "";    // إظهار التسمية
  if (trInput) trInput.style.display = "";  // إظهار الحقل
}



  

if (choice === "تعذر-مغادرة") {
    

    // 2) إخفاء نوع التأشيرة
    const visaField = document.getElementById("VisaType");
    const visaLabel = document.querySelector("label[for='VisaType']");
    if (visaField) visaField.style.display = "none";
    if (visaLabel) visaLabel.style.display = "none";

  }
  
// ===================
// وضع absence
// ===================
if (choice === "غياب-افراد") {
  // فرد واحد فقط (بدون فرد 2/3 وبدون مدة/سبب تطبيق)
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  const keepIds = new Set(["card-receipt", "card-individual", "card-issued"]);
  document.querySelectorAll(".card").forEach(card => {
    if (!keepIds.has(card.id)) card.style.display = "none";
  });

  // إخفاء اسم/رتبة الآمر المناوب مع الـ labels
  ["commander-name","commander-rank"].forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });

  // نوع المحضر يختاره المستخدم (لا يتم تثبيته تلقائيًا)

  // إخفاء/تفريغ فرد 2 و3 بالكامل
  const idsToHideClear = [
    "IndividualName2","IndividualRank2","IndividualName3","IndividualRank3",
    "ApplyDuration2","ApplyReason2","ApplyDuration3","ApplyReason3"
  ];
  idsToHideClear.forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el) { el.value = ""; el.required = false; el.disabled = true; el.style.display = "none"; }
    if (lbl) lbl.style.display = "none";
  });

  // إخفاء الفواصل بين المجموعات
  ["individual-sep-1-2","individual-sep-2-3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  // إخفاء/تفريغ مدة/سبب التطبيق للفرد (1)
  ["ApplyDuration","ApplyReason"].forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el) { el.value = ""; el.required = false; el.style.display = "none"; }
    if (lbl) lbl.style.display = "none";
  });
  ["ApplyDurationLabel","ApplyReasonLabel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  // فتح فرد (1) فقط
  ["IndividualName","IndividualRank"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = false; el.required = true; }
  });
}
if (choice === "تطبيق") {
 // 1) إظهار بطاقة "بيانات الفرد"
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  // 2) إخفاء كل البطاقات ما عدا: التاريخ/المستلم + بيانات الفرد + بيانات الصادر
  // (مراعاة أن بطاقة الصادر قد تكون id=card-issued أو card-issued-data)
  const keepIds = new Set(["card-receipt", "card-individual", "card-issued", "card-issued-data"]);
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
  const keepOpenWrap = document.querySelector(".keep-open-label");
  if (keepOpenWrap) keepOpenWrap.style.display = "none";

  // 5) إظهار حقول "مدة التطبيق" و"سبب التطبيق" (تأكد من إضافتها في HTML)
  ["ApplyDurationLabel","ApplyDuration","ApplyReasonLabel","ApplyReason"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  });

  // 6) تعديل "تقفيلة" اسم الفرد ورتبته: فتحها وجعلها إلزامية في وضع "تطبيق"
  const indName = document.getElementById("IndividualName");
  const indRank = document.getElementById("IndividualRank");
  if (indName) {
    indName.disabled = false;
    indName.required = true;
    indName.placeholder = "اكتب اسم الفرد";
  }
  if (indRank) {
    indRank.disabled = false;
    indRank.required = true;
    indRank.placeholder = "اكتب رتبة الفرد";
  }

}

if (choice === "صلاحيات") {
  // 1) إظهار بطاقة "بيانات الفرد"
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  // 2) إخفاء كل البطاقات ما عدا: التاريخ/المستلم + بيانات الفرد + بيانات الصادر
  const keepIds = new Set(["card-receipt", "card-individual", "card-issued", "card-issued-data"]);
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
  const keepOpenWrap = document.querySelector(".keep-open-label");
  if (keepOpenWrap) keepOpenWrap.style.display = "none";

  // helper: إظهار/إخفاء عنصر مع الليبل المرتبط به (label[for="..."])
  const showPair = (id, show) => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    const disp = show ? "block" : "none";
    if (el)  el.style.display  = disp;
    if (lbl) lbl.style.display = disp;
  };

  // 5) إخفاء مدة/سبب التطبيق بالكامل (1/2/3)
  ["ApplyDurationLabel","ApplyDuration","ApplyReasonLabel","ApplyReason"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  ["ApplyDuration2","ApplyReason2","ApplyDuration3","ApplyReason3"].forEach(id => showPair(id, false));

  // 6) إظهار الفرد (2) وإخفاء الفرد (3) + الفاصل بين 2 و3
  showPair("IndividualName2", true);
  showPair("IndividualRank2", true);

  showPair("IndividualName3", false);
  showPair("IndividualRank3", false);
  showPair("ApplyDuration3", false);
  showPair("ApplyReason3", false);

  const sep12 = document.getElementById("individual-sep-1-2");
  const sep23 = document.getElementById("individual-sep-2-3");
  if (sep12) sep12.style.display = "block";
  if (sep23) sep23.style.display = "none";

  // 7) إظهار "رقم الهوية" + "رقم المشغل" للفرد 1 و2 (مخفية افتراضيًا)
  showPair("IndividualID", true);
  showPair("OperatorNumber1", true);
  showPair("IndividualID2", true);
  showPair("OperatorNumber2", true);

  // 8) فتح أسماء/رتب الأفراد 1 و2 وجعلها إلزامية
  const indName1 = document.getElementById("IndividualName");
  const indRank1 = document.getElementById("IndividualRank");
  const indName2 = document.getElementById("IndividualName2");
  const indRank2 = document.getElementById("IndividualRank2");

  [indName1, indRank1, indName2, indRank2].forEach(el => {
    if (!el) return;
    el.disabled = false;
    el.required = true;
  });
  if (indName1) indName1.placeholder = "اكتب اسم الفرد";
  if (indRank1) indRank1.placeholder = "اكتب رتبة الفرد";
  if (indName2) indName2.placeholder = "اكتب اسم الفرد (2)";
  if (indRank2) indRank2.placeholder = "اكتب رتبة الفرد (2)";
}

// ===================
// وضع absence2
// ===================
if (choice === "غياب-افراد") {
  // فرد واحد فقط (بدون فرد 2/3 وبدون مدة/سبب تطبيق) — نفس منطق غياب-افراد
  const individualCard = document.getElementById("card-individual");
  if (individualCard) individualCard.style.display = "block";

  const keepIds = new Set(["card-receipt", "card-individual", "card-issued"]);
  document.querySelectorAll(".card").forEach(card => {
    if (!keepIds.has(card.id)) card.style.display = "none";
  });

  ["commander-name","commander-rank"].forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });

  // نوع المحضر يختاره المستخدم (لا يتم تثبيته تلقائيًا)

  const idsToHideClear = [
    "IndividualName2","IndividualRank2","IndividualName3","IndividualRank3",
    "ApplyDuration2","ApplyReason2","ApplyDuration3","ApplyReason3"
  ];
  idsToHideClear.forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el) { el.value = ""; el.required = false; el.disabled = true; el.style.display = "none"; }
    if (lbl) lbl.style.display = "none";
  });

  ["individual-sep-1-2","individual-sep-2-3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  ["ApplyDuration","ApplyReason"].forEach(id => {
    const el = document.getElementById(id);
    const lbl = document.querySelector(`label[for="${id}"]`);
    if (el) { el.value = ""; el.required = false; el.style.display = "none"; }
    if (lbl) lbl.style.display = "none";
  });
  ["ApplyDurationLabel","ApplyReasonLabel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  ["IndividualName","IndividualRank"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = false; el.required = true; }
  });
}

// ===== وضع shafttime =====
if (choice === "استلام-اليوم") {
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
].forEach(sel => {
  const el = document.querySelector(sel);
  if (el) el.style.display = ""; // أو 'block' إذا احتجت عرضًا كتليًا
});

  // 5) إظهار فقط البطاقات: التاريخ/المستلم + وقت الشفت + الصادر الخاص بالشفت
// داخل if (choice === 'استلام-اليوم' || choice === 'كشف') { ... }
const keep = new Set(['card-receipt','card-shift-balance','card-issued-shaft','card-lists-admin']);
document.querySelectorAll('.card').forEach(card => {
  if (card.id) card.style.display = keep.has(card.id) ? 'block' : 'none';
});

}
// ===== وضع حذف-السجلات =====
if (choice === "حذف-السجلات") {
  // 1) إظهار بطاقة أسماء القوائم (القسم كاملًا)
  const listsCard = document.getElementById("card-lists-admin");
  if (listsCard) listsCard.style.display = "block";

  // 2) إظهار: اسم القائمة + رتبته
  ["ListOfficerName", "ListOfficerRank"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display = "block";
    if (lbl) lbl.style.display = "block";
  });

  // 3) (اختياري) إبقاء حقول الأعمال الإدارية مخفية
  ["AdminOfficerName", "AdminOfficerRank"].forEach(id => {
    const el  = document.getElementById(id);
    const lbl = document.querySelector(`label[for='${id}']`);
    if (el)  el.style.display = "none";
    if (lbl) lbl.style.display = "none";
  });

  // 4) إخفاء الآمر المناوب + رتبته (مع الـ labels)
  const cmdN  = document.getElementById("commander-name");
  const cmdNL = document.querySelector(`label[for='commander-name']`);
  const cmdR  = document.getElementById("commander-rank");
  const cmdRL = document.querySelector(`label[for='commander-rank']`);
  if (cmdN)  cmdN.style.display  = "none";
  if (cmdNL) cmdNL.style.display = "none";
  if (cmdR)  cmdR.style.display  = "none";
  if (cmdRL) cmdRL.style.display = "none";
}

  // ===== وضع "خطاب-فرد" =====
  if (
  choice === "خطاب-فرد" ||
  choice === "خطاب-المناوبات"
) {
    // 1) إظهار فقط البطاقات المطلوبة
    const cardsToShow = ["card-receipt", "card-individual", "card-issued-data"];
    document.querySelectorAll(".card").forEach(card => {
      if (cardsToShow.includes(card.id)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
       // 6) تعديل "تقفيلة" اسم الفرد ورتبته: فتحها وجعلها إلزامية في وضع "تطبيق"
  const indName = document.getElementById("IndividualName");
  const indRank = document.getElementById("IndividualRank");
  if (indName) {
    indName.disabled = false;
    indName.required = true;
    indName.placeholder = "اكتب اسم الفرد";
  }
  if (indRank) {
    indRank.disabled = false;
    indRank.required = true;
    indRank.placeholder = "اكتب رتبة الفرد";
  }
  // إخفاء اسم/رتبة الآمر المناوب إن وُجدت عناصرها (بما فيها الـ label)
    ["#commander-name","label[for='commander-name']",
     "#commander-rank","label[for='commander-rank']"
    ].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = "none";
    });
    });
    // 3) تفعيل اسم الفرد ورتبته
    const indName = document.getElementById("IndividualName");
    const indRank = document.getElementById("IndividualRank");
    if (indName) {
      indName.disabled = false;
      indName.placeholder = "اكتب اسم الفرد";
    }
    if (indRank) {
      indRank.disabled = false;
      indRank.placeholder = "اكتب رتبة الفرد";
    }

    // 4) إظهار حقل طبيعة العمل (اللي عملناه اختيار/قائمة)
    const jobField = document.getElementById("IndividualJobNature");
    const jobLabel = document.getElementById("IndividualJobNatureLabel");
    if (jobField) jobField.style.display = "block";
    if (jobLabel) jobLabel.style.display = "block";

    // 5) إخفاء المجموعات (2) و (3) داخل بطاقة الفرد
    [
      "IndividualName2","IndividualRank2","ApplyDuration2","ApplyReason2",
      "IndividualName3","IndividualRank3","ApplyDuration3","ApplyReason3"
    ].forEach(id => {
      const el  = document.getElementById(id);
      const lbl = document.querySelector(`label[for='${id}']`);
      if (el)  el.style.display  = "none";
      if (lbl) lbl.style.display = "none";
    });

    // 6) إظهار بطاقة الصادر لرقم الصادر + عدد المشفوعات
    const issuedCard = document.getElementById("card-issued-data");
    if (issuedCard) issuedCard.style.display = "block";

    // 7) (اختياري) إخفاء خيار إبقاء النموذج مفتوح لأنه خاص بمحاضر أخرى
    const keepOpen = document.getElementById("KeepPageOpen");
    const keepOpenLabel = document.querySelector('label[for="KeepPageOpen"]');
    if (keepOpen) keepOpen.style.display = "none";
    if (keepOpenLabel) keepOpenLabel.style.display = "none";
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
    loadIndividualsWithID();
  loadNationalities();
  loadVisaTypes();
  loadOfficers();
  loadCommander();
  loadFlyData();

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
// قاعدة الأسماء
let NAME_DB = null;

// توحيد قيمة المناوبة
function normalizeShift(val) {
  if (!val) return null;
  val = String(val).trim();
  const map = {
    "ا": "ا", "أ": "ا", "أ": "ا", "A": "ا", "a": "ا",
    "ب": "ب", "B": "ب", "b": "ب",
    "ج": "ج", "J": "ج", "j": "ج", "C": "ج", "c": "ج",
    "د": "د", "D": "د", "d": "د"
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
  const dataList  = document.getElementById("individual-list");
  // نستخدم أول حقل فقط كشرط وجود، لأن نفس القائمة تُخدم 1 و 2 و 3
  const nameInput = document.getElementById("IndividualName");
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

// دالة عامة لتعبئة الرتبة لأي فرد (1 / 2 / 3)
function autoFillRankByNameFor(suffix) {
  let nameId, rankId;

  if (suffix === "") {
    // الفرد الأول
    nameId = "IndividualName";
    rankId = "IndividualRank";
  } else if (suffix === "2") {
    // الفرد الثاني: جرّب IndividualName2 ثم IndividualNameo
    nameId = document.getElementById("IndividualName2")
      ? "IndividualName2"
      : "IndividualNameo";
    rankId = document.getElementById("IndividualRank2")
      ? "IndividualRank2"
      : "IndividualRanko";
  } else if (suffix === "3") {
    // الفرد الثالث: جرّب IndividualName3 ثم IndividualNamet
    nameId = document.getElementById("IndividualName3")
      ? "IndividualName3"
      : "IndividualNamet";
    rankId = document.getElementById("IndividualRank3")
      ? "IndividualRank3"
      : "IndividualRankt";
  } else {
    return;
  }

  const nameInput = document.getElementById(nameId);
  const rankInput = document.getElementById(rankId);
  if (!nameInput || !rankInput || !NAME_DB) return;

  const { shift, hall } = getShiftHall();
  if (!shift || !hall || !NAME_DB[shift] || !NAME_DB[shift][hall]) return;

  const name = String(nameInput.value || "").trim();
  if (!name) return;

  const hit = NAME_DB[shift][hall].find(e => e.name === name);
  if (hit && hit.rank) {
    // نملأ الرتبة مع إبقاء إمكانية التعديل اليدوي
    rankInput.value = hit.rank;
  }
}

// دالة قديمة تبقى فقط للتوافق إن ناديتها من مكان آخر
function autoFillRankByName() {
  autoFillRankByNameFor("");
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

  // 2) تحديث اقتراحات الأسماء عند تغيير المناوبة أو الصالة
  const shiftEl = document.getElementById("shift-number");
  const hallEl  = document.getElementById("hall-number");
  if (shiftEl) shiftEl.addEventListener("change", populateNamesForCurrentSelection);
  if (hallEl)  hallEl.addEventListener("change",  populateNamesForCurrentSelection);

  // 3) ربط تعبئة الرتبة تلقائيًا لكل فرد (1 / 2 / 3)
  ["", "2", "3"].forEach(suffix => {
    let nameId;

    if (suffix === "") {
      nameId = "IndividualName";
    } else if (suffix === "2") {
      nameId = document.getElementById("IndividualName2")
        ? "IndividualName2"
        : "IndividualNameo";
    } else if (suffix === "3") {
      nameId = document.getElementById("IndividualName3")
        ? "IndividualName3"
        : "IndividualNamet";
    }

    const input = document.getElementById(nameId);
    if (!input) return;

    const handler = () => autoFillRankByNameFor(suffix);
    input.addEventListener("change", handler);
    input.addEventListener("input",  handler);
    input.addEventListener("blur",   handler);
  });





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
  // ✅ جديد: إذا التخزين "كشف" نخلي الحد 20 بدل 40/41
  const choice = (localStorage.getItem("wordLinkChoice") || localStorage.getItem("lastWordLinkChoice") || "").trim();
  const isKashf = (choice === "كشف");

  // كل حدود 40/41 تتحول إلى 20 في وضع كشف
  const CUT  = isKashf ? 20 : 40; // بدل 40
  const CUTP = isKashf ? 20 : 41; // بدل 41 (في كشف تصبح 20)

  // الحدود بالدقائق
  const M_13_40 = 13*60 + CUT;   // كان 13:40 → في كشف 13:20
  const M_21_40 = 21*60 + CUT;   // كان 21:40 → في كشف 21:20
  const M_21_41 = 21*60 + CUTP;  // كان 21:41 → في كشف 21:20
  const M_05_40 = 5*60  + CUT;   // كان 05:40 → في كشف 05:20
  const M_05_41 = 5*60  + CUTP;  // كان 05:41 → في كشف 05:20

  // 13:40 - 21:40  (وفي كشف: 13:20 - 21:20)
  if (mins >= M_13_40 && mins <= M_21_40){
    return { from: '2م', to: '10م' };
  }

  // 21:41 - 23:59 أو 00:00 - 05:40  (وفي كشف: 21:20 - 23:59 أو 00:00 - 05:20)
  if (mins >= M_21_41 || mins <= M_05_40){
    return { from: '10م', to: '6ص' };
  }

  // 05:41 - 13:40  (وفي كشف: 05:20 - 13:20)
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
  // اقرأ الاختيار المخزن
  const choice =
    (localStorage.getItem('wordLinkChoice') ||
     localStorage.getItem('lastWordLinkChoice') || '').trim();

  // حمّل المحفوظات كالمعتاد
  loadShiftFields();

  // ✅ إذا كان الاختيار = كشف: فرّغ فقط هذه الحقول تلقائياً عند فتح الصفحة
  if (choice === 'كشف') {
    const idsToClear = ['shift-number', 'officer-name', 'officer-rank'];
    idsToClear.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  bindAutoSaveForShiftFields();
  scheduleShiftStorageCleaner();
});


document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('moatan-compact');
  if(!root) return;

  const updateMaster = (typeof window.updateMaster === 'function')
    ? window.updateMaster
    : function(){};

  function clearInputs(selectors){
    selectors.forEach(sel => {
      const el = root.querySelector(sel);
      if(el && el.tagName === 'INPUT' && ['text','search','number'].includes(el.type || 'text')){
        el.value = '';
      }
    });
  }

  function wireSection(masterSel, subSelList, subInputsMap = {}){
    const master = root.querySelector(masterSel);
    const subs   = subSelList.map(s => root.querySelector(s)).filter(Boolean);
    if(!master || subs.length === 0) return;

    master.addEventListener('change', () => {
      if(!master.checked){
        subs.forEach(cb => cb.checked = false);
        Object.values(subInputsMap).forEach(arr => clearInputs(arr));
      }
      updateMaster();
    });

    subs.forEach(cb => cb.addEventListener('change', () => {
      if(cb.checked) master.checked = true;
      updateMaster();
    }));
  }

/* ===== القسم الأول: مغادر إلى… ===== */
const forbiddenMaster = '#mc-forbidden';
const forbiddenSubs = [
  '#mc-moi',
  '#mc-jawazat',
  '#mc-diplomatic',
  '#mc-under18',
  '#mc-permit'          // ✅ الفرع الجديد: لديه تصريح سفر
];

const subInputsMap = {
  '#mc-moi':       ['#mc-moiNum', '#mc-moiDate', '#mc-moiDirNum'],
  '#mc-jawazat':   ['#mc-jawazatNum', '#mc-jawazatDate'],
  '#mc-diplomatic':['#mc-diplomaticDesc'],
  '#mc-permit':    ['#mc-permitFrom', '#mc-permitTo', '#mc-permitDest'] // ✅ مدخلات التصريح
};


  wireSection(forbiddenMaster, forbiddenSubs, subInputsMap);

  function selectSingleBranch(activeSel){
    forbiddenSubs.forEach(sel => {
      if(sel !== activeSel){
        const other = root.querySelector(sel);
        if(other) other.checked = false;
        if(subInputsMap[sel]) clearInputs(subInputsMap[sel]);
      }
    });
    const master = root.querySelector(forbiddenMaster);
    if(master) master.checked = true;
    updateMaster();
  }

  forbiddenSubs.forEach(sel => {
    const cb = root.querySelector(sel);
    if(!cb) return;
    cb.addEventListener('change', () => {
      if(cb.checked) selectSingleBranch(sel);
      else { if(subInputsMap[sel]) clearInputs(subInputsMap[sel]); updateMaster(); }
    });
  });

  Object.entries(subInputsMap).forEach(([sel, inputs]) => {
    inputs.forEach(inpSel => {
      const inp = root.querySelector(inpSel);
      if(!inp) return;
      ['input','change'].forEach(ev => inp.addEventListener(ev, () => {
        const anyText = inputs.some(s => {
          const e = root.querySelector(s);
          return e && typeof e.value === 'string' && e.value.trim() !== '';
        });
        const cb = root.querySelector(sel);
        if(!cb) return;
        if(anyText){
          cb.checked = true;
          selectSingleBranch(sel);
        }else{
          cb.checked = false;
          updateMaster();
        }
      }));
    });
  });

  /* ===== القسم الثاني: العسكريين ===== */
  wireSection('#mc-military', [
    '#mc-mil-nosdoc', '#mc-mil-destdiff', '#mc-mil-leavenotstart', '#mc-mil-other', '#mc-mil-attach-leave'
  ]);

  /* ===== القسم الثالث: الوثيقة أقل من المدة ===== */
  wireSection('#mc-docless', ['#mc-doc-3m', '#mc-doc-6m']);

  ['#mc-doc-3m', '#mc-doc-6m'].forEach(sel => {
    const cb = root.querySelector(sel);
    if(!cb) return;
    cb.addEventListener('change', () => {
      if(cb.checked){
        ['#mc-doc-3m', '#mc-doc-6m'].forEach(oSel => {
          if(oSel !== sel){
            const o = root.querySelector(oSel);
            if(o) o.checked = false;
          }
        });
        const master = root.querySelector('#mc-docless');
        if(master) master.checked = true;
      }
      updateMaster();
    });
  });

});
// === تنسيق تلقائي لأي input يملك الكلاس h-date إلى: dd/mm/yyyy هـ ===
// يدعم أرقام عربية/إنجليزية، فواصل/شرطات، وترتيب سنة-شهر-يوم أو يوم-شهر-سنة
(function attachHijriDateNormalizer(){
  // تحويل الأرقام العربية -> إنجليزية
  const toLatinDigits = (s) => s.replace(
    /[٠-٩]/g,
    (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]
  );

  function normalizeHijriDate(raw){
    if (!raw) return "";

    // 1) توحيد الأرقام وإزالة المسافات الزائدة
    let s = toLatinDigits(String(raw).trim());
    // حذف لاحقة هـ إن وُجدت وأي مسافات حولها
    s = s.replace(/\s*هـ\s*$/u, "");
    // 2) نفصل بالأحرف غير الرقمية
    let parts = s.split(/[^\d]+/).filter(Boolean);

    // دعم الإدخال المتصل: ddmmyyyy (8 أرقام)
    if (parts.length === 1 && /^\d{6,8}$/.test(parts[0])) {
      const t = parts[0];
      if (t.length === 8) parts = [t.slice(0,2), t.slice(2,4), t.slice(4)];
      else if (t.length === 7) parts = [t.slice(0,1), t.slice(1,3), t.slice(3)];
      else if (t.length === 6) parts = [t.slice(0,2), t.slice(2,4), "14"+t.slice(4)];
    }

    // الآن نتوقع 3 أجزاء: يوم/شهر/سنة بأي ترتيب
    if (parts.length !== 3) return "";

    let [a,b,c] = parts.map(x => x.replace(/\D/g,""));

    // إن وُجد جزء بطول 4 نفترضه السنة
    let y, m, d;
    if (a.length === 4) { y = a; m = b; d = c; }
    else if (b.length === 4) { y = b; d = a; m = c; }
    else if (c.length === 4) { y = c; d = a; m = b; }
    else {
      // لا يوجد 4 خانات: نتعامل كـ d/m/yy -> نمدّدها إلى 14yy
      y = (c.length === 2) ? ("14" + c) : c;
      d = a; m = b;
    }

    // تصفير أمامي
    const pad2 = (n) => (n||"").padStart(2,"0");

    d = pad2(String(parseInt(d||"0",10)));
    m = pad2(String(parseInt(m||"0",10)));
    y = String(parseInt(y||"0",10)).padStart(4,"0");

    // تحقّق بسيط
    if (d === "00" || m === "00" || y.length !== 4) return "";

    return `${d}/${m}/${y} هـ`;
  }

  function bind(el){
    const apply = () => {
      const v = el.value;
      const out = normalizeHijriDate(v);
      if (out) el.value = out;
    };
    // عند فقدان التركيز أو الضغط Enter أو التغيير
    el.addEventListener("blur", apply);
    el.addEventListener("change", apply);
    el.addEventListener("keydown", (e)=>{ if (e.key === "Enter") { e.preventDefault(); apply(); } });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    document.querySelectorAll("input.h-date").forEach(bind);
  });
})();




function hideHelpBox(){
  document.getElementById("helpBox").style.display = "none";
  document.getElementById("showHelpBtn").style.display = "block";
}

function showHelpBox(){
  document.getElementById("helpBox").style.display = "block";
  document.getElementById("showHelpBtn").style.display = "none";
}


//معطيات التارياخ 
// === تنسيق تواريخ: dd/mm/yyyy + لاحقة (هـ أو م) حسب السنة ===
(function normalizeDatesHM(){
  const TARGET_IDS = ['PassportIssueDate','BirthDate','CommandDate'];

  // تحويل أرقام عربية -> إنجليزية
  const toLatin = s => String(s||'').replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

  function formatAnyDate(raw){
    if(!raw) return '';
    // 1) تنظيف
    let s = toLatin(raw).trim();
    s = s.replace(/\s*[هـم]\s*$/u, '');      // احذف لاحقة هـ/م إن كُتبت يدويًا
    const parts = s.split(/[^\d]+/).filter(Boolean);
    if(parts.length < 3) return '';

    // 2) تحديد اليوم/الشهر/السنة تلقائيًا
    let [a,b,c] = parts.slice(0,3).map(x => x.replace(/\D/g,''));
    let y,m,d;
    if (a.length === 4) { y=a; m=b; d=c; }       // yyyy/mm/dd
    else if (b.length === 4) { y=b; d=a; m=c; }  // dd/mm/yyyy
    else { y=c; d=a; m=b; }                      // dd/mm/yyyy (أو مشابه)

    const pad2 = n => String(parseInt(n||'0',10)).padStart(2,'0');
    d = pad2(d); m = pad2(m); y = String(parseInt(y||'0',10)).padStart(4,'0');
    if (d==='00' || m==='00' || y.length!==4) return '';

    // 3) تحديد هجرية/ميلادية من السنة
    const yr = parseInt(y,10);
    // نفترض الهجري بين 1300–1600 تقريبًا، وغير ذلك ميلادي
    const suffix = (yr >= 1300 && yr <= 1600) ? 'هـ' : 'م';

    return `${d}/${m}/${y} ${suffix}`;
  }

  function bind(id){
    const el = document.getElementById(id);
    if(!el) return;
    const apply = () => {
      const out = formatAnyDate(el.value);
      if(out) el.value = out;
    };
    ['blur','change'].forEach(ev => el.addEventListener(ev, apply));
    el.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); apply(); } });
    // طبّق مباشرة لو فيه قيمة مسبقًا
    if (el.value) apply();
  }

  document.addEventListener('DOMContentLoaded', () => TARGET_IDS.forEach(bind));
})();
// بدءًا من التحميل: يظهر الصندوق مصغّرًا مع الأزرار داخله
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('helpBox');
  const btnHide = document.getElementById('helpHideBtn');
  const btnRestore = document.getElementById('helpRestoreBtn');
  const btnDetails = document.getElementById('helpDetailsBtn');
  const overlay = document.getElementById('helpOverlay');
  const overlayClose = document.getElementById('helpOverlayClose');

  if (!box) return;

  // يبدأ "ظاهر"
  box.classList.remove('is-collapsed');
  if (btnRestore) btnRestore.hidden = true;

  // إخفاء (تحويل إلى شريحة صغيرة داخل نفس المكان)
  if (btnHide) btnHide.addEventListener('click', () => {
    box.classList.add('is-collapsed');
    if (btnRestore) btnRestore.hidden = false;
    box.setAttribute('aria-label', 'صندوق تعليمات (مخفي، اضغط لإظهار)');
  });

  // إظهار بعد الإخفاء
  if (btnRestore) btnRestore.addEventListener('click', () => {
    box.classList.remove('is-collapsed');
    btnRestore.hidden = true;
    box.setAttribute('aria-label', 'مربع التعليمات');
  });

  // فتح اللوحة الكاملة بالصور
  if (btnDetails) btnDetails.addEventListener('click', () => {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');

    // إغلاق عند النقر على الخلفية
    const onBackdrop = (e) => { if (e.target === overlay) { hideHelpOverlay(); } };
    overlay.addEventListener('click', onBackdrop, { once: true });

    function hideHelpOverlay(){
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (overlayClose) {
      overlayClose.onclick = hideHelpOverlay;
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('selected-template');
  const nameEl = document.getElementById('selected-template-name');
  if (!banner || !nameEl) return;

  const getChoice = () =>
    localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '';

  const renderChoice = () => {
    const choice = (getChoice() || '').trim();
    if (choice) {
      nameEl.textContent = choice;  // مثال: "تعقب-مغادرة"
      banner.hidden = false;
    } else {
      banner.hidden = true;
      nameEl.textContent = '';
    }
  };

  renderChoice();

  // في حال تغيّرت التخزينة أثناء الجلسة
  window.addEventListener('storage', (e) => {
    if (e.key === 'wordLinkChoice' || e.key === 'lastWordLinkChoice') renderChoice();
  });
});
document.addEventListener('DOMContentLoaded', () => {
  // 1) إخفِ عنوان وحقول "وقت الشفت والموازنة" افتراضيًا
  const titleIcon = document.querySelector('h3.card__title i.fa-business-time');
  const titleH3   = titleIcon?.parentElement;
  const body      = titleH3?.nextElementSibling;

  if (titleH3) titleH3.style.display = 'none';
  if (body && body.classList.contains('card__body')) body.style.display = 'none';

const ids = [
  'ReceiveTimeFrom','ReceiveTimeTo',
  'BalanceTimeFrom','BalanceTimeTo',
  'EveningBalanceFrom','EveningBalanceTo',
  'BalanceDateNight','BalanceWeekday',
  // ✨ أضف الحقول هنا لربطها بشرط الشفت
  'ListOfficerName','ListOfficerRank',
  'AdminOfficerName','AdminOfficerRank'
];

  ids.forEach(id => {
    const inputEl = document.getElementById(id);
    const labelEl = document.querySelector(`label[for='${id}']`);
    if (inputEl) inputEl.style.display = 'none';
    if (labelEl) labelEl.style.display = 'none';
  });

  // 2) اقرأ الاختيار المخزن
const choice = (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();

  // 3) إذا كان "استلام" -> أظهر البطاقة وكل حقولها
  if (choice === 'استلام-اليوم' || choice === 'كشف') {
    // إن وُجدت بطاقة مخصصة للشفت
    const shiftCard = document.getElementById('card-shift-balance');
    if (shiftCard) shiftCard.style.display = 'block';

    // إن وُجدت بطاقة الصادر الخاصة بالشفت
    const issuedShaftCard = document.getElementById('card-issued-shaft');
    if (issuedShaftCard) issuedShaftCard.style.display = 'block';

    // أظهر العنوان والجسم
    if (titleH3) titleH3.style.display = 'flex';
    if (body) body.style.display = 'grid';

    // أظهر الحقول والليبلز فرديًا (ضمانًا)
    ids.forEach(id => {
      const inputEl = document.getElementById(id);
      const labelEl = document.querySelector(`label[for='${id}']`);
      if (inputEl) inputEl.style.display = '';
      if (labelEl) labelEl.style.display = '';
    });
    selectEl.addEventListener('change', () => {
  const choice = selectEl.value.trim();
  if (choice !== 'استلام-اليوم') {
    localStorage.removeItem('receipt_today_payload');     // نظّف أي بقايا
  }
  enforceIssuedCard();                                    // طبّق العرض فورًا
});

    // إن أردت الاقتصار على بطاقات محددة عند هذا الوضع:
    // (هذا منطق موجود أصلًا في ملفك)
const keep = new Set(['card-receipt','card-shift-balance','card-issued-shaft','card-lists-admin','card-issued-data']);
    document.querySelectorAll('.card').forEach(card => {
      if (card.id) card.style.display = keep.has(card.id) ? 'block' : 'none';
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // نفس أسلوبك: نقرأ choice الأصلي
  const choice = localStorage.getItem("wordLinkChoice");

  // هل "استلام-اليوم" محفوظ فعلاً في localStorage؟
  function hasSavedReceiveTime(){
    try{
      const raw = localStorage.getItem("receipt_today_payload"); // تُحفظ هنا بعد saveAll()
      if(!raw) return false;
      const obj = JSON.parse(raw);
      return (obj?.ReceiveTimeFrom || "").trim() !== "";
    }catch{ return false; }
  }

  // نحسب choice وفق التخزين، حتى نستخدم نفس أسلوبك تمامًا
  const computedChoice = hasSavedReceiveTime() ? "استلام-اليوم" : choice;
const issuedCard = document.getElementById('card-issued-data');
if (issuedCard) issuedCard.style.display = (computedChoice === "استلام-اليوم") ? "block" : "none";


  // ✅ نفس الأسلوب بالضبط
if (computedChoice === "استلام-اليوم" || computedChoice === "حذف-السجلات") {
    ["ListOfficerName","ListOfficerRank","ListOfficerSuggestions","AdminOfficerName","AdminOfficerRank"].forEach(id => {
      const el  = document.getElementById(id);
      const lbl = document.querySelector(`label[for='${id}']`);
      if (el)  el.style.display = "block";
      if (lbl) lbl.style.display = "block";
    });
  } else {
    // إبقاءها مخفية إن لم يتحقق الشرط
    ["ListOfficerName","ListOfficerRank","ListOfficerSuggestions","AdminOfficerName","AdminOfficerRank"].forEach(id => {
      const el  = document.getElementById(id);
      const lbl = document.querySelector(`label[for='${id}']`);
      if (el)  el.style.display = "none";
      if (lbl) lbl.style.display = "none";
    });
  }
});
document.addEventListener('DOMContentLoaded', async () => {
  // ... كودك الحالي ...

  // حمّل قاعدة الأسماء ثم اربط حقولك
  await loadNameDB();
  const adminSug = setupAdminOfficerSuggestions();

  // ✅ اعرض الاقتراحات فورًا إذا الشفت/الصالة محفوظين والحقل فاضي
  adminSug?.refresh?.();
  // أسماء القوائم → ListOfficerName يملأ ListOfficerRank
  bindAutoRank('ListOfficerName',  'ListOfficerRank',  'lists');

  // الأعمال الإدارية → AdminOfficerName يملأ AdminOfficerRank
  bindAutoRank('AdminOfficerName', 'AdminOfficerRank', 'admin');

  // ... بقية كودك الحالي ...
});
// خرائط الأسماء والرتب
const nameDB = { lists: new Map(), admin: new Map(), rawLists: [], rawAdmin: [] };

// دالة مساعدة: إنشاء/جلب datalist
function ensureDatalist(id) {
  let dl = document.getElementById(id);
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = id;
    document.body.appendChild(dl);
  }
  return dl;
}

// تعبئة datalist من مصفوفة أسماء
function fillDatalist(datalistEl, namesArray) {
  datalistEl.innerHTML = ''; // مهم: امسح أي أسماء قديمة
  namesArray.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    datalistEl.appendChild(opt);
  });
}

// تحميل القاعدة وربط الحقول بقوائمها الخاصة
async function loadNameDB() {
  try {
    // جرّب من الملف الخارجي أولاً
    const res = await fetch('./namecont.json', { cache: 'no-cache' });
    const data = await res.json();

    // إعادة تهيئة القاعدة (حتى لا تتكرر الأسماء عند إعادة التحميل)
    nameDB.lists.clear();
    nameDB.admin.clear();

    // نخزّن البيانات الخام (لاستخدام الاقتراحات حسب الشفت/الصالة)
    // ✅ يدعم شكلين للملف:
    // 1) { lists: [...], admin: [...] }
    // 2) [ {...}, {...} ]  ← يُعتبر كله ضمن lists
    const listsArr = Array.isArray(data) ? data : (Array.isArray(data.lists) ? data.lists : []);
    const adminArr = (!Array.isArray(data) && Array.isArray(data.admin)) ? data.admin : [];

    nameDB.rawLists = listsArr;
    nameDB.rawAdmin = adminArr;

    // املأ الخرائط (الاسم → الرتبة)
    nameDB.rawLists.forEach(item => nameDB.lists.set(item.name, item.rank));
    nameDB.rawAdmin.forEach(item => nameDB.admin.set(item.name, item.rank));
  } catch (e) {
    // بديل: لو تضمّنت القاعدة داخل الصفحة <script type="application/json" id="namecont-data">
    const embed = document.getElementById('namecont-data');
    if (embed?.textContent) {
      const data = JSON.parse(embed.textContent);

      nameDB.lists.clear();
      nameDB.admin.clear();

      const listsArr = Array.isArray(data) ? data : (Array.isArray(data.lists) ? data.lists : []);
      const adminArr = (!Array.isArray(data) && Array.isArray(data.admin)) ? data.admin : [];

      nameDB.rawLists = listsArr;
      nameDB.rawAdmin = adminArr;
      nameDB.rawLists.forEach(item => nameDB.lists.set(item.name, item.rank));
      nameDB.rawAdmin.forEach(item => nameDB.admin.set(item.name, item.rank));
    } else {
      console.error('تعذّر تحميل namecont.json ولا يوجد بديل مضمّن');
    }
  }

  // أنشئ قوائم منفصلة ولا تدمج مع #names
  const dlLists = ensureDatalist('names-lists');
  const dlAdmin = ensureDatalist('names-admin');

  fillDatalist(dlLists, [...nameDB.lists.keys()]);
  fillDatalist(dlAdmin, [...nameDB.admin.keys()]);

  // اربط الحقول بقوائمها (بدون تعديل HTML)
  const listNameInput  = document.getElementById('ListOfficerName');
  const adminNameInput = document.getElementById('AdminOfficerName');

  if (listNameInput) {
    listNameInput.setAttribute('list', 'names-lists');
    listNameInput.setAttribute('autocomplete', 'off'); // لمنع اقتراحات المتصفح
  }
  if (adminNameInput) {
    adminNameInput.setAttribute('list', 'names-admin');
    adminNameInput.setAttribute('autocomplete', 'off');
  }

  // (اختياري) توليد قائمة رتب موحّدة من القاعدة ودمجها مع الموجود
  const ranksSet = new Set([...nameDB.lists.values(), ...nameDB.admin.values()]);
  const ranksDL = ensureDatalist('ranks');
  // لا نمسح الموجود إذا عندك رتب إضافية يدوية؛ لو تبغى مسحها استبدل التالي بـ ranksDL.innerHTML=''
  const existing = new Set(Array.from(ranksDL.querySelectorAll('option')).map(o => o.value));
  ranksSet.forEach(r => {
    if (!existing.has(r)) {
      const opt = document.createElement('option');
      opt.value = r;
      ranksDL.appendChild(opt);
    }
  });
}

// تعبئة الرتبة تلقائيًا حسب الاسم
function bindAutoRank(nameInputId, rankInputId, source /* 'lists' | 'admin' */) {
  const nameInput = document.getElementById(nameInputId);
  const rankInput = document.getElementById(rankInputId);
  if (!nameInput || !rankInput) return;

  const fill = () => {
    const v = nameInput.value.trim();
    const r = nameDB[source].get(v) || ''; // لا نبحث في المصدر الآخر حتى لا تختلط القواعد
    if (r) rankInput.value = r;
  };
  nameInput.addEventListener('change', fill);
  nameInput.addEventListener('blur', fill);
  // لو تحب أثناء الكتابة:
  // nameInput.addEventListener('input', fill);
}

// ================== اقتراحات اسم القائمة (حسب الشفت + رقم الصالة) ==================
function _toEnglishDigits(str){
  // يحوّل الأرقام العربية/الفارسية إلى إنجليزية لتوحيد المقارنة
  return String(str ?? '')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function _normShift(str){
  return String(str ?? '').trim(); // نُبقيها كما هي (مثل: أ/ب/ج)
}
function _normHall(str){
  return _toEnglishDigits(String(str ?? '').trim());
}

function setupListOfficerSuggestions(){
  const nameInput = document.getElementById('ListOfficerName');
  const shiftEl   = document.getElementById('shift-number');
  const hallEl    = document.getElementById('hall-number');

  const box   = document.getElementById('ListOfficerSuggestions');
  const items = document.getElementById('ListOfficerSuggestionsItems');

  if (!nameInput || !shiftEl || !hallEl || !box || !items) return;

  // ✅ الصندوق ظاهر دائمًا
  box.hidden = false;
  box.style.display = 'flex';

  const render = (suggestions, noteText = '') => {
    items.innerHTML = '';

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'name-suggest__empty';
      msg.textContent = noteText || 'لا توجد اقتراحات لهذه المناوبة والصالة';
      items.appendChild(msg);
      return;
    }

    suggestions.slice(0, 3).forEach(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'name-suggest__btn';
      btn.textContent = it.name || '';

      btn.addEventListener('click', () => {
        nameInput.value = it.name || '';
        nameInput.dispatchEvent(new Event('change', { bubbles: true })); // لتعبئة الرتبة تلقائيًا
        nameInput.focus();
        // ❌ لا يوجد hide
      });

      items.appendChild(btn);
    });
  };

  const refresh = () => {
    const shift = _normShift(shiftEl.value || '');
    const hall  = _normHall(hallEl.value || '');

    if (!shift || !hall) {
      render([], 'اختر الشفت والصالة لعرض الاقتراحات');
      return;
    }

    // ✅ مصدر القوائم الصحيح
    const src = Array.isArray(nameDB.rawLists) ? nameDB.rawLists : [];

    const matches = src.filter(it =>
      _normShift(it.shift || '') === shift &&
      _normHall(it.hall  || '') === hall
    );

    render(matches);
  };

  shiftEl.addEventListener('input', refresh);
  shiftEl.addEventListener('change', refresh);
  hallEl.addEventListener('input', refresh);
  hallEl.addEventListener('change', refresh);

  nameInput.addEventListener('focus', refresh);

  refresh();
  return { refresh };
}

// ✅ اقترحات "اسم الأعمال الإدارية"
// ✅ اقتراحات "اسم الأعمال الإدارية" — بدون أي إخفاء
function setupAdminOfficerSuggestions(){
  const nameInput = document.getElementById('AdminOfficerName');
  const shiftEl   = document.getElementById('shift-number');
  const hallEl    = document.getElementById('hall-number');

  const box   = document.getElementById('AdminOfficerSuggestions');
  const items = document.getElementById('AdminOfficerSuggestionsItems');

  if (!nameInput || !shiftEl || !hallEl || !box || !items) return;

  // ✅ اجعل الصندوق ظاهر دائمًا
  box.hidden = false;
  box.style.display = 'flex';

  const render = (suggestions, noteText = '') => {
    items.innerHTML = '';

    // إذا ما فيه شفت/صالة أو ما فيه نتائج، نعرض رسالة بدل الإخفاء
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'name-suggest__empty';
      msg.textContent = noteText || 'لا توجد اقتراحات لهذه المناوبة والصالة';
      items.appendChild(msg);
      return;
    }

    suggestions.slice(0, 3).forEach(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'name-suggest__btn';
      btn.textContent = it.name || '';

      btn.addEventListener('click', () => {
        nameInput.value = it.name || '';
        // لو تحتاج تعبئة الرتبة تلقائيًا اترك change
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        nameInput.focus();
        // ❌ لا يوجد hide هنا
      });

      items.appendChild(btn);
    });
  };

  const refresh = () => {
    const shift = _normShift(shiftEl.value || '');
    const hall  = _normHall(hallEl.value || '');

    // ✅ إذا الشفت/الصالة غير مكتملة: اعرض رسالة بدل الإخفاء
    if (!shift || !hall) {
      render([], 'اختر الشفت والصالة لعرض الاقتراحات');
      return;
    }

    // ✅ المصدر الصحيح للأعمال الإدارية
    const src = Array.isArray(nameDB.rawAdmin) ? nameDB.rawAdmin : [];

    const matches = src.filter(it =>
      _normShift(it.shift || '') === shift &&
      _normHall(it.hall  || '') === hall
    );

    render(matches);
  };

  // تحديث عند تغيير الشفت/الصالة
  shiftEl.addEventListener('input', refresh);
  shiftEl.addEventListener('change', refresh);
  hallEl.addEventListener('input', refresh);
  hallEl.addEventListener('change', refresh);

  // (اختياري) تحديث عند فتح الصفحة/تركيز الحقل
  nameInput.addEventListener('focus', refresh);

  // تشغيل أولي
  refresh();

  // حتى تقدر تناديها من الخارج إن احتجت
  return { refresh };
}



// فعِّل عند تحميل الصفحة (أضِف داخل DOMContentLoaded لديك أو غيّر المستمع الحالي)
document.addEventListener('DOMContentLoaded', async () => {
  await loadNameDB();
  const adminSug = setupAdminOfficerSuggestions();
  adminSug?.refresh?.();
  // أسماء القوائم ↔ رتبها من قسم lists
  bindAutoRank('ListOfficerName',  'ListOfficerRank',  'lists');

  // أسماء الأعمال الإدارية ↔ رتبها من قسم admin
  bindAutoRank('AdminOfficerName', 'AdminOfficerRank', 'admin');

  // ✅ اقتراحات اسم القائمة حسب الشفت/الصالة
  setupListOfficerSuggestions();
  setupAdminOfficerSuggestions();

});
//وقت الموازنة 
/* ============================================================
   منطق وقت الموازنة بناءً على "الوقت الحالي"
   - إذا الآن بين 21:40 و 05:40 ⇒ نطبّق القيم الخاصة.
   - غير ذلك ⇒ الموازنة = الاستلام.
============================================================ */
(function () {
  // غيّر هذه المعرّفات إذا كانت مختلفة في صفحتك:
  const ID_RECEIVE_FROM = 'ReceiveTimeFrom';
  const ID_RECEIVE_TO   = 'ReceiveTimeTo';
  const ID_BAL_FROM     = 'BalanceTimeFrom';
  const ID_BAL_TO       = 'BalanceTimeTo';
  const ID_EBAL_FROM    = 'EveningBalanceFrom';
  const ID_EBAL_TO      = 'EveningBalanceTo';

  // أدوات مساعدة
  function isTimeInput(el) {
    return el && el.tagName === 'INPUT' && el.type === 'time';
  }
  function setTime(el, as24h /* "HH:MM" */, asAr /* مثل "10م" */) {
    if (!el) return;
    if (isTimeInput(el)) el.value = as24h;
    else el.value = asAr;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // هل "الوقت الحالي" داخل المدى الخاص (21:40 ↔ 05:40)؟
  function inSpecialRangeNow() {
    const now = new Date();
    const t = now.getHours() * 60 + now.getMinutes(); // دقائق منذ منتصف الليل
    const start = 21 * 60 + 40; // 21:40 = 1300
    const end   = 5  * 60 + 40; // 05:40 = 340
    // المدى عابر لمنتصف الليل: [21:40 .. 23:59] ∪ [00:00 .. 05:40]
    return (t >= start) || (t <= end);
  }

  function syncBalanceTimesByNow() {
    const rf = document.getElementById(ID_RECEIVE_FROM);
    const rt = document.getElementById(ID_RECEIVE_TO);
    const bf = document.getElementById(ID_BAL_FROM);
    const bt = document.getElementById(ID_BAL_TO);
    const ef = document.getElementById(ID_EBAL_FROM);
    const et = document.getElementById(ID_EBAL_TO);
    if (!bf || !bt || !ef || !et) return;

    if (inSpecialRangeNow()) {
      // القيم الخاصة المطلوبة في المدى الليلي:
      // BalanceTimeFrom = 10م  -> 22:00
      // BalanceTimeTo   = 11:59م -> 23:59
      // EveningBalanceFrom = 12م  -> 12:00
      // EveningBalanceTo   = 6م   -> 18:00
      setTime(bf, '22:00', '10م');
      setTime(bt, '23:59', '11:59م');
      setTime(ef, '12:00', '12ص');
      setTime(et, '18:00', '6ص');
    } else {
      // خارج المدى الليلي → الموازنة = الاستلام
      if (rf && bf) {
        if (isTimeInput(bf) && isTimeInput(rf)) bf.value = rf.value;
        else bf.value = (rf?.value || '').trim();
      }
      if (rt && bt) {
        if (isTimeInput(bt) && isTimeInput(rt)) bt.value = rt.value;
        else bt.value = (rt?.value || '').trim();
      }
      [bf, bt].forEach(el => el && el.dispatchEvent(new Event('change', { bubbles: true })));
    }
  }

  function bind() {
    const rf = document.getElementById(ID_RECEIVE_FROM);
    const rt = document.getElementById(ID_RECEIVE_TO);

    // عند تغيّر وقت الاستلام نعيد المزامنة (بحيث يُنسخ في وضع النهار)
    if (rf) {
      rf.addEventListener('change', syncBalanceTimesByNow);
      rf.addEventListener('blur',   syncBalanceTimesByNow);
      // لو تحب أثناء الكتابة:
      // rf.addEventListener('input',  syncBalanceTimesByNow);
    }
    if (rt) {
      rt.addEventListener('change', syncBalanceTimesByNow);
      rt.addEventListener('blur',   syncBalanceTimesByNow);
      // rt.addEventListener('input',  syncBalanceTimesByNow);
    }

    // شغّلها فور التحميل
    syncBalanceTimesByNow();

    // (اختياري) أعد الحساب كل دقيقة عشان لو الوقت عبر الحدّ يتحدّث تلقائيًا
    setInterval(syncBalanceTimesByNow, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
// تحويل آمن إلى عدد صحيح
function toInt(v){
  const n = parseInt(String(v||'').replace(/\D/g,''), 10);
  return isNaN(n) ? 0 : n;
}

// مزامنة قيم المخرجات عند إدخال "الحضور والانصراف"
// كل خانة تأخذ (قيمة الحضور) + تعويض متزايد: +1 ثم +2 ثم +3 ...
function syncIssuedFromAttendance(){
  const a = document.getElementById('IssuedAttendance');
  if(!a) return;

  const base = toInt(a.value);

  const targetsWithOffsets = [
    ['IssuedBalance',   1], // الموازنة  = base + 1
    ['IssuedManifests', 2], // المنفستات = base + 2
    ['IssuedReports',   3], // التقارير  = base + 3
    ['IssuedGates',     4], // البوابات  = base + 4
    ['IssuedExtra1',    5], // إضافي     = base + 5
    ['IssuedExtra2',    6], // إضافي     = base + 6
  ];

  targetsWithOffsets.forEach(([id, off])=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(a.value.trim()===''){   // لو فاضي، نظفها
      el.value = '';
    }else{
      el.value = String(base + off);
    }
  });
}

// اربط الحدث (لو لم تكن ربطته من قبل)
document.addEventListener('DOMContentLoaded', function(){
  const a = document.getElementById('IssuedAttendance');
  if(a){
    a.addEventListener('input', syncIssuedFromAttendance);
    syncIssuedFromAttendance();
  }
});


//عنوان الصادر
// يبني العنوان: /م {shift} مغادرة {hall}
function updateIssuedTitle(){
  const field = document.getElementById('IssuedTitle');
  if (!field) return;

  const shift = (document.getElementById('shift-number')?.value || '').trim();
  const hall  = (document.getElementById('hall-number')?.value  || '').trim();

  if (shift || hall){
    const parts = ['/م'];
    if (shift) parts.push(shift);
    if (hall)  parts.push('مغادرة', hall);
    field.value = parts.join(' ').replace(/\s+/g,' ').trim();
  } else {
    // فارغ إذا ما في معطيات
    field.value = '';
  }
}

// استدعاء عند التحميل والكتابة
document.addEventListener('DOMContentLoaded', () => {
  updateIssuedTitle();
  ['shift-number','hall-number'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateIssuedTitle);
  });
});
// ===== مؤقت الرجوع التلقائي + إيقافه =====
const AUTO_BACK_MS = 2 * 60 * 1000; // نفس المدّة الحالية (دقيقتان). غيّرها إن رغبت.

const AutoBack = {
  timerId: null,
  tickId: null,
  remainingMs: 0,
  active: false
};

function fmtMMSS(ms){
  const total = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(total/60);
  const s = total % 60;
  return `${String(m).padStart(1,'0')}:${String(s).padStart(2,'0')}`;
}

function updateAutoBackUI(){
  const wrap = document.getElementById('auto-back-timer');
  const val  = document.getElementById('auto-back-timer-value');
  const btn  = document.getElementById('cancel-auto-back');
  if (!wrap || !val || !btn) return;

  if (AutoBack.active){
    val.textContent = fmtMMSS(AutoBack.remainingMs);
    wrap.hidden = false;
    btn.hidden  = false;
  } else {
    wrap.hidden = true;
    btn.hidden  = true;
  }
}

function cleanupAutoBack(){
  if (AutoBack.timerId){ clearTimeout(AutoBack.timerId); AutoBack.timerId = null; }
  if (AutoBack.tickId){  clearInterval(AutoBack.tickId);  AutoBack.tickId  = null; }
  AutoBack.active = false;
  updateAutoBackUI();
}

function scheduleAutoBack(ms){
  cleanupAutoBack();
  AutoBack.remainingMs = ms;
  AutoBack.active = true;
  updateAutoBackUI();

  // عدّ تنازلي مرئي كل ثانية
  AutoBack.tickId = setInterval(()=>{
    AutoBack.remainingMs -= 1000;
    updateAutoBackUI();
    if (AutoBack.remainingMs <= 0){
      clearInterval(AutoBack.tickId); AutoBack.tickId = null;
    }
  }, 1000);

  // عند انتهاء المهلة: امسح القيم ثم ارجع للصفحة السابقة
  AutoBack.timerId = setTimeout(()=>{
    try {
      localStorage.removeItem('wordLinkChoice');
      localStorage.removeItem('lastWordLinkChoice');
    } catch(e){}
    AutoBack.active = false;
    updateAutoBackUI();
    window.history.back();
  }, ms);
}

// زر "إيقاف العودة"
document.getElementById('cancel-auto-back')?.addEventListener('click', ()=>{
  cleanupAutoBack();
});

document.addEventListener('DOMContentLoaded', () => {
  // إخفاء عناصر العدّاد والزر عند التحميل
  document.getElementById('auto-back-timer')?.setAttribute('hidden', '');
  document.getElementById('cancel-auto-back')?.setAttribute('hidden', '');
});

// تحميل شركات الطيران والوجهات من fly.json
// تحميل شركات الطيران والوجهات من fly.json
async function loadFlyData() {
  try {
    const res = await fetch('fly.json', { cache: 'no-store' });
    const data = await res.json();

    // ====== (A) خريطة: iata -> name_ar ======
    const airlineByIata = new Map();
    (data.airlines || []).forEach(a => {
      const code = String(a.iata || '').toUpperCase().trim();
      const ar   = String(a.name_ar || '').trim();
      if (code && ar) airlineByIata.set(code, ar);
    });

 // ====== (B) تعبئة datalist بحيث "الاسم العربي" هو الأساس ======
const dlAir = document.getElementById('airlines');
if (dlAir) {
  dlAir.innerHTML = '';
  const seen = new Set(); // لمنع تكرار الشركات (موجود تكرار في fly.json)

  (data.airlines || [])
    .sort((a,b)=> (a.priority||999)-(b.priority||999))
    .forEach(a => {
      const ar   = String(a.name_ar || '').trim();
      const code = String(a.iata || '').toUpperCase().trim();
      const en   = String(a.name_en || '').trim();
      if (!ar) return;

      // امنع التكرار
      if (seen.has(ar)) return;
      seen.add(ar);

      const opt = document.createElement('option');

      // ✅ الأساسي (الذي يظهر ويُكتب) = الاسم العربي
      opt.value = ar;

      // ✅ معلومات إضافية (قد تظهر بشكل ثانوي حسب المتصفح)
      // إذا ما تبيها نهائياً، احذف هذا السطر
      opt.label = code ? `${code}${en ? ` (${en})` : ''}` : (en ? `(${en})` : '');

      dlAir.appendChild(opt);
    });
}


    // ====== (C) تحويل الرمز داخل الحقل إلى الاسم العربي بعد الاختيار ======
    function bindAirlineInput(id){
      const el = document.getElementById(id);
      if (!el) return;

      const apply = () => {
        const v = String(el.value || '').toUpperCase().trim();
        const ar = airlineByIata.get(v);
        if (ar) el.value = ar; // ✅ يصير "السعودية" بدل "SV"
      };

      el.addEventListener('change', apply);
      el.addEventListener('blur', apply);
    }

    bindAirlineInput('AirlineName');     // الحقل الأساسي :contentReference[oaicite:2]{index=2}
    bindAirlineInput('AirlineNameNow');  // حقل الرحلة الحالية :contentReference[oaicite:3]{index=3}

    // (باقي الدالة كما هو: الوجهات... إلخ)

  } catch (e) {
    console.error('❌ فشل تحميل fly.json:', e);
  }
}

// مبسّط: يضيف رمز IATA (حروف فقط) في رقم الرحلة ويضع المؤشر يسار الحقل للكتابة
document.addEventListener('DOMContentLoaded', () => {
  const AR_DIAC = /[\u064B-\u0652\u0670\u0640]/g;
  const normalizeAr = s => (s||'')
    .replace(/[أإآ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(AR_DIAC,'').replace(/\s+/g,' ').trim();
  const cleanArAirline = s => normalizeAr(s)
    .replace(/\bالخطوط\b/g,'').replace(/\bطيران\b/g,'').replace(/ ل?لطيران/g,'').trim();

  let flyCache = null;
  const getFly = async () => flyCache || (flyCache = await (await fetch('fly.json',{cache:'no-store'})).json());

  const pairs = [
    ['AirlineName',    'FlightNumber'],
    ['AirlineNameNow', 'FlightNumberNow']
  ];

  function setCode(dst, code){
    // حروف فقط
    const letters = String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    dst.value = letters;                 // لا نُبقي أرقام قديمة
    
    dst.dir = 'ltr';                     // كتابة أرقام أسهل
    dst.style.textAlign = 'left';
    dst.focus();                         // ضع المؤشر في نهاية الحروف
    try { dst.setSelectionRange(letters.length, letters.length); } catch(e){}
    // مثال placeholder
    const digits = (dst.placeholder && /\d+/.test(dst.placeholder)) ? dst.placeholder.match(/\d+/)[0] : '123';
    dst.placeholder = `مثال: ${letters}${digits}`;
  }

  function attachHandler(index, srcId, dstId){
    const src = document.getElementById(srcId);
    const dst = document.getElementById(dstId);
    if (!src || !dst) return;

    const run = () => {
      const raw = src.value||'';
      const kAr = cleanArAirline(raw);
      const kEn = String(raw).toLowerCase().trim();
      const code = index.get(kAr) || index.get(kEn);
      if (code) setCode(dst, code);
    };

    ['change','blur'].forEach(ev => src.addEventListener(ev, run));
    setTimeout(run, 0); // لو كان معبأ مسبقًا
  }

  (async () => {
    const fly = await getFly();
    const index = new Map();
    (fly.airlines||[]).forEach(a=>{
    const iata = String(a.iata||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
      if (!iata) return;
      const ar = cleanArAirline(a.name_ar||'');
      const en = String(a.name_en||'').toLowerCase().trim();
      if (ar) index.set(ar, iata);
      if (en) index.set(en, iata);
    });

    pairs.forEach(([s,d])=> attachHandler(index, s, d));
  })();
});
/* ===== تعبئة الوجهة تلقائياً من fly.json:extra_routes بناءً على رقم الرحلة ===== */
(function () {
  // توحيد رقم الرحلة: أحرف كبيرة + إزالة الفراغات والرموز، مع إبقاء A-Z و 0-9 فقط
  const normNo = s => String(s || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');

  // تحميل extra_routes وبناء خريطة: رقم الرحلة ← الوجهة
  async function loadRouteMap() {
    try {
      const res = await fetch('fly.json', { cache: 'no-store' });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.extra_routes || data.routes || []);
      const map = new Map();
      (rows || []).forEach(r => {
        const key = normNo(r?.no);
        const dest = r?.dest || r?.destination || r?.city_ar || r?.city_en || '';
        if (key && dest) map.set(key, dest);
      });
      return map;
    } catch (e) {
      console.error('❌ فشل تحميل أو قراءة fly.json:', e);
      return new Map();
    }
  }

  // ربط حقل رقم الرحلة بحقل الوجهة (تعبئة عند التطابق الكامل)
  function bindAutoDest(map, srcId, destId) {
    const src = document.getElementById(srcId);
    const dst = document.getElementById(destId);
    if (!src || !dst) return;

    const apply = () => {
      const key = normNo(src.value);
      const dest = map.get(key);
      if (dest) dst.value = dest; // يكتب فقط عند وجود تطابق كامل
    };

    // مباشرة أثناء الكتابة + عند التبديل/الخروج من الحقل
    src.addEventListener('input', apply);
    src.addEventListener('change', apply);

    // لو كان الحقل مُعبَّأ مسبقًا
    setTimeout(apply, 0);
  }

  // تفعيل الربط بعد تحميل الصفحة
  document.addEventListener('DOMContentLoaded', async () => {
    const routeMap = await loadRouteMap();
    bindAutoDest(routeMap, 'FlightNumber',     'TravelDestination');
    bindAutoDest(routeMap, 'FlightNumberNow',  'TravelDestinationNow');
  });
})();
// ==== اقتراحات أرقام الرحلات (Datalist ملتصق بحقل رقم الرحلة) ====
// الفكرة: عند اختيار "الخطوط الناقلة" يتم تعبئة datalist مرتبط بحقل FlightNumber
// بحيث تظهر الاقتراحات داخل نفس الحقل (سهم الاختيار) وليس أسفله.

(function(){
  // توحيد رقم الرحلة: أحرف كبيرة + إزالة الفراغات والرموز، مع إبقاء A-Z و 0-9 فقط
  const normNo = s => String(s || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');

  const getPrefix = no => (normNo(no).match(/^[A-Z]+/) || [''])[0];

  async function buildPrefixMap(){
    try {
      const res = await fetch('fly.json', { cache: 'no-store' });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.extra_routes || data.routes || data.flights || []);
      const map = new Map(); // prefix -> Array(no)
      const buckets = new Map(); // prefix -> Set(no)

      (rows || []).forEach(r => {
        const no = normNo(r?.no || r?.flight_no || r?.flightNumber || '');
        const pref = getPrefix(no);
        if (!no || !pref) return;

        if (!buckets.has(pref)) buckets.set(pref, new Set());
        buckets.get(pref).add(no);
      });

      // حوّلها إلى Arrays مرتبة
      for (const [pref, set] of buckets.entries()){
        const arr = Array.from(set);
        arr.sort((a,b)=> a.localeCompare(b));
        map.set(pref, arr);
      }
      return map;
    } catch (e) {
      console.error('❌ فشل تحميل fly.json لاقتراحات أرقام الرحلات:', e);
      return new Map();
    }
  }

  function fillDatalist(dl, items){
    if (!dl) return;
    dl.innerHTML = '';
    (items || []).slice(0, 500).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      dl.appendChild(opt);
    });
  }

  function bindFlightDatalist(airlineId, flightId, datalistId, prefixMap){
    const airline = document.getElementById(airlineId);
    const flight  = document.getElementById(flightId);
    const dl      = document.getElementById(datalistId);
    if (!airline || !flight || !dl) return;

    const update = () => {
      const pref = getPrefix(flight.value);
      fillDatalist(dl, pref ? prefixMap.get(pref) : []);
    };

    // بعد اختيار شركة الطيران سيتم إدخال كود IATA تلقائياً في FlightNumber بواسطة كود سابق،
    // لذلك نؤخر التحديث لحظياً حتى تُكتب الحروف داخل الحقل.
    const updateSoon = () => setTimeout(update, 0);

    airline.addEventListener('change', updateSoon);
    airline.addEventListener('blur',   updateSoon);

    // عند التركيز/الكتابة داخل رقم الرحلة، حدّث القائمة حسب البادئة الحالية
    flight.addEventListener('focus', update);
    flight.addEventListener('input', update);

    setTimeout(update, 0);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const prefixMap = await buildPrefixMap();
    bindFlightDatalist('AirlineName',    'FlightNumber',    'flightNumbers',    prefixMap);
    bindFlightDatalist('AirlineNameNow', 'FlightNumberNow', 'flightNumbersNow', prefixMap);
  });
})();


(function(){
  const $ = (id)=>document.getElementById(id);

  function getChoice(){
    try {
      return (localStorage.getItem('wordLinkChoice') || localStorage.getItem('lastWordLinkChoice') || '').trim();
    } catch { return ''; }
  }
  function isApplyMode(){ return getChoice() === 'تطبيق'; }
  function isPermissionsMode(){ return getChoice() === 'صلاحيات'; }
const TRANSFERRED_PERMISSIONS = [
  "تاشيرة الزيارة المنتهية (مغادرة)",
  " جواز مواطن اقل من المدة النظامية",
  "تجاوز تحقق الخصائص الحيوية",
  "اشراف"
];

const TRANSFER_REASONS = [
  "اجازة اعتيادية",
  "اجازة عرضية",
  "مصلحة العمل",
  "انتداب"
];

function initTransferredPermissions(){
  // قائمة الصلاحيات (تبقى كما هي)
  const dl = $('permissions-list');
  if (dl) {
    dl.innerHTML = "";
    TRANSFERRED_PERMISSIONS.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      dl.appendChild(opt);
    });
  }

  // قائمة أسباب النقل (جديدة)
  const dlR = $('transfer-reasons-list');
  if (dlR) {
    dlR.innerHTML = "";
    TRANSFER_REASONS.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      dlR.appendChild(opt);
    });
  }

  // تأكيد أن حقول الصلاحيات كلها تستخدم نفس القائمة (مثل السابق)
  ["Permission1","Permission2","Permission3","Permission4"].forEach(id => {
    const el = $(id);
    if (el) el.setAttribute("list", "permissions-list");
  });

  // تأكيد ربط سبب النقل بالقائمة
  const tr = $("TransferReason");
  if (tr) tr.setAttribute("list", "transfer-reasons-list");
}

  // إظهار/إخفاء عنصر مع الليبل الخاص به (label[for="..."])
  function showPair(id, show){
    const el   = $(id);
    const lbl  = document.querySelector(`label[for="${id}"]`);
    const disp = show ? '' : 'none';
    if (el)  el.style.display  = disp;
    if (lbl) lbl.style.display = disp;
  }

  // إظهار/إخفاء مجموعة (2/3) + التحكم بمدة/سبب التطبيق
  function applyVisibilityForGroup(i, showGroup, showApply){
    showPair(`IndividualName${i}`, showGroup);
    showPair(`IndividualRank${i}`, showGroup);

    // في "صلاحيات": أخفِ مدة/سبب التطبيق دائمًا
    showPair(`ApplyDuration${i}`, showApply);
    showPair(`ApplyReason${i}`,   showApply);

    // عند ظهور الاسم/الرتبة: افتحها في تطبيق/صلاحيات
    const nm = $(`IndividualName${i}`);
    const rk = $(`IndividualRank${i}`);
    if (showGroup && (isApplyMode() || isPermissionsMode())) {
      if (nm) { nm.disabled = false; if (!nm.placeholder) nm.placeholder = 'اكتب اسم الفرد'; }
      if (rk) { rk.disabled = false; if (!rk.placeholder) rk.placeholder = 'اكتب الرتبة'; }
    }
  }

  function updateIndividualsExtendedVisibility(){
    const apply = isApplyMode();
    const perm  = isPermissionsMode();

    // عبارات نقل الصلاحيات (تظهر فقط في وضع صلاحيات)
    const transferFromLabel = document.getElementById('permTransferFrom');
  if (transferFromLabel) {
    transferFromLabel.style.display = perm ? 'block' : 'none';
  }

  // نقل صلاحية الى
  const transferToLabel = document.getElementById('permTransferTo');
  if (transferToLabel) {
    transferToLabel.style.display = perm ? 'block' : 'none';
  }

const n1 = document.getElementById('perm-note-1');
const n2 = document.getElementById('perm-note-2');
if (n1) n1.style.display = perm ? '' : 'none';
if (n2) n2.style.display = perm ? '' : 'none';

    // المجموعة 2: تظهر في تطبيق + صلاحيات
    applyVisibilityForGroup(2, apply || perm, apply);

    // المجموعة 3: تظهر فقط في تطبيق
    applyVisibilityForGroup(3, apply, apply);

    // الفواصل بين المجموعات
    const sep12 = document.getElementById('individual-sep-1-2');
    const sep23 = document.getElementById('individual-sep-2-3');
    if (sep12) sep12.style.display = (apply || perm) ? '' : 'none';
    if (sep23) sep23.style.display = apply ? '' : 'none';

    // مدة/سبب التطبيق للفرد (1) — عناصرها تحمل ID مباشرة (ليست label[for])
    ["ApplyDurationLabel","ApplyDuration","ApplyReasonLabel","ApplyReason"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = apply ? 'block' : 'none';
    });

    // عناصر "صلاحيات" الجديدة (رقم الهوية + رقم المشغل للفرد 1 و2)
["IndividualID","OperatorNumber1","IndividualID2","OperatorNumber2"].forEach(id => showPair(id, perm));

// إظهار/إخفاء قسم "الصلاحيات المنقولة"
const permCard = document.getElementById('card-transferred-permissions');
if (permCard) permCard.style.display = perm ? '' : 'none';
  }

document.addEventListener('DOMContentLoaded', () => {
  initTransferredPermissions();
  updateIndividualsExtendedVisibility();
});
})();
document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.getElementById("custom-hijri-date");
  const btn = document.getElementById("toggle-date-format");

  if (!dateInput || !btn) return;

  btn.addEventListener("click", () => {
    let v = dateInput.value.replace("هـ", "").trim();

    const months = [
      "", "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
      "جمادى الأولى", "جمادى الآخرة", "رجب",
      "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    ];

    const monthNumbers = {
      "محرم": "01",
      "صفر": "02",
      "ربيع الأول": "03",
      "ربيع الآخر": "04",
      "جمادى الأولى": "05",
      "جمادى الآخرة": "06",
      "رجب": "07",
      "شعبان": "08",
      "رمضان": "09",
      "شوال": "10",
      "ذو القعدة": "11",
      "ذو الحجة": "12"
    };

    // ---------- إذا كانت الصيغة رقمية ----------
    if (v.includes("/")) {
      const parts = v.split("/");
      const d = parts[0];
      const m = parts[1];
      const y = parts[2];

      const monthName = months[parseInt(m)];
      dateInput.value = `${d} ${monthName} ${y}هـ`;
    }

    // ---------- إذا كانت الصيغة نصية ----------
    else {
      // يفصل كل شيء عن طريق المسافات وينظّف
      const parts = v.trim().split(" ").filter(x => x);

      const d = parts[0];
      const y = parts[parts.length - 1];

      // الشهر هو كل ما بينهما
      const monthName = parts.slice(1, parts.length - 1).join(" ").trim();

      const m = monthNumbers[monthName] || "01";

      dateInput.value = `${d}/${m}/${y} هـ`;
    }
  });
});

async function loadIndividualsWithID() {
  try {
    const res = await fetch("name.json", { cache: "no-store" });
    const data = await res.json();

    const list = document.getElementById("individual-list");

    const nameInput  = document.getElementById("IndividualName");
    const rankInput  = document.getElementById("IndividualRank");
    const idInput    = document.getElementById("IndividualID");

    const nameInput2 = document.getElementById("IndividualName2");
    const rankInput2 = document.getElementById("IndividualRank2");
    const idInput2   = document.getElementById("IndividualID2");

    const nameInput3 = document.getElementById("IndividualName3");
    const rankInput3 = document.getElementById("IndividualRank3");
const allIndividuals = [];

    // تحويل جميع الشفتات والحروف إلى مصفوفة واحدة
    for (const letter in data) {
      if (letter === "officers") continue;
      for (const shift in data[letter]) {
        data[letter][shift].forEach(person => {
          allIndividuals.push(person);
        });
      }
    }

    // تعبئة datalist
    list.innerHTML = "";
    allIndividuals.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.name;
      list.appendChild(opt);
    });

    // عند اختيار الاسم: عبّي الرتبة + رقم الهوية تلقائيًا (عند تطابق الاسم)
    function bindAutoFill(nameEl, rankEl, idEl){
      if (!nameEl) return;
      const update = () => {
        const val = (nameEl.value || '').trim();
        const selected = allIndividuals.find(p => (p.name || '').trim() === val);
        if (rankEl) rankEl.value = selected ? (selected.rank || "") : "";
        if (idEl)   idEl.value   = selected ? (selected.id   || "") : "";
      };
      nameEl.addEventListener("change", update);
      nameEl.addEventListener("input",  update);
      nameEl.addEventListener("blur",   update);
    }

    bindAutoFill(nameInput,  rankInput,  idInput);
    bindAutoFill(nameInput2, rankInput2, idInput2);
    bindAutoFill(nameInput3, rankInput3, null);
} catch (e) {
    console.error("خطأ في تحميل الأفراد:", e);
  }
}
//تقويم تاريخ الاستاذان
// ===== تقويم هجري مصغّر لتاريخ الاستئذان (5 أيام هجري فقط) =====

// نفس منطق التاريخ الأساسي المستخدم في setHijriAndDayNow (اليوم / اليوم السابق قبل 05:40)
function getShiftBaseDateForHijri() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // بين 00:00 و 05:40 (أو 05:20 في كشف) نرجع لليوم السابق
  if (hour < 5 || (hour === 5 && minute < _cutMinuteForShift())) {
    now.setDate(now.getDate() - 1);
  }
return now;
}

// بناء قائمة الأيام الخمسة (اليوم + ٤ أيام) هجريًا
function buildPermitHijriCalendarOptions() {
  const list = document.getElementById('permit-hijri-calendar-list');
  if (!list) return;

  list.innerHTML = '';

  const base = getShiftBaseDateForHijri();

  const fmtHijri = new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const fmtWeekday = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    numberingSystem: 'arab'
  });

  const RLM = "\u200F";

for (let i = 0; i < 8; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);

    const parts = fmtHijri.formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';

    const hijri = `${RLM}${day}/${m}/${y} هـ`;
    const weekday = fmtWeekday.format(d);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-hijri-calendar__item';
    btn.textContent = `${weekday} - ${hijri}`;
    btn.dataset.hijri = hijri;
    btn.dataset.weekday = weekday;

    btn.addEventListener('click', () => {
      const dateInput = document.getElementById('PermitDate');
      const daySelect = document.getElementById('PermitDay');

      if (dateInput) dateInput.value = hijri;
      if (daySelect) daySelect.value = weekday;

      const popup = document.getElementById('permit-hijri-calendar');
      if (popup) popup.hidden = true;
    });

    list.appendChild(btn);
  }
}

// ربط التقويم بحقل/زر تاريخ الاستئذان
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.getElementById('permit-date-picker');
  const popup   = document.getElementById('permit-hijri-calendar');
  const dateInput = document.getElementById('PermitDate');

  if (!trigger || !popup || !dateInput) return;

  // فتح/إغلاق التقويم عند الضغط على الأيقونة
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.hidden) {
      buildPermitHijriCalendarOptions();
      popup.hidden = false;
    } else {
      popup.hidden = true;
    }
  });

  // فتح التقويم أيضًا عند تركيز المستخدم على حقل التاريخ
  dateInput.addEventListener('focus', () => {
    buildPermitHijriCalendarOptions();
    popup.hidden = false;
  });

  // إغلاق التقويم عند الضغط خارجَه
  document.addEventListener('click', (e) => {
    if (popup.hidden) return;

    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(popup) && !path.includes(trigger) && !path.includes(dateInput)) {
      popup.hidden = true;
    }
  });
});
// زر تصحيح التاريخ لليوم الفعلي بعد منتصف الليل
document.addEventListener("DOMContentLoaded", () => {
  const fixBtn = document.getElementById("fix-date-btn");
  if (!fixBtn) return;

  fixBtn.addEventListener("click", () => {
    const now = new Date(); // التاريخ الحالي الحقيقي بدون إنقاص يوم
    const fmt = new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const parts = fmt.formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    const hijri = `${d}/${m}/${y} هـ`;

    const weekday = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(now);

    // تعبئة القيم الجديدة
    document.getElementById('custom-hijri-date').value = hijri;
    document.getElementById('custom-weekday').value = weekday;
    const hdr = document.getElementById('header-date');
    if (hdr) hdr.textContent = `${weekday} - ${hijri}`;

    // إخفاء التنبيه الخاص باليوم السابق
    const alertBox = document.getElementById('shift-alert');
    if (alertBox) alertBox.style.display = 'none';

    // ملاحظة للمستخدم
    alert("تم تحديث التاريخ لليوم الفعلي ✅");
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const choice =
    (localStorage.getItem("wordLinkChoice") ||
     localStorage.getItem("lastWordLinkChoice") || "").trim();

  const note = document.getElementById("kashf-note");
  if (!note) return;

  // يظهر فقط في وضع "كشف"
  note.style.display = (choice === "كشف") ? "flex" : "none";
});
