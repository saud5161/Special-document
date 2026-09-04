const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('customAPI', {
    triggerSync: () => ipcRenderer.send('trigger-sync'),
    // فتح مجلد النماذج (dic) للسماح بتعديل/الوصول للملفات مباشرة من مستكشف الملفات
    openFilesFolder: () => shell.openPath(path.join(__dirname, 'dic')),
    // عدد مستندات الوورد المفتوحة حاليًا (للتحذير قبل الوصول للحد الأقصى)
    countOpenWordDocs: () => ipcRenderer.invoke('count-open-word-docs')
});