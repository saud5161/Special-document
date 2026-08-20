// ==========================================
// سكربت إدارة حالات الإجازات والغياب في الكشف
// ==========================================
"use strict";

(function() {
  const KASHF_STATUSES = ["إجازة اعتيادية", "إجازة عرضية", "راحة", "غياب", "انتداب", "تــكليف", "إجازة مرضية", "استئذان"];
  const KASHF_WORKTYPES = [
    { name: "أعمال إدارية", icon: "fa-briefcase" },
    { name: "بوابة", icon: "fa-door-open" },
    { name: "مشغل كاونتر", icon: "fa-desktop" }
  ];
  let kashfNameDB = null;

  let kashfPool = [];    // قائمة المتاحين
  let kashfChosen = [];  // قائمة من تم إسناد حالة لهم
  let kashfWorkAssigned = []; // قائمة من تم إسناد طبيعة عمل لهم
  let activeStatus = null; // الحالة المختارة حالياً (مثل: غياب)
  let activeWorkType = null; // طبيعة العمل المختارة حالياً (مثل: بوابة)

  // 1. تحميل قاعدة الأسماء
  async function loadKashfNames() {
    try {
      const res = await fetch("name.json", { cache: "no-store" });
      kashfNameDB = await res.json();
    } catch (e) {
      console.error("❌ فشل تحميل name.json الخاص بالكشف:", e);
    }
  }

// 2. تحديث قائمة الأسماء عند تغيير المناوبة أو الصالة
  function updateKashfPool() {
    const shiftEl = document.getElementById("shift-number");
    const hallEl  = document.getElementById("hall-number");
    if (!shiftEl || !hallEl || !kashfNameDB) return;

    const shift = (shiftEl.value || "").trim();
    const hall  = (hallEl.value || "").trim();

    // تفريغ القوائم
    kashfPool = [];
    kashfChosen = []; // تصفير الاختيارات عند تغيير الشفت
    kashfWorkAssigned = []; // تصفير إسنادات طبيعة العمل عند تغيير الشفت
    
    if (shift && hall && kashfNameDB[shift] && kashfNameDB[shift][hall]) {
      // نسخ الأسماء من القاعدة مع حفظ ترتيبها الأصلي (originalIndex)
      kashfPool = kashfNameDB[shift][hall].map((emp, index) => ({
        id: emp.id || (emp.name + Math.random()), 
        name: emp.name,
        rank: emp.rank || "",
        originalIndex: index // حفظ الترتيب كما هو في ملف name.json
      }));
    }
    
    renderKashfLists();
  }

  // 3. بناء واجهة الأزرار الخاصة بالحالات
  function buildStatusControls() {
    const container = document.getElementById("kashf-status-controls");
    if (!container) return;
    
    container.innerHTML = "";
    KASHF_STATUSES.forEach(status => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kashf-status-btn";
      btn.textContent = status;
      btn.onclick = () => selectKashfStatus(status, btn);
      container.appendChild(btn);
    });
  }

  // 4. اختيار الحالة
  function selectKashfStatus(status, btnElement) {
    activeStatus = status;
    activeWorkType = null; // اختيار حالة يلغي اختيار طبيعة العمل النشط

    // تحديث الأزرار (تفعيل الزر المختار وإلغاء تفعيل أزرار طبيعة العمل)
    document.querySelectorAll(".kashf-status-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".kashf-worktype-btn").forEach(b => b.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    // تحديث البانر
    const banner = document.getElementById("kashf-target-banner");
    if (banner) {
      banner.style.background = "#eef2ff";
      banner.style.color = "#4338ca";
      banner.textContent = `الهدف الحالي: ${status} (انقر على أي اسم من القوة المتاحة لتطبيق الحالة عليه)`;
    }
  }

  // 4.1 بناء واجهة أزرار طبيعة العمل (بشكل مختلف عن أزرار الحالة)
  function buildWorkTypeControls() {
    const container = document.getElementById("kashf-worktype-controls");
    if (!container) return;

    container.innerHTML = "";
    KASHF_WORKTYPES.forEach(work => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kashf-worktype-btn";
      btn.innerHTML = `<i class="fas ${work.icon}"></i><span>${work.name}</span>`;
      btn.onclick = () => selectWorkType(work.name, btn);
      container.appendChild(btn);
    });
  }

  // 4.2 اختيار طبيعة العمل
  function selectWorkType(workType, btnElement) {
    activeWorkType = workType;
    activeStatus = null; // اختيار طبيعة عمل يلغي اختيار الحالة النشطة

    // تحديث الأزرار (تفعيل زر طبيعة العمل وإلغاء تفعيل أزرار الحالة)
    document.querySelectorAll(".kashf-worktype-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".kashf-status-btn").forEach(b => b.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    // تحديث البانر
    const banner = document.getElementById("kashf-target-banner");
    if (banner) {
      banner.style.background = "#f0f9ff";
      banner.style.color = "#0369a1";
      banner.textContent = `طبيعة العمل الحالية: ${workType} (انقر على أي اسم من القوة المتاحة لنقله)`;
    }
  }

  // 5. تنسيق الاسم ليكون قصيراً
  function formatShort(name) {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 4) return `${parts[0]} ${parts[1]} ${parts[parts.length - 1]}`;
    return name;
  }

// 6. رسم القوائم (المتاح والمختار وطبيعة العمل) بالاسم الكامل
  function renderKashfLists() {
    const availList = document.getElementById("kashf-avail-list");
    const chosenList = document.getElementById("kashf-chosen-list");
    const availCount = document.getElementById("kashf-avail-count");
    const chosenCount = document.getElementById("kashf-chosen-count");
    const workList = document.getElementById("kashf-worktype-list");
    const workCount = document.getElementById("kashf-worktype-count");
    const workPanel = document.getElementById("kashf-worktype-panel");

    if (!availList || !chosenList) return;

    // تحديث العدادات
    if (availCount) availCount.textContent = kashfPool.length;
    if (chosenCount) chosenCount.textContent = kashfChosen.length;
    if (workCount) workCount.textContent = kashfWorkAssigned.length;

    // إظهار قائمة طبيعة العمل فقط بعد إضافة أول اسم إليها، وإخفاؤها إن أصبحت فارغة
    if (workPanel) workPanel.style.display = kashfWorkAssigned.length > 0 ? "flex" : "none";

    // رسم المتاحين
    availList.innerHTML = "";
    if (kashfPool.length === 0) {
      availList.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.8rem; margin-top:20px;">لا يوجد أسماء</div>`;
    } else {
      kashfPool.forEach(emp => {
        const div = document.createElement("div");
        div.className = "kashf-list-item";
        div.innerHTML = `
          <div>
            <div style="font-weight:800; color:#1f3a5f;">${emp.name}</div>
            <div style="font-size:0.65rem; color:#6b7280; margin-top:2px;">${emp.rank}</div>
          </div>
          <i class="fas fa-plus-circle" style="color:#0d6efd; opacity:0.5;"></i>
        `;
        div.onclick = () => assignStatus(emp);
        availList.appendChild(div);
      });
    }

    // رسم المختارين
    chosenList.innerHTML = "";
    if (kashfChosen.length === 0) {
      chosenList.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:0.8rem; margin-top:20px;">لم يتم اختيار أحد</div>`;
    } else {
      kashfChosen.forEach(emp => {
        const isAbsent = emp.status === "غياب";
        const div = document.createElement("div");
        div.className = "kashf-list-item selected";
        div.innerHTML = `
          <div>
            <div style="font-weight:800; color:#15803d;">${emp.name}</div>
            <div style="font-size:0.65rem; color:#6b7280; margin-top:2px;">${emp.rank}</div>
          </div>
          <span class="kashf-badge ${isAbsent ? 'absence' : ''}">${emp.status}</span>
        `;
        div.onclick = () => unassignStatus(emp.id);
        chosenList.appendChild(div);
      });
    }

    // رسم قائمة طبيعة العمل (بحجم صغير جداً)
    if (workList) {
      workList.innerHTML = "";
      kashfWorkAssigned.forEach(emp => {
        const div = document.createElement("div");
        div.className = "kashf-list-item kashf-worktype-item";
        div.innerHTML = `
          <div style="font-weight:800; color:#0369a1; font-size:0.66rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${emp.name}</div>
          <div style="font-size:0.55rem; color:#0ea5e9; font-weight:700; margin-top:1px;">${emp.workType}</div>
        `;
        div.onclick = () => unassignWorkType(emp.id);
        workList.appendChild(div);
      });
    }
  }

  // 7. نقل اسم إلى قائمة المختارين أو قائمة طبيعة العمل حسب المُختار حالياً
  function assignStatus(emp) {
    if (activeWorkType) {
      // إزالة من المتاحين وإضافة لقائمة طبيعة العمل
      kashfPool = kashfPool.filter(x => x.id !== emp.id);
      kashfWorkAssigned.push({ ...emp, workType: activeWorkType });
      renderKashfLists();
      return;
    }

    if (!activeStatus) {
      alert("الرجاء تحديد الحالة (إجازة، غياب...) أو طبيعة العمل من الأزرار العلوية أولاً.");
      return;
    }
    // إزالة من المتاحين وإضافة للمختارين
    kashfPool = kashfPool.filter(x => x.id !== emp.id);
    kashfChosen.push({ ...emp, status: activeStatus });
    renderKashfLists();
  }

  // 7.1 إعادة الاسم لقائمة المتاحين من قائمة طبيعة العمل
  function unassignWorkType(empId) {
    const empIndex = kashfWorkAssigned.findIndex(x => x.id === empId);
    if (empIndex > -1) {
      const emp = kashfWorkAssigned[empIndex];
      kashfWorkAssigned.splice(empIndex, 1);
      delete emp.workType;
      kashfPool.push(emp);

      // إعادة ترتيب قائمة المتاحين لتطابق ترتيب name.json دائماً
      kashfPool.sort((a, b) => a.originalIndex - b.originalIndex);
    }
    renderKashfLists();
  }

// 8. إعادة الاسم لقائمة المتاحين
  function unassignStatus(empId) {
    const empIndex = kashfChosen.findIndex(x => x.id === empId);
    if (empIndex > -1) {
      const emp = kashfChosen[empIndex];
      kashfChosen.splice(empIndex, 1);
      delete emp.status; // إزالة الحالة
      kashfPool.push(emp);

      // إعادة ترتيب قائمة المتاحين لتطابق ترتيب name.json دائماً
      kashfPool.sort((a, b) => a.originalIndex - b.originalIndex);
    }
    renderKashfLists();
  }

  // دالة مساعدة عامة لتنزيل ملف نصي (name=value لكل سطر) عبر Electron
  function downloadKashfTextFile(fileName, entries, mapFn, errorLabel) {
    if (entries.length === 0) return;

    const lines = entries.map(mapFn);
    const fileContent = lines.join("\r\n");

    try {
      // وضع \uFEFF في البداية يضمن أن ماكرو الوورد سيقرأ اللغة العربية بلا مشاكل
      const blob = new Blob(["\uFEFF" + fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;

      // سيقوم هذا الأمر بإرسال الملف للـ Electron، وهناك سيتكفل به الكود الذي أضفناه في main.js
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("❌ تعذّر تصدير " + errorLabel + ":", e);
    }
  }

  // 9. تصدير البيانات إلى ملفات نصية عند الحفظ (الحالات وطبيعة العمل في ملفين منفصلين)
  function exportKashfData() {
    downloadKashfTextFile("kashf_status.txt", kashfChosen, function(emp) { return emp.name + "=" + emp.status; }, "ملف حالات الكشف");
    downloadKashfTextFile("kashf_worktype.txt", kashfWorkAssigned, function(emp) { return emp.name + "=" + emp.workType; }, "ملف طبيعة العمل");
  }

  // ==========================================
  // إعدادات التهيئة والمراقبة
  // ==========================================
  document.addEventListener("DOMContentLoaded", async () => {
    await loadKashfNames();
    buildStatusControls();
    buildWorkTypeControls();

    // مراقبة تغيير الشفت والصالة
    const shiftEl = document.getElementById("shift-number");
    const hallEl  = document.getElementById("hall-number");
    if (shiftEl) shiftEl.addEventListener("change", updateKashfPool);
    if (hallEl)  hallEl.addEventListener("change", updateKashfPool);

    // مراقبة الوضع: هل هو كشف أم لا؟ لإظهار البطاقة
    function checkKashfVisibility() {
      const choice = (localStorage.getItem("wordLinkChoice") || localStorage.getItem("lastWordLinkChoice") || "").trim();
      const card = document.getElementById("card-kashf-leaves");
      if (card) {
        card.style.display = (choice === "كشف") ? "block" : "none";
      }
    }
    
    // التحقق فوراً وعند أي تغيير في التخزين
    checkKashfVisibility();
    window.addEventListener("storage", checkKashfVisibility);
    
    // ربط عملية التصدير بزر "تنفيذ وحفظ"
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const choice = (localStorage.getItem("wordLinkChoice") || localStorage.getItem("lastWordLinkChoice") || "").trim();
        if (choice === "كشف") {
          exportKashfData();
        }
      });
    }
  });

})();