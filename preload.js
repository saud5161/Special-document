const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
  saveShift: (data) => ipcRenderer.send('save-shift', data),
  openFontFolder: () => {
    const folderPath = path.join(__dirname, 'dic', 'font');
    exec(`start "" "${folderPath}"`);
  },
  sendDateInfo: (date, day) => ipcRenderer.send('send-date-info', { date, day }), // ← الجديد
});

// ======================== تحديث الملفات ===========================
// رابط المستودع الأساسي على GitHub

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
contextBridge.exposeInMainWorld('electronAPI', {
  // ...
  saveFormFile: (text) => ipcRenderer.invoke('save-form-file', text),
});
