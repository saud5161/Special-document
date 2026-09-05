const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ✅ تحديث مُجبَر (يتجاوز أي تخزين مؤقت للشبكة عبر باراميتر فريد + cache:'reload')
// مطلوب لأن الزر العادي (location.reload) لا يضمن دائمًا جلب أحدث نسخة من GitHub
// إن كانت هناك استجابة مخزّنة مؤقتًا من محاولة سابقة قريبة.
const REPO_BASE = "https://raw.githubusercontent.com/saud5161/Special-document/main/";

function encodeRepoPathForForceUpdate(filePath) {
    return String(filePath).replace(/\\/g, "/").split("/").map(seg => encodeURIComponent(seg)).join("/");
}

async function forceUpdateAll() {
    const bust = Date.now();
    const res = await fetch(`${REPO_BASE}files.json?_=${bust}`, { cache: 'reload' });
    if (!res.ok) throw new Error(`تعذر تحميل files.json: ${res.status}`);
    const remoteFiles = await res.json();
    const filePaths = Object.keys(remoteFiles);

    let updatedCount = 0;
    const appRoot = path.resolve(__dirname) + path.sep;

    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        if (fileName.startsWith('~$') || fileName.toLowerCase() === 'desktop.ini') continue;

        const localPath = path.resolve(__dirname, filePath);
        if (!localPath.startsWith(appRoot)) continue; // نفس فحص الأمان في التحديث العادي

        const fileUrl = `${REPO_BASE}${encodeRepoPathForForceUpdate(filePath)}?_=${bust}`;
        const fileRes = await fetch(fileUrl, { cache: 'reload' });
        if (!fileRes.ok) continue;

        const buffer = await fileRes.arrayBuffer();
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, Buffer.from(buffer));
        updatedCount++;
    }

    fs.writeFileSync(path.join(__dirname, 'files_local_cache.json'), JSON.stringify(remoteFiles, null, 2));
    return updatedCount;
}

contextBridge.exposeInMainWorld('customAPI', {
    triggerSync: () => ipcRenderer.send('trigger-sync'),
    // فتح مجلد النماذج (dic) للسماح بتعديل/الوصول للملفات مباشرة من مستكشف الملفات
    openFilesFolder: () => shell.openPath(path.join(__dirname, 'dic')),
    // عدد مستندات الوورد المفتوحة حاليًا (للتحذير قبل الوصول للحد الأقصى)
    countOpenWordDocs: () => ipcRenderer.invoke('count-open-word-docs'),
    // تحديث مُجبَر يتجاوز التخزين المؤقت للشبكة بالكامل
    forceUpdateAll: () => forceUpdateAll()
});