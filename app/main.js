const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { shell } = require('electron');
const simpleGit = require('simple-git');
const git = simpleGit();

let mainWindow;

// تابع لإنشاء نافذة التطبيق
function createWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        show: false, // نستخدم هذا الخيار لإخفاء النافذة حتى يتم تكبيرها
        icon: path.join(__dirname, 'img', 'الجوازات-السعودية-_1_.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.setMenu(null);

    mainWindow.loadFile('passport-d.html');

    // تكبير النافذة إلى حجم الشاشة تلقائيًا
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show(); // إظهار النافذة بعد تكبيرها
    });

    // معالجة التنزيل التلقائي
    mainWindow.webContents.session.on('will-download', (event, item) => {
        const filePath = path.join(app.getPath('downloads'), item.getFilename());

        item.setSavePath(filePath);

        item.on('done', (e, state) => {
            if (state === 'completed') {
                openFile(filePath);
            } else {
                console.log(`Download failed: ${state}`);
            }
        });
    });

    // معالجة فتح الروابط في نافذة جديدة مع إضافة زر الطباعة
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const newWindow = new BrowserWindow({
            width: 800,
            height: 600,
            icon: path.join(__dirname, 'img', 'الجوازات-السعودية-_1_.ico'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        newWindow.loadURL(url);

        // إضافة زر الطباعة بعد تحميل الصفحة
        newWindow.webContents.on('did-finish-load', () => {
            newWindow.webContents.executeJavaScript(`
                const printButton = document.createElement('button');
                printButton.textContent = 'طباعة';
                printButton.style.position = 'fixed';
                printButton.style.top = '10px';
                printButton.style.right = '10px';
                printButton.style.padding = '10px';
                printButton.style.backgroundColor = '#0eb917';
                printButton.style.color = '#fff';
                printButton.style.border = 'none';
                printButton.style.borderRadius = '5px';
                printButton.style.cursor = 'pointer';
                document.body.appendChild(printButton);

                printButton.addEventListener('click', () => {
                    window.print();
                });
            `);
        });

        return { action: 'deny' }; // منع الفتح في المتصفح الافتراضي
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function openFile(filePath) {
    shell.openPath(filePath).then(response => {
        if (response) {
            console.error(`Error opening file: ${response}`);
        }
    });
}

function checkForInternet() {
    require('dns').resolve('www.google.com', function(err) {
        if (err) {
            console.log("No connection");
        } else {
            console.log("Connected to the internet, checking for updates...");
            updateFilesFromGitHub();
        }
    });
}

function updateFilesFromGitHub() {
    const repoPath = path.join(__dirname, 'app'); // مسار المجلد الذي يحتوي على الملفات
    git.cwd(repoPath).pull((err, update) => {
        if (err) {
            console.error("Failed to update files:", err);
            return;
        }
        if (update && update.summary.changes) {
            console.log("Files updated successfully.");
            // أعد تشغيل التطبيق إذا كانت هناك تحديثات
            app.relaunch();
            app.exit();
        } else {
            console.log("No updates found.");
        }
    });
}

app.whenReady().then(() => {
    checkForInternet();
    createWindow();
});

// منع تشغيل عدة نسخ من التطبيق
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
}
