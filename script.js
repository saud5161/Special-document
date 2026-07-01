/**
 * ====================================================================
 * ملف جافاسكربت الرئيسي - واجهة المستخدم (Departure)
 * تم الإصلاح والتنظيف ليتوافق مع بيئة Electron
 * ====================================================================
 */

// ======================== 1. نظام الحماية والرقم السري ===========================
const storedHash = "96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e"; 

async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkPassword() {
    const passwordInput = document.getElementById("page-password");
    const errorMsg = document.getElementById("error-msg");
    const container = document.getElementById("password-container");

    if (!passwordInput || !errorMsg || !container) return;

    try {
        const inputHash = await sha256Hex(passwordInput.value);
        if (inputHash === storedHash) {
            localStorage.setItem("departureAccess", "granted");
            container.style.display = "none";
        } else {
            errorMsg.textContent = "الرقم السري غير صحيح، في حال عدم توفر الرقم السري التواصل معي";
            errorMsg.style.display = "block";
            passwordInput.value = "";
        }
    } catch (e) {
        console.error("Hash error:", e);
        errorMsg.textContent = "حدث خطأ تقني أثناء التحقق. جرّب تحديث الصفحة.";
        errorMsg.style.display = "block";
    }
}

function redirectToExit() {
    window.location.href = "passport-d.html";
}

// ======================== 2. صندوق الاقتراحات والمساعدة ===========================
const SUPABASE_URL = "https://dkrtiuelioyshbjoocqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ts5SGrWhODsG6EH5dUt9Wg_KUvsf-CF";

async function sendFeedbackToSupabase() {
    const typeEl = document.getElementById("feedback-type");
    const messageEl = document.getElementById("feedback-message");
    const statusMsg = document.getElementById("feedback-status-msg");
    const submitBtn = document.getElementById("submit-feedback-btn");

    if (!typeEl || !messageEl || !statusMsg || !submitBtn) return;

    const type = typeEl.value;
    const message = messageEl.value.trim();

    if (!message) {
        statusMsg.style.display = "block";
        statusMsg.style.color = "#d32f2f"; 
        statusMsg.textContent = "❗ يرجى كتابة التفاصيل قبل الإرسال.";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    statusMsg.style.display = "none";

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal" 
            },
            body: JSON.stringify({ type: type, message: message })
        });

        if (response.ok) {
            statusMsg.style.display = "block";
            statusMsg.style.color = "#1e5631"; 
            statusMsg.innerHTML = "✅ تم الإرسال بنجاح، شكراً لك!";
            messageEl.value = ""; 
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "فشل الاتصال بقاعدة البيانات.");
        }
    } catch (error) {
        statusMsg.style.display = "block";
        statusMsg.style.color = "#d32f2f";
        statusMsg.textContent = "❌ حدث خطأ: " + error.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "إرسال الرسالة";
        setTimeout(() => { statusMsg.style.display = "none"; }, 6000);
    }
}

function toggleFeedbackBox() {
    const box = document.getElementById('feedback-popup-box');
    if (box) box.classList.toggle('show');
}

// ======================== 3. الوضع الداكن (Dark Theme) ===========================
// ======================== 3. الوضع الداكن (Dark Theme) ===========================
function initThemeManager() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const DARK_CLASS = "theme-dark";

    // دالة تطبيق الوضع (الداكن أو الفاتح)
    function applyTheme(makeDark) {
        if (makeDark) {
            document.body.classList.add(DARK_CLASS);
            btn.innerHTML = '<i class="fas fa-sun"></i><span class="theme-toggle-text">الوضع الفاتح</span>';
        } else {
            document.body.classList.remove(DARK_CLASS);
            btn.innerHTML = '<i class="fas fa-moon"></i><span class="theme-toggle-text">الوضع الداكن</span>';
        }
    }

    // تحديد الوضع الفاتح بشكل تلقائي دائماً عند فتح الصفحة
    applyTheme(false);

    // زر التبديل اليدوي (للتغيير المؤقت أثناء استخدام الصفحة)
    btn.addEventListener("click", (e) => {
        e.preventDefault(); 
        const isCurrentlyDark = document.body.classList.contains(DARK_CLASS);
        applyTheme(!isCurrentlyDark); // التبديل لعكس الوضع الحالي
    });
}

// ======================== 4. الشريط الجانبي (Sidebar) ===========================
function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    sidebar.classList.add("hidden");
    sidebar.classList.remove("expanded");

    let hoverTimer = null;

    sidebar.addEventListener("mouseenter", function () {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
            sidebar.classList.remove("hidden");
            sidebar.classList.add("expanded");
        }, 120); 
    });

    sidebar.addEventListener("mouseleave", function () {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
        sidebar.classList.remove("expanded");
        sidebar.classList.add("hidden");
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("hidden");
}

function setActive(element) {
    document.querySelectorAll(".sidebar li").forEach(item => item.classList.remove("active"));
    if (element) element.classList.add("active");
}

// ======================== 5. الوقت والتاريخ ===========================
function toArabicNumbers(str) {
    return str.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function initDateTime() {
    const dateDisplay = document.getElementById("date");
    if (dateDisplay) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = today.toLocaleDateString('ar-SA', options);
    }

    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes(); // تم إضافة المتغير الذي كان مفقوداً

        if ((hours === 0 || hours < 5) || (hours === 5 && minutes < 40)) {
            now.setDate(now.getDate() - 1);
            const timeNote = document.getElementById("timeNote");
            if (timeNote) timeNote.style.display = "inline";
        } else {
            const timeNote = document.getElementById("timeNote");
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
    }, 1000);
}

// ======================== 6. البحث والروابط السريعة ===========================
function performSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    const cards = document.querySelectorAll(".model-card");
    const feedback = document.getElementById("search-feedback");
    let found = false;
    let firstMatch = null;

    cards.forEach(function(card) {
        card.classList.remove("search-hit");

        if (!searchTerm) {
            card.style.display = "";
            return;
        }

        const haystack = card.textContent.toLowerCase();
        const matched = haystack.includes(searchTerm);
        card.style.display = matched ? "" : "none";

        if (matched) {
            found = true;
            card.classList.add("search-hit");
            if (!firstMatch) firstMatch = card;
        }
    });

    document.querySelectorAll(".content-section").forEach(function(section) {
        if (!searchTerm) {
            section.style.display = "";
            const header = section.previousElementSibling;
            if (header && header.classList.contains("section-header")) header.style.display = "";
            return;
        }

        const hasVisibleCards = Array.from(section.querySelectorAll(".model-card"))
            .some(card => card.style.display !== "none");
        section.style.display = hasVisibleCards ? "" : "none";

        const header = section.previousElementSibling;
        if (header && header.classList.contains("section-header")) {
            header.style.display = hasVisibleCards ? "" : "none";
        }
    });

    if (!searchTerm) {
        if (feedback) feedback.style.display = "none";
        return;
    }

    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (feedback) {
            feedback.textContent = "تم العثور على النموذج";
            feedback.style.display = "block";
            feedback.style.color = "#1e5631";
            setTimeout(() => { feedback.style.display = "none"; }, 2500);
        }
    } else if (feedback) {
        feedback.textContent = "لم يتم العثور على نموذج مطابق";
        feedback.style.display = "block";
        feedback.style.color = "#b42318";
    }

    if (found) {
        setTimeout(() => {
            document.querySelectorAll(".model-card.search-hit").forEach(card => {
                card.classList.remove("search-hit");
            });
        }, 12000);
    }

    clearTimeout(window.__formsSearchClearTimer);
    window.__formsSearchClearTimer = setTimeout(() => {
        searchInput.value = "";
        resetSearchResults();
    }, 12000);
}

function resetSearchResults() {
    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim() !== "") return;

    document.querySelectorAll(".model-card").forEach(card => {
        card.style.display = "";
        card.classList.remove("search-hit");
    });

    document.querySelectorAll(".content-section").forEach(section => {
        section.style.display = "";
        const header = section.previousElementSibling;
        if (header && header.classList.contains("section-header")) header.style.display = "";
    });

    const feedback = document.getElementById("search-feedback");
    if (feedback) feedback.style.display = "none";
}

function initSearchAndLinks() {
    const searchBtn = document.getElementById("search-button");
    const clearSearchBtn = document.getElementById("clear-search-button");
    const searchInput = document.getElementById("search-input");

    if (searchBtn) searchBtn.addEventListener("click", performSearch);
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", function() {
            clearTimeout(window.__formsSearchClearTimer);
            if (searchInput) searchInput.value = "";
            resetSearchResults();
            if (searchInput) searchInput.focus();
        });
    }
    if (searchInput) {
        searchInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") performSearch();
        });
        searchInput.addEventListener("input", resetSearchResults);
    }

    document.querySelectorAll('.quick-links a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            if (searchInput) {
                searchInput.value = this.textContent.trim();
                performSearch();
            }
        });
    });
}

// ======================== 7. تفاعل واجهة Electron والطباعة ===========================
function openFolder() {
    if (window.electronAPI && window.electronAPI.openFontFolder) {
        window.electronAPI.openFontFolder();
    } else {
        alert("⚠️ لا يمكن فتح المجلد، تحقق من إعدادات التطبيق");
    }
}

function printFile(filePath) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = filePath;
    document.body.appendChild(iframe);

    iframe.onload = function() {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 5000); // تنظيف الـ iframe بعد الطباعة
    };
}

function toggleInstructions() {
    const content = document.getElementById("instruction-content");
    const iconWrapper = document.getElementById("arrow-icon");
    if (!content || !iconWrapper) return;
    
    const icon = iconWrapper.firstElementChild;
    if (content.style.display === "none") {
        content.style.display = "block";
        icon.classList.replace("fa-chevron-down", "fa-chevron-up");
    } else {
        content.style.display = "none";
        icon.classList.replace("fa-chevron-up", "fa-chevron-down");
    }
}

function toggleHeadsetNotification(event) {
    event.preventDefault();
    const content = document.getElementById("headset-notification-content");
    if (content) {
        content.style.display = content.style.display === "none" ? "block" : "none";
    }
}

// ======================== 8. بيانات الأفراد (التعبئة التلقائية) ===========================
function autoFillOfficerDetails() {
    const officerMap = {
        "ماجد عبدالعزيز السحيم": { rank: "نقيب", shift: "ا", hall: "3" },
        "فيصل عبدالإله الهرف": { rank: "ملازم أول", shift: "د", hall: "1" }
    };

    const officerInput = document.getElementById('officer-name');
    const rankInput = document.getElementById('officer-rank');
    const shiftInput = document.getElementById('shift-number');
    const hallInput = document.getElementById('hall-number');

    if (officerInput && rankInput && shiftInput && hallInput) {
        officerInput.addEventListener('change', () => {
            const selectedName = officerInput.value.trim();
            const data = officerMap[selectedName];

            if (data) {
                rankInput.value = data.rank;
                shiftInput.value = data.shift;
                hallInput.value = data.hall;
            } else {
                rankInput.value = '';
                shiftInput.value = '';
                hallInput.value = '';
            }
        });
    }

    // زر إرسال البيانات
    const saveButton = document.getElementById('save-officer-info');
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            if (!officerInput || !rankInput || !shiftInput || !hallInput || !officerInput.value || !rankInput.value || !shiftInput.value || !hallInput.value) {
                alert("❗ يرجى تعبئة جميع الحقول");
                return;
            }

            const fullData = `ComboBox1=${shiftInput.value}\nComboBox2=${hallInput.value}\nComboBox5=${rankInput.value}\nComboBox6=${officerInput.value}`;

            if (window.electronAPI && window.electronAPI.saveShift) {
                window.electronAPI.saveShift(fullData);
                alert("✅ تم الحفظ بنجاح وإدراج المعلومات في كل الخطابات");
            } else {
                alert("⚠️ فشل الاتصال بـ Electron لحفظ البيانات.");
            }
        });
    }
}

function initFormClearing() {
    const clearBtn = document.getElementById('clear-officer-info');
    const form = document.querySelector('.shift-form');

    if (clearBtn && form) {
        clearBtn.addEventListener('click', () => {
            form.querySelectorAll('input').forEach(input => {
                if (input.id !== 'custom-hijri-date' && input.id !== 'custom-weekday') {
                    input.value = '';
                }
            });
        });
    }
}

// ======================== 9. التهيئة عند تحميل الصفحة ===========================
document.addEventListener("DOMContentLoaded", () => {
    const departurePage = document.body.classList.contains("forms-list-page");
    const backgroundLogo = document.querySelector(".page-background-logo");

    if (departurePage && backgroundLogo && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.addEventListener("pointermove", (event) => {
            const x = ((event.clientX / window.innerWidth) - 0.5) * 18;
            const y = ((event.clientY / window.innerHeight) - 0.5) * 14;
            document.body.style.setProperty("--bg-logo-x", `${x.toFixed(1)}px`);
            document.body.style.setProperty("--bg-logo-y", `${y.toFixed(1)}px`);
        }, { passive: true });

        document.addEventListener("pointerleave", () => {
            document.body.style.setProperty("--bg-logo-x", "0px");
            document.body.style.setProperty("--bg-logo-y", "0px");
        });
    }

    // 1. فحص إذن الدخول لتجاوز شاشة الرقم السري
    if (localStorage.getItem("departureAccess") === "granted") {
        const passContainer = document.getElementById("password-container");
        if (passContainer) passContainer.style.display = "none";
    }

    // 2. تشغيل وظائف الواجهة
    initThemeManager();
    initSidebar();
    initDateTime();
    initSearchAndLinks();
    autoFillOfficerDetails();
    initFormClearing();

    // 3. رسالة الأزرار غير المتوفرة
    document.querySelectorAll(".unavailable").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            alert("سوف يتم توفيره قريباً");
        });
    });

    // 4. زر الطباعة العام
    const printBtn = document.getElementById("print-button");
    if (printBtn) printBtn.addEventListener("click", () => window.print());

    // 5. مسح خيارات الوورد المحفوظة عند فتح الصفحة لضمان تجربة نظيفة
    try {
        localStorage.removeItem('wordLinkChoice');
        localStorage.removeItem('lastWordLinkChoice');
    } catch(e) {}
});
// ======================== 13. نظام جلب الملفات عبر الـ Local API ===========================

async function loadRecentFiles() {
    const listElement = document.getElementById('recent-docm-list');
    if (!listElement) return;

    // التأكد من أن المنفذ تم إرساله من main.js
    if (!window.LOCAL_API_PORT) {
        setTimeout(loadRecentFiles, 500); // أعد المحاولة بعد نصف ثانية إذا لم يجهز
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:${window.LOCAL_API_PORT}/get-recent`);
        const docmFiles = await response.json();

        listElement.innerHTML = ''; 

        if (docmFiles.length === 0) {
            listElement.innerHTML = '<li style="text-align: center; color: #64748b; font-size: 12px; justify-content: center;">لا توجد نماذج DOCM حديثة</li>';
            return;
        }

        docmFiles.forEach(file => {
            const li = document.createElement('li');
            li.title = "اضغط لفتح الملف بالوورد فوراً";
            
            // عند الضغط، أرسل طلب للـ API المحلي لفتح الملف
            li.onclick = () => fetch(`http://127.0.0.1:${window.LOCAL_API_PORT}/open-file?path=${encodeURIComponent(file.path)}`);
            
            li.innerHTML = `
                <div class="file-icon"><i class="fa-solid fa-file-word" style="color: #1b65c2; font-size: 18px;"></i></div>
                <div class="file-info" style="flex: 1; min-width: 0; text-align: right;">
                    <span class="file-name" style="display: block; font-size: 13px; font-weight: 800; color: #2b3d34; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                    <span class="file-date" style="display: block; font-size: 11px; color: #64748b; margin-top: 2px;">${file.dateStr}</span>
                </div>
            `;
            listElement.appendChild(li);
        });
    } catch (error) {
        console.error("Error fetching recent files:", error);
        listElement.innerHTML = '<li style="color: red; font-size: 12px;">حدث خطأ في الاتصال بالنظام</li>';
    }
}

// دالة تفعيل زر "فتح" العلوي للمجلد بالكامل
function openDownloadsFolderDirect() {
    if (window.LOCAL_API_PORT) {
        fetch(`http://127.0.0.1:${window.LOCAL_API_PORT}/open-folder`);
    }
}

// تشغيل الجلب بمجرد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // ... أكوادك السابقة ...
    
    // تشغيل النظام
    loadRecentFiles();
    
    // تحديث القائمة تلقائياً كل 30 ثانية لتظل حية ومتزامنة
    setInterval(loadRecentFiles, 30000);
});
