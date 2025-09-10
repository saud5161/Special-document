// renderer1.js (نسخة متصفح صِرفة)
function convertEasternToWestern(str) {
  const eastern = '٠١٢٣٤٥٦٧٨٩';
  const western = '0123456789';
  return String(str || '').replace(/[٠-٩]/g, d => western[eastern.indexOf(d)] ?? d);
}

function toWesternDigits(str) {
  const east = '٠١٢٣٤٥٦٧٨٩';
  const west = '0123456789';
  return String(str || '').replace(/[٠-٩]/g, d => west[east.indexOf(d)] ?? d);
}

// ==== Auto-Fill للضابط/الرتبة/المناوبة/الصالة ====
const officerMap = {
  "ماجد عبدالعزيز السحيم": { rank: "نقيب",     shift: "ج", hall: "4" },
  "فيصل عبدالإله الهرف":   { rank: "ملازم أول", shift: "أ", hall: "4" }
};

function autoFillOfficerDetails() {
  const officerInput = document.getElementById('officerName');
  const rankInput    = document.getElementById('rank');
  const shiftInput   = document.getElementById('shift');
  const hallInput    = document.getElementById('hallNumber');
  if (!officerInput) return;

  officerInput.addEventListener('change', () => {
    const name = officerInput.value.trim();
    const data = officerMap[name];
    if (data) {
      if (rankInput)  rankInput.value  = data.rank;
      if (shiftInput) shiftInput.value = data.shift;
      if (hallInput)  hallInput.value  = data.hall;
    } else {
      if (rankInput)  rankInput.value  = '';
      if (shiftInput) shiftInput.value = '';
      if (hallInput)  hallInput.value  = '';
    }
  });
}

// التاريخ/اليوم (هجري بأرقام إنجليزية + تصحيح 00:00–05:00)
function updateHijriFields() {
  const now = new Date();
  const hours = now.getHours();

  const timeNote = document.getElementById("timeNote");
  if (hours >= 0 && hours < 5) {
    now.setDate(now.getDate() - 1);
    if (timeNote) timeNote.style.display = "inline";
  } else {
    if (timeNote) timeNote.style.display = "none";
  }

  const optionsDate = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const formattedDateAr = now.toLocaleDateString('ar-SA', optionsDate);
  const formattedDateEn = toWesternDigits(formattedDateAr);
  const weekday = now.toLocaleDateString('ar-SA', { weekday: 'long' });

  const dateEl = document.getElementById("todayDate");
  const dayEl  = document.getElementById("day");
  if (dateEl) dateEl.value = formattedDateEn;
  if (dayEl)  dayEl.value  = weekday;

  const badge = document.getElementById("liveDateBadge");
  if (badge) badge.textContent = `${weekday} - ${formattedDateEn}`;
}

document.addEventListener("DOMContentLoaded", function () {
  const top = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const badge = document.getElementById("liveDateBadge");
  if (badge) badge.textContent = top;

  updateHijriFields();
  setInterval(updateHijriFields, 1000);
  autoFillOfficerDetails();
});

// حفظ/تصدير عند إرسال النموذج
document.getElementById('travelForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = {
    TodayDate: document.getElementById('todayDate').value.trim(),
    Day:       document.getElementById('day').value.trim(),
    Shift:     document.getElementById('shift').value.trim(),
    HallNumber: convertEasternToWestern(document.getElementById('hallNumber').value.trim()),
    OfficerName: document.getElementById('officerName').value.trim(),
    Rank:        document.getElementById('rank').value.trim(),
    TravelerName: document.getElementById('travelerName').value.trim(),
    Nationality:   document.getElementById('nationality').value.trim(),
    PassportNumber: convertEasternToWestern(document.getElementById('passportNumber').value.trim()),
    AirlineName:    document.getElementById('airlineName').value.trim(),
    FlightNumber:   convertEasternToWestern(document.getElementById('flightNumber').value.trim()),
    TravelDestination: document.getElementById('travelDestination').value.trim(),
    IssuedNumber:       convertEasternToWestern(document.getElementById('issuedNumber').value.trim()),
  };

  try {
    if (window.api && typeof window.api.saveForm === 'function') {
      // Electron (آمن)
      await window.api.saveForm(formData);
      alert('✅ تم حفظ الملف في مجلد التنزيلات وسيُفرَّغ لاحقًا تلقائيًا.');
    } else {
      // متصفح عادي (تنزيل مباشر)
      const content = Object.entries(formData)
        .map(([k, v]) => `${k}=${v ?? ''}`)
        .join('\r\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert('✅ تم تنزيل form.txt محليًا (متصفح).');
    }
  } catch (err) {
    console.error('❌ فشل الحفظ:', err);
    alert('❌ فشل في الحفظ: ' + err.message);
  }
});

// تحميل الأسماء والرتب من officers.json (يعمل في المتصفح/الإلكترون)
document.addEventListener('DOMContentLoaded', () => {
  fetch('officers.json')
    .then(r => r.json())
    .then(list => {
      const datalist = document.getElementById('names');
      const officerInput = document.getElementById('officerName');
      const rankInput = document.getElementById('rank');

      datalist.innerHTML = '';
      list.forEach(({name}) => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
      });

      const rankMap = Object.fromEntries(list.map(o => [o.name, o.rank]));
      officerInput.addEventListener('change', () => {
        const name = officerInput.value.trim();
        rankInput.value = rankMap[name] || '';
      });
    })
    .catch(err => console.error('خطأ في تحميل officers.json:', err));
});
