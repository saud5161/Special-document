const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'dic');
const now = new Date();

function updateFileTimestamps(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            updateFileTimestamps(fullPath);
        } else {
            fs.utimesSync(fullPath, now, now);
            console.log(`تم تحديث التاريخ: ${fullPath}`);
        }
    });
}

updateFileTimestamps(targetDir);
console.log("✅ تم تحديث جميع تواريخ الملفات لتاريخ اليوم");
