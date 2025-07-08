const fs = require('fs');
const path = require('path');

let filesList = {};

// دالة لفحص الملفات داخل المجلدات والمجلدات الفرعية (recursive)
function scanDirectoryRecursive(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            scanDirectoryRecursive(fullPath);
        } else {
            const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
            filesList[relativePath] = stats.mtime.toISOString();
        }
    });
}

// فحص المجلدين المطلوبين مع المجلدات الفرعية
const dirsToScan = [path.join(__dirname, 'dic'), path.join(__dirname, 'page')];

dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
        scanDirectoryRecursive(dir);
    }
});

// فحص الملفات بجانب السكربت (فقط الملفات، بدون دخول مجلدات)
fs.readdirSync(__dirname).forEach(file => {
    const fullPath = path.join(__dirname, file);
    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
        const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
        if (relativePath !== 'files.json') {  // تجاهل files.json
            filesList[relativePath] = stats.mtime.toISOString();
        }
    }
});

// حفظ النتائج في files.json
fs.writeFileSync('files.json', JSON.stringify(filesList, null, 2), 'utf-8');

console.log("✅ تم إنشاء files.json بنجاح");
