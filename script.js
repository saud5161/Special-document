const storedHash = "96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e"; 

// دالة تُرجع SHA-256 للنص المُدخل بصيغة hex
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}


  // تحقق من وجود إذن مسبق
  window.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("departureAccess") === "granted") {
      document.getElementById("password-container").style.display = "none";
    }
  });
// ======================== الوضع الداكن (Theme Toggle - Time Based) ===========================
// ======================== الوضع الداكن الذكي (يعود للنهاري تلقائياً) ===========================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const DARK_CLASS = "theme-dark";
    const OVERRIDE_KEY = "theme_manual_choice"; 
    const PHASE_KEY = "theme_time_phase"; // لتسجيل هل نحن في ليل أم نهار

    // دالة لتطبيق الألوان وتغيير شكل الزر
    function applyTheme(makeDark) {
        if (makeDark) {
            document.body.classList.add(DARK_CLASS);
            btn.innerHTML = '<i class="fas fa-sun"></i><span class="theme-toggle-text">الوضع الفاتح</span>';
        } else {
            document.body.classList.remove(DARK_CLASS);
            btn.innerHTML = '<i class="fas fa-moon"></i><span class="theme-toggle-text">الوضع الداكن</span>';
        }
    }

    // دالة فحص الوقت وتطبيق الوضع
    function checkAndApplyTime() {
        const hour = new Date().getHours();
        
        // تحديد هل الوقت الحالي ليل أم نهار
        const isNight = (hour >= 19 || hour < 6);
        const currentPhase = isNight ? "night" : "day";

        // جلب الفترة الزمنية المسجلة سابقاً
        const savedPhase = localStorage.getItem(PHASE_KEY);

        // إذا تغيرت الفترة (مثلاً دخلنا الساعة 6 صباحاً أو 7 مساءً)
        if (savedPhase !== null && savedPhase !== currentPhase) {
            // نمسح الاختيار اليدوي لكي يستعيد النظام السيطرة التلقائية
            localStorage.removeItem(OVERRIDE_KEY);
            localStorage.setItem(PHASE_KEY, currentPhase);
        } else if (savedPhase === null) {
            localStorage.setItem(PHASE_KEY, currentPhase);
        }

        // تطبيق الوضع بناءً على الاختيار اليدوي (إن وُجد) أو الوقت الفعلي
        const userChoice = localStorage.getItem(OVERRIDE_KEY);
        if (userChoice !== null) {
            applyTheme(userChoice === "dark");
        } else {
            applyTheme(isNight);
        }
    }

    // 1. تشغيل الفحص فور فتح الصفحة
    checkAndApplyTime();

    // 2. فحص الوقت كل دقيقة (لكي يتحول تلقائياً إذا تركت الصفحة مفتوحة وجاءت الساعة 6ص أو 7م)
    setInterval(checkAndApplyTime, 60000);

    // 3. تشغيل الزر عند النقر اليدوي
    btn.addEventListener("click", (e) => {
        e.preventDefault(); 
        
        const isCurrentlyDark = document.body.classList.contains(DARK_CLASS);
        const newState = !isCurrentlyDark; // عكس الحالة الحالية
        
        applyTheme(newState);
        
        // حفظ اختيارك اليدوي + حفظ الفترة الحالية
        localStorage.setItem(OVERRIDE_KEY, newState ? "dark" : "light");
        
        const hour = new Date().getHours();
        const currentPhase = (hour >= 19 || hour < 6) ? "night" : "day";
        localStorage.setItem(PHASE_KEY, currentPhase);
    });
});
// ===================================================================================


async function checkPassword() {
  const password = document.getElementById("page-password").value;
  const errorMsg = document.getElementById("error-msg");

  try {
    const inputHash = await sha256Hex(password);
    if (inputHash === storedHash) {
      localStorage.setItem("departureAccess", "granted");
      document.getElementById("password-container").style.display = "none";
    } else {
      errorMsg.textContent = "الرقم السري غير صحيح، في حال عدم توفر الرقم السري التواصل معي";
      errorMsg.style.display = "block";
      document.getElementById("page-password").value = "";
    }
  } catch (e) {
    // في حال عدم دعم Web Crypto (نادرًا جدًا)
    console.error("Hash error:", e);
    errorMsg.textContent = "حدث خطأ تقني أثناء التحقق. جرّب تحديث الصفحة.";
    errorMsg.style.display = "block";
  }
}
// توسّع الشريط الجانبي عند المرور بالماوس وهو مخفي (hidden)
// جعل الشريط الجانبي يبدأ كأيقونات فقط + توسع عند الـ hover
document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // ✅ عند فتح الصفحة: أيقونات فقط
  sidebar.classList.add("hidden");
  sidebar.classList.remove("expanded");

  let hoverTimer = null;

  // عند دخول الماوس على الشريط
  sidebar.addEventListener("mouseenter", function () {
    if (hoverTimer) clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
      // نزيل hidden ونفعّل expanded ليظهر النص ويكبر الشريط
      sidebar.classList.remove("hidden");
      sidebar.classList.add("expanded");
    }, 120); // تأخير بسيط فقط لتفادي الوميض
  });

  // عند خروج الماوس من الشريط
  sidebar.addEventListener("mouseleave", function () {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    // نرجع للوضع المصغّر (أيقونات فقط)
    sidebar.classList.remove("expanded");
    sidebar.classList.add("hidden");
  });

  // عندما يخرج الماوس من الشريط
  sidebar.addEventListener("mouseleave", function () {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    // شيل التوسيع دائماً
    sidebar.classList.remove("expanded");

    // لو كان الشريط hidden قبل دخول الماوس → رجّعه hidden
    if (wasHiddenOnEnter) {
      sidebar.classList.add("hidden");
    }
  });
});



  function redirectToExit() {
    window.location.href = "passport-d.html";
  }




document.addEventListener("DOMContentLoaded", function () {
    const today = new Date();
    const hours = today.getHours();

    if (hours >= 0 && hours < 5) {
        today.setDate(today.getDate() - 1);
        document.getElementById("timeNote").style.display = "inline";
    }

    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    let formattedDate = today.toLocaleDateString('ar-SA', options).replace(/\d+/g, d => ('0' + d).slice(-2));
    const weekday = today.toLocaleDateString('ar-SA', { weekday: 'long' });

    document.getElementById("custom-hijri-date").value = toArabicNumbers(formattedDate);
    document.getElementById("custom-weekday").value = weekday;
});

function toArabicNumbers(str) {
    return str.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}
//الخطوط
function openFolder() {
  if (window.electronAPI && window.electronAPI.openFontFolder) {
    window.electronAPI.openFontFolder();
  } else {
    alert("⚠️ لا يمكن فتح المجلد، تحقق من إعدادات التطبيق");
  }
}
// دالة لإظهار أو إخفاء الشريط الجانبي
function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    var content = document.querySelector(".content");
    sidebar.classList.toggle("hidden");
    // إذا كانت هناك أي إجراءات أخرى عند إظهار أو إخفاء الشريط الجانبي، يمكن إضافتها هنا
}
window.addEventListener("load", function () {
    document.querySelectorAll('.quick-links a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            const text = this.textContent.trim();
            const searchInput = document.getElementById("search-input");
            searchInput.value = text;

            performSearch();
        });
    });
});
document.addEventListener("DOMContentLoaded", () => {
 
autoFillOfficerDetails();

  if (!button) {
    console.error("❌ الزر لم يتم العثور عليه!");
    return;
  }

  button.addEventListener("click", () => {
    console.log("📥 تم الضغط على زر الإرسال");

    if (!name.value || !rank.value || !shift.value || !hall.value) {
      alert("❗ يرجى تعبئة جميع الحقول");
      return;
    }

    const fullData = `ComboBox1=${shift.value}\nComboBox2=${hall.value}\nComboBox5=${rank.value}\nComboBox6=${name.value}`;

    if (window.electronAPI && window.electronAPI.saveShift) {
      window.electronAPI.saveShift(fullData);
      alert("✅ تم الحفظ بنجاح وادراج المعلومات في كل الخطابات");
    } else {
      console.error("⚠️ لم يتم تحميل electronAPI");
      alert("⚠️ فشل الاتصال بـ Electron لحفظ البيانات.");
    }
  });
});
// دالة لتعيين العنصر النشط في الشريط الجانبي
function setActive(element) {
    var items = document.querySelectorAll(".sidebar li");
    items.forEach(function(item) {
        item.classList.remove("active");
    });
    element.classList.add("active");
}

// دالة لفتح ملف PDF في نافذة جديدة
function openPDF(event) {
    event.preventDefault();
    var url = event.target.closest("a").href;
    var pdfWindow = window.open(url, '_blank');
    pdfWindow.focus();
}

// دالة لتغيير رابط ملف العرض عند اختيار ملف جديد
function changeFile(event, viewLinkId) {
    var fileInput = event.target;
    var file = fileInput.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var viewLink = document.getElementById(viewLinkId);
            viewLink.href = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}
//تفريغ الخانات
document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clear-officer-info');
  const form = document.querySelector('.shift-form');

  if (clearBtn && form) {
    clearBtn.addEventListener('click', () => {
      form.querySelectorAll('input').forEach(input => {
        if (
          input.id !== 'custom-hijri-date' &&
          input.id !== 'custom-weekday'
        ) {
          input.value = '';
        }
      });
    });
  }

  clearShiftFormAtSpecificTimes(); // ← يستمر عمل التفريغ التلقائي أيضًا
});


// دالة لإعداد التاريخ الحالي وعرضه في العنصر الذي يحتوي على المعرف "date"
document.addEventListener("DOMContentLoaded", function() {
    var today = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var formattedDate = today.toLocaleDateString('ar-SA', options);
    document.getElementById("date").textContent = formattedDate;
});
setInterval(() => {
    const now = new Date();
    const hours = now.getHours();

    if ((hours === 0 || hours < 5) || (hours === 5 && minutes < 40)) {
    now.setDate(now.getDate() - 1);
        const timeNote = document.getElementById("timeNote");
        if (timeNote) timeNote.style.display = "inline";
    } else {
        if (timeNote) timeNote.style.display = "none";
    }

    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedDate = now.toLocaleDateString('ar-SA', options).replace(/\d+/g, d => ('0' + d).slice(-2));
    const weekday = now.toLocaleDateString('ar-SA', { weekday: 'long' });

    const dateEl = document.getElementById("custom-hijri-date");
    const dayEl = document.getElementById("custom-weekday");

    if (dateEl && dayEl) {
        dateEl.value = toArabicNumbers(formattedDate);
        dayEl.value = weekday;
    }
}, 1000); // ← كل 1000 ملي ثانية = 1 ثانية

// دالة لتفعيل حقل إدخال الملف عند النقر على الزر
function toggleFileInput(button) {
    var fileInput = button.nextElementSibling;
    fileInput.click();
}
document.addEventListener("DOMContentLoaded", function() {
    var unavailableButtons = document.querySelectorAll(".unavailable");

    unavailableButtons.forEach(function(button) {
        button.addEventListener("click", function(event) {
            event.preventDefault();
            alert("سوف يتم توفيره قريباً");
        });
    });
 });


document.getElementById("print-button").addEventListener("click", function() {
    window.print();
});   
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;

function showSlide(index) {
    if (index >= totalSlides) {
        slideIndex = 0;
    } else if (index < 0) {
        slideIndex = totalSlides - 1;
    } else {
        slideIndex = index;
    }
    const offset = -slideIndex * 100;
    document.querySelector('.slider').style.transform = `translateX(${offset}%)`;
}

function moveSlide(direction) {
    showSlide(slideIndex + direction);
}

document.addEventListener("DOMContentLoaded", function() {
    showSlide(slideIndex);

    // تعيين الحركة التلقائية كل 20 ثانية
    setInterval(() => {
        moveSlide(1);
    }, 20000);
});
document.getElementById("search-button").addEventListener("click", performSearch);

document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        performSearch();
    }
});

function performSearch() {
    var searchTerm = document.getElementById("search-input").value.toLowerCase();
    // نبحث الآن في عناوين H3 داخل card-content
    var headings = document.querySelectorAll(".card-content h3");
    var found = false;

    headings.forEach(function(heading) {
        heading.style.backgroundColor = ""; // إعادة اللون الافتراضي

        if (heading.textContent.toLowerCase().includes(searchTerm)) {
            if (!found) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                found = true;
            }
            heading.style.backgroundColor = "#badf19ff";
            setTimeout(function() {
                heading.style.backgroundColor = "";
                document.getElementById("search-input").value = "";
            }, 7000);
        }
    });
}





// دالة الطباعة
function printFile(filePath) {
    var iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = filePath;
    document.body.appendChild(iframe);

    iframe.onload = function() {
        iframe.contentWindow.print();
    };
}

function toggleInstructions() {
  var content = document.getElementById("instruction-content");
  var icon = document.getElementById("arrow-icon").firstElementChild;

  if (content.style.display === "none") {
    content.style.display = "block";
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  } else {
    content.style.display = "none";
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  }
}

// ======================== تحديث الملفات ===========================
// رابط المستودع الأساسي على GitHub
const repoBase = "https://raw.githubusercontent.com/saud5161/Special-document/main/";
const filesJsonUrl = "files.json";

// ملف الكاش المحلي (للتوافق فقط — لم نعد نستخدمه فعليًا)
const localFilesJsonPath = path.join(__dirname, "files_local_cache.json");

// التحديث الكامل لجميع الملفات عند النقر
async function updateDocuments() {
    if (!navigator.onLine) {
        showMessage("⚠️ لا يوجد اتصال بالإنترنت", true);
        return;
    }

    showMessage("🔄 جاري التحديث...");

    try {
        // تحميل قائمة الملفات
        const res = await fetch(filesJsonUrl);
        if (!res.ok) throw new Error(`تعذر تحميل files.json: الحالة ${res.status}`);

        const remoteFiles = await res.json();
        const filePaths = Object.keys(remoteFiles);

        for (let filePath of filePaths) {
            const fileName = path.basename(filePath);

            // تجاهل ملفات النظام
            if (fileName.startsWith('~$') || fileName.toLowerCase() === 'desktop.ini') {
                console.log(`⏭️ تم تجاهل الملف: ${filePath}`);
                continue;
            }

            const localPath = path.join(__dirname, filePath);
            await downloadAndReplaceFile(repoBase + encodeURIComponent(filePath), localPath);
        }

        // حفظ نسخة الكاش الجديدة
        fs.writeFileSync(localFilesJsonPath, JSON.stringify(remoteFiles, null, 2));

        showMessage(`✅ تم تحديث ${filePaths.length} ملف${filePaths.length > 1 ? 'ات' : ''}`);
    } catch (error) {
        console.error("❌ خطأ أثناء التحديث:", error);
        showMessage("❌ حدث خطأ أثناء التحديث، الرجاء المحاولة لاحقًا", true);
    }
}

// تحميل ملف وتخزينه
async function downloadAndReplaceFile(fileUrl, localPath) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`تعذر تحميل الملف: ${fileUrl}`);

    const buffer = await res.arrayBuffer();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(buffer));
}

// عرض الرسائل على الواجهة
function showMessage(message, isError = false) {
    const el = document.getElementById("messageBox");
    if (el) {
        el.textContent = message;
        el.style.color = isError ? "red" : "blue";
    } else {
        console.log(message);
    }
}




async function downloadAndReplaceFile(fileUrl, localPath) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`تعذر تحميل الملف: ${fileUrl}`);

    const buffer = await res.arrayBuffer();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(buffer));
}

function showMessage(message, isError = false) {
    const el = document.getElementById("messageBox");
    if (el) {
        el.textContent = message;
        el.style.color = isError ? "red" : "blue";
    } else {
        console.log(message);
    }
}

setInterval(() => {
    updateDocuments(true);
}, 24 * 60 * 60 * 1000); // ← كل 24 ساعة = 86,400,000 مللي ثانية


document.addEventListener("DOMContentLoaded", () => {
    updateDocuments();
});

//معطيات الرتبة
function autoFillOfficerDetails() {
  const officerMap = {
    "ماجد عبدالعزيز السحيم": {
      rank: "نقيب",
      shift: "ا",
      hall: "3"
    },
    "فيصل عبدالإله الهرف": {
      rank: "ملازم أول",
      shift: "د",
      hall: "1"
    }
  };

  const officerInput = document.getElementById('officer-name');
  const rankInput = document.getElementById('officer-rank');
  const shiftInput = document.getElementById('shift-number');
  const hallInput = document.getElementById('hall-number');

  if (officerInput) {
    officerInput.addEventListener('change', () => {
      const selectedName = officerInput.value.trim();
      const data = officerMap[selectedName];

      if (data) {
        rankInput.value = data.rank;
        shiftInput.value = data.shift;
        hallInput.value = data.hall;
      } else {
        // إذا لم يكن الاسم موجودًا، فرّغ الحقول
        rankInput.value = '';
        shiftInput.value = '';
        hallInput.value = '';
      }
    });
  }
}
 window.addEventListener('pageshow', function(){
    try {
      localStorage.removeItem('wordLinkChoice');
      localStorage.removeItem('lastWordLinkChoice');
    } catch(e){}
  });





