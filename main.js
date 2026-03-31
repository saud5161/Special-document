const { app, BrowserWindow, globalShortcut, Menu, ipcMain } = require('electron');

const path = require('path');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const git = simpleGit();
try {
  require.resolve('iconv-lite');
} catch (e) {
  const { execSync } = require('child_process');
  console.log('📦 جاري تثبيت iconv-lite ...');
  execSync('npm install iconv-lite', { stdio: 'inherit' });
}
const iconv = require('iconv-lite');

// استجابة لطلب فتح مجلد الخطوط
ipcMain.on('open-font-folder', () => {
  const folderPath = path.join(__dirname, 'dic', 'Font');
  shell.openPath(folderPath).then(result => {
    if (result) {
      console.error("❌ لم يتم فتح المجلد:", result);
    }
  });
});



// --- دالة تشغيل الماكرو على ملف محدد (خفي) ---
function runExcelAutoOpenOnFile(filePath, timeoutSec = 2) {
  // تأكد من تحويل المسار إلى مسار Windows مهيأ للاستخدام في نص PowerShell
  const p = filePath.replace(/\\/g, '\\\\');

  // نص PowerShell مفصّل:
  const ps = `
    $ErrorActionPreference = 'SilentlyContinue';

    $createdNew = $false;
    try {
      # حاول الربط بمثيل Excel موجود
      $xl = [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application");
    } catch {
      # إن لم يوجد، أنشئ مثيلاً جديدًا (سنغلّقه لاحقًا)
      $xl = New-Object -ComObject Excel.Application;
      $createdNew = $true;
    }

    $xl.Visible = $false;
    $xl.DisplayAlerts = $false;

    try {
      $wb = $xl.Workbooks.Open('${p}', $false, $true); # Open(path, UpdateLinks, ReadOnly)
    } catch {
      $wb = $null;
    }

    if ($wb -ne $null) {
      try { $xl.Run('AutoOpen') } catch {}
      Start-Sleep -Seconds ${timeoutSec};
      try { $wb.Close($false) } catch {}
    }

    if ($createdNew) {
      try { $xl.Quit() } catch {}
      # تنظيف COM
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    }
  `.replace(/\r?\n/g, ' ');

  // نفّذ الأمر بصمت
  exec(`powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "${ps}"`, (err) => {
    if (err) {
      console.error(`[ExcelCleaner] فشل التنفيذ على ${filePath}:`, err);
    } else {
      console.log(`[ExcelCleaner] تم تشغيل AutoOpen على ${filePath} بنجاح.`);
    }
  });
}

// --- دالة لبدء التكرار كل 10 دقائق ---
let excelCleanerIntervalId = null;

function startExcelCleanerInterval(filePath, minutes = 10) {
  // تشغيل لمرة واحدة فورًا
  runExcelAutoOpenOnFile(filePath);

  // ضبط التكرار (تحويل دقائق إلى ملّلي ثانية)
  const ms = minutes * 60 * 1000;
  // إذا كانت تعمل بالفعل، نظفها أولا
  if (excelCleanerIntervalId) clearInterval(excelCleanerIntervalId);

  excelCleanerIntervalId = setInterval(() => {
    runExcelAutoOpenOnFile(filePath);
  }, ms);

  console.log(`[ExcelCleaner] بدأ التكرار كل ${minutes} دقيقة على: ${filePath}`);
}

function stopExcelCleanerInterval() {
  if (excelCleanerIntervalId) {
    clearInterval(excelCleanerIntervalId);
    excelCleanerIntervalId = null;
    console.log('[ExcelCleaner] أوقف التكرار.');
  }
}







let mainWindow;
const MAX_FILES = 5; // الحد الأقصى لعدد النسخ المسموح بها (بما في ذلك النسخة الأصلية)
let currentIndex = 0; // نبدأ من النسخة 1

// مسار ملف package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// رابط التحقق من أحدث إصدار في GitHub
const githubApiUrl = 'https://api.github.com/repos/saud5161/Special-document/releases/latest';





ipcMain.on('send-date-info', (event, { date, day }) => {
  const content = `TextBox4=${date}\nTextBox1=${day}`;
  const filePath = path.join(app.getPath('downloads'), 'deta.txt');
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('❌ خطأ في حفظ deta.txt:', err);
  }
});







// دالة لإنشاء نافذة التطبيق
function createWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        show: false,
        icon: path.join(__dirname, 'img', 'الجوازات-السعودية-_1_.ico'),
       webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: true
}

    });

    // شريط القوائم
    const menu = Menu.buildFromTemplate([
        {
            label: 'ملف',
            submenu: [
                {
                    label: 'طباعة',
                    click: () => {
                        const focusedWindow = BrowserWindow.getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.webContents.print();
                        }
                    }
                },
                { type: 'separator' },
                { label: 'خروج', role: 'quit' }
            ]
        },
        {
            label: 'تعديل',
            submenu: [
                { label: 'تراجع', role: 'undo' },
                { label: 'إعادة', role: 'redo' },
                { type: 'separator' },
                { label: 'قص', role: 'cut' },
                { label: 'نسخ', role: 'copy' },
                { label: 'لصق', role: 'paste' }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                { label: 'تحديث', role: 'reload' },
                { label: 'وضع المطور', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: 'تكبير', role: 'zoomIn' },
                { label: 'تصغير', role: 'zoomOut' },
                { label: 'إعادة ضبط التكبير', role: 'resetZoom' }
            ]
        },
        {
            label: 'نافذة',
            submenu: [
                { label: 'تصغير', role: 'minimize' },
                { label: 'إغلاق', role: 'close' }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                { label: 'عن التطبيق', click: () => console.log('عن التطبيق') }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);
    mainWindow.setMenu(menu);
    mainWindow.loadFile('passport-d.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
        checkForUpdates(); // التحقق من التحديثات عند تشغيل التطبيق
    });

   // معالجة التنزيل التلقائي (منع إضافة 1، ومنع الفتح لبعض الملفات، والحذف التلقائي)
    mainWindow.webContents.session.on('will-download', (event, item) => {
      const downloads = app.getPath('downloads');
      
      // 1. التقاط اسم الملف وتثبيته لمنع المتصفح من إضافة (1)
      let fileName = item.getFilename();
      if (fileName.includes('kashf_status')) {
        fileName = 'kashf_status.txt';
      }

      const targetPath = path.join(downloads, fileName);
      
      // 2. إجبار النظام على الحفظ بنفس المسار (للاستبدال الفوري)
      item.setSavePath(targetPath);

      item.on('done', (e, state) => {
        if (state === 'completed') {
          
          // 3. استثناء form.txt و kashf_status.txt (كلاهما يخزن ولا يفتح، ويُحذف بعد 60 ثانية)
          if (fileName === 'form.txt' || fileName === 'kashf_status.txt') {
            console.log(`✔ حُفظ ${fileName} بصمت وباستبدال القديم، وسيتم حذفه بعد دقيقة`);
            
            // مؤقت الحذف (60 ألف ملي ثانية = دقيقة واحدة)
            setTimeout(() => {
              fs.unlink(targetPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                  console.error(`❌ فشل حذف ${fileName}:`, err);
                } else {
                  console.log(`🗑️ تم حذف ${fileName} التلقائي بنجاح`);
                }
              });
                }, 20_000);             
            return; // ⛔ الخروج هنا يمنع تشغيل الدالة المسؤولة عن فتح الملف
          }

          // السلوك الأصلي لبقية الملفات (الفتح بشكل طبيعي)
          openFile(targetPath);
        }
      });
    });
    

    // معالجة قائمة السياق للطباعة
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Print',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) {
                        focusedWindow.webContents.print();
                    }
                }
            }
        ]);
        menu.popup();
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// دالة للتحقق من وجود تحديثات جديدة
function checkForUpdates() {
    https.get(githubApiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            const releaseData = JSON.parse(data);
            const latestVersion = releaseData.tag_name.replace('v', '');
            
            // وصف التحديث (Release Notes)
            const releaseNotes = releaseData.body || '';

            if (compareVersions(latestVersion, currentVersion)) {
                console.log(`يوجد إصدار جديد متاح: ${latestVersion}`);
                const assetUrl = (releaseData.assets && releaseData.assets.length > 0)
                    ? releaseData.assets[0].browser_download_url
                    : null;
                
                if (assetUrl) {
                    // عرض التحديث على جميع النوافذ
                    BrowserWindow.getAllWindows().forEach(window => {
                        showUpdateBanner(latestVersion, assetUrl, window);
                        showUpdateModal(latestVersion, assetUrl, releaseNotes, window);
                    });
                }
            } else {
                console.log('أنت تستخدم أحدث إصدار.');
            }
        });
    }).on('error', (err) => {
        console.error('حدث خطأ أثناء التحقق من التحديث:', err);
    });
}

// دالة للمقارنة بين الإصدارين
function compareVersions(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < latestParts.length; i++) {
        if (latestParts[i] > currentParts[i]) {
            return true;
        } else if (latestParts[i] < currentParts[i]) {
            return false;
        }
    }
    return false;
}

// دالة لعرض نافذة التحديث
function showUpdateBanner(latestVersion, downloadUrl, window) {
    window.webContents.executeJavaScript(`
        let existingMessage = document.getElementById("update-message");
        if (!existingMessage) {
            const messageContainer = document.createElement("div");
            messageContainer.id = "update-message"; 
            messageContainer.style.backgroundColor = "#ff4d4d";
            messageContainer.style.color = "#ffffff";
            messageContainer.style.padding = "10px";
            messageContainer.style.textAlign = "center";
            messageContainer.style.position = "fixed";
            messageContainer.style.bottom = "0";
            messageContainer.style.width = "100%";
            messageContainer.style.zIndex = "1000";
            messageContainer.style.display = "flex";
            messageContainer.style.alignItems = "center";
            messageContainer.style.justifyContent = "center";
            messageContainer.style.gap = "10px";

            const icon = document.createElement("i");
            icon.className = "fas fa-exclamation-circle";
            icon.style.fontSize = "20px";

            const text = document.createElement("span");
            text.textContent = "يوجد تحديث جديد: الإصدار ${latestVersion} - ";

            const link = document.createElement("a");
            link.href = "${downloadUrl}";
            link.textContent = "لتحميل التحديث اضغط هنا";
            link.style.color = "#ffffff";
            link.style.fontWeight = "bold";
            link.style.textDecoration = "underline";
            link.setAttribute("download", "");

            messageContainer.appendChild(icon);
            messageContainer.appendChild(text);
            messageContainer.appendChild(link);

            document.body.appendChild(messageContainer);
        }
    `);
}

// دالة لعرض نافذة منبثقة للتحديث
function showUpdateModal(latestVersion, downloadUrl, releaseNotes, window) {
    window.webContents.executeJavaScript(`
        let existingModal = document.getElementById("update-modal");
        if (!existingModal) {
            const modalContainer = document.createElement("div");
            modalContainer.id = "update-modal";
            modalContainer.style.position = "fixed";
            modalContainer.style.top = "0";
            modalContainer.style.left = "0";
            modalContainer.style.width = "100%";
            modalContainer.style.height = "100%";
            modalContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            modalContainer.style.display = "flex";
            modalContainer.style.alignItems = "center";
            modalContainer.style.justifyContent = "center";
            modalContainer.style.zIndex = "10000";

            const modalBox = document.createElement("div");
            modalBox.style.position = "relative";
            modalBox.style.backgroundColor = "#ffffff";
            modalBox.style.borderRadius = "10px";
            modalBox.style.padding = "20px";
            modalBox.style.width = "90%";
            modalBox.style.maxWidth = "400px";
            modalBox.style.textAlign = "center";
            modalBox.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";

            const closeButton = document.createElement("button");
            closeButton.textContent = "×";
            closeButton.style.position = "absolute";
            closeButton.style.top = "10px";
            closeButton.style.right = "10px";
            closeButton.style.backgroundColor = "transparent";
            closeButton.style.border = "none";
            closeButton.style.color = "#333";
            closeButton.style.fontSize = "18px";
            closeButton.style.cursor = "pointer";
            closeButton.addEventListener("click", function() {
                modalContainer.remove();
            });

            const title = document.createElement("h2");
            title.textContent = "تحديث جديد متاح";
            title.style.color = "#3d775f";
            title.style.marginBottom = "15px";

            const message = document.createElement("p");
            message.textContent = "يوجد إصدار جديد: الإصدار ${latestVersion}. يتوفر في التحديث: ${releaseNotes}";
            message.style.marginBottom = "20px";
            message.style.color = "#333";
            message.style.fontSize = "16px";
            message.style.fontWeight = "normal";
            message.style.borderRadius = "5px";
            message.style.backgroundColor = "#f0f8ff";
            message.style.padding = "10px";

            const countdownText = document.createElement("p");
            countdownText.id = "countdown-text";
            countdownText.textContent = "سيتم تنزيل التحديث في: 7 ثوانٍ";
            countdownText.style.color = "#333";
            countdownText.style.marginTop = "20px";

            const updateLaterButton = document.createElement("button");
            updateLaterButton.textContent = "تحديث لاحقاً";
            updateLaterButton.style.backgroundColor = "#ff6347";
            updateLaterButton.style.color = "#ffffff";
            updateLaterButton.style.border = "none";
            updateLaterButton.style.padding = "10px 20px";
            updateLaterButton.style.margin = "5px";
            updateLaterButton.style.borderRadius = "5px";
            updateLaterButton.style.cursor = "pointer";
            updateLaterButton.addEventListener("click", function() {
                clearInterval(countdownInterval);
                modalContainer.remove();
                console.log("التحديث تم تأجيله");
            });

            const pauseButton = document.createElement("button");
            pauseButton.textContent = "إيقاف مؤقت";
            pauseButton.style.backgroundColor = "#808080";
            pauseButton.style.color = "#ffffff";
            pauseButton.style.border = "none";
            pauseButton.style.padding = "10px 20px";
            pauseButton.style.margin = "5px";
            pauseButton.style.borderRadius = "5px";
            pauseButton.style.cursor = "pointer";
            let countdownPaused = false;
            pauseButton.addEventListener("click", function() {
                if (countdownPaused) {
                    countdownPaused = false;
                    pauseButton.textContent = "إيقاف مؤقت";
                    countdownInterval = setInterval(countdownFunction, 1000);
                } else {
                    countdownPaused = true;
                    pauseButton.textContent = "استئناف";
                    clearInterval(countdownInterval);
                }
            });

            let countdown = 7;
            let countdownInterval;
            const countdownFunction = () => {
                countdownText.textContent = "سيتم تنزيل التحديث في: " + countdown + " ثوانٍ";
                countdown--;
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    // التعديل هنا: جعل النص الأول باللون الأزرق وكلمة "يرجى غلق التطبيق" باللون الأحمر
                    countdownText.innerHTML = '<span style="color: blue;">سيتم تنزيل التحديث الآن... </span><span style="color: red;">يرجى غلق التطبيق عند البدء في التثبيت</span>';

                    // تحميل التحديث بعد انتهاء العد التنازلي
                    setTimeout(() => {
                        window.location.href = "${downloadUrl}";
                        closeAppAfterDownload();
                    }, 1000);
                }
            };
            countdownInterval = setInterval(countdownFunction, 1000);

            modalBox.appendChild(closeButton);
            modalBox.appendChild(title);
            modalBox.appendChild(message);
            modalBox.appendChild(countdownText);
            modalBox.appendChild(pauseButton);
            modalBox.appendChild(updateLaterButton);
            modalContainer.appendChild(modalBox);

            document.body.appendChild(modalContainer);
        }
    `);
}



// دالة لفتح ملفات متعددة
function openMultipleFiles() {
    const downloadsDir = app.getPath('downloads');
    for (let i = 1; i <= MAX_FILES; i++) {
        const fileName = `document${i}.txt`;
        if (fileName === "form.txt") continue; // ⛔ استثناء form.txt

        const filePath = path.join(downloadsDir, fileName);
        exec(`start "" "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`خطأ في فتح الملف: ${error.message}`);
                return;
            }
            console.log(`تم فتح الملف بنجاح: ${filePath}`);
        });
    }
}


// دالة لفتح الملفات عند التنزيل
function openFile(filePath) {
    const downloadsDir = app.getPath('downloads');
    const fileName = path.basename(filePath);

    // ⛔ استثناء form.txt (لا يتم نسخه ولا فتح نسخة جديدة منه)
    if (fileName === "form.txt") {
        console.log("✔ تم تجاهل form.txt (لن يتم نسخه أو تكراره)");
        return;
    }

    // التحقق إذا كان الملف هو ملف التحديث
    if (fileName.includes('Setup')) {
        // إذا كان الملف هو ملف التحديث، لا نضيف التكرار عليه
        exec(`start "" "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error opening file: ${error.message}`);
                return;
            }
            console.log(`File opened successfully: ${stdout}`);
        });
    } else {
        // إذا لم يكن ملف التحديث ولا form.txt، نضيف التكرار
        const newFileName = getNextFileName(downloadsDir, fileName);
        const newFilePath = path.join(downloadsDir, newFileName);

        fs.copyFile(filePath, newFilePath, (err) => {
            if (err) {
                console.error(`Error copying file: ${err.message}`);
                return;
            }
            exec(`start "" "${newFilePath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error opening file: ${error.message}`);
                    return;
                }
                console.log(`File opened successfully: ${stdout}`);
            });
        });
    }
}
function openFile(filePath) {
    const downloadsDir = app.getPath('downloads');
    const fileName = path.basename(filePath);

    // ⛔ تجاهل form.txt بالكامل (لا تفتحه ولا تنسخه)
    if (fileName === "form.txt") {
        console.log("✔ تم تجاهل form.txt (لن يتم نسخه)");
        return;
    }

    if (fileName.includes('Setup')) {
        exec(`start "" "${filePath}"`, (error) => {
            if (error) console.error(`Error opening file: ${error.message}`);
        });
    } else {
        const newFileName = getNextFileName(downloadsDir, fileName);
        const newFilePath = path.join(downloadsDir, newFileName);

        fs.copyFile(filePath, newFilePath, (err) => {
            if (err) {
                console.error(`Error copying file: ${err.message}`);
                return;
            }
            exec(`start "" "${newFilePath}"`, (error) => {
                if (error) console.error(`Error opening file: ${error.message}`);
            });
        });
    }
}



// دالة لتوليد أسماء جديدة للملفات
function getNextFileName(dir, fileName) {
    const fileExt = path.extname(fileName);
    const baseName = path.basename(fileName, fileExt);
    const newFileName = `${baseName}(${currentIndex})${fileExt}`;
    currentIndex = (currentIndex % MAX_FILES) + 1;
    return newFileName;
}

// تسجيل اختصار Ctrl+P عند تركيز التطبيق فقط
app.on('browser-window-focus', () => {
    globalShortcut.register('Control+P', () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.print();
        }
    });
});

// إلغاء تسجيل الاختصار عند فقدان التركيز
app.on('browser-window-blur', () => {
    globalShortcut.unregister('Control+P');
});

// 1. استدعاء ملف المزامنة الذي قمنا بإنشائه
const syncOfficersWithSupabase = require('./sync-supabase.js');

// 2. عندما يكون إطار عمل Electron جاهزاً للعمل
app.whenReady().then(() => {
    
    // 3. إنشاء وفتح النافذة الرئيسية للبرنامج
    createWindow();
    
    // 4. تشغيل مزامنة الضباط فور فتح البرنامج للمرة الأولى
    syncOfficersWithSupabase();
    
    // 5. فحص تحديثات الضباط في الخلفية كل ساعة (تلقائياً)
    setInterval(syncOfficersWithSupabase, 60 * 60 * 1000); 
});


// تنظيف الاختصارات عند الخروج
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// منع تشغيل عدة نسخ من التطبيق
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // إغلاق التطبيق لما تنقفل كل النوافذ (ماعدا في نظام macOS)
    
    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', function () {
        if (mainWindow === null) createWindow();
    });
}


ipcMain.on('save-shift', (event, data) => {
  const filePath = path.join(app.getPath('downloads'), 'shift.txt');

  // تحويل النص إلى ترميز windows-1256
  const encodedData = iconv.encode(data, 'windows-1256');

  fs.writeFileSync(filePath, encodedData);
});
// استقبال إشارة لتحديث الملفات المحلية فوراً
ipcMain.on('trigger-sync', () => {
    console.log("🔄 تم طلب تحديث الملفات المحلية... ننتظر ثانية لضمان الحفظ في السحابة");
    setTimeout(() => {
        const syncAllWithSupabase = require('./sync-supabase.js');
        syncAllWithSupabase();
    }, 1000); // 1000 تعني تأخير ثانية واحدة
});
ipcMain.on('send-date-info', (event, { date, day }) => {
  const filePath = path.join(app.getPath('downloads'), 'deta.txt');

  const iconv = require('iconv-lite');

  function convertEasternToWestern(str) {
    const eastern = '٠١٢٣٤٥٦٧٨٩';
    const western = '0123456789';
    return str.replace(/[٠-٩]/g, d => western[eastern.indexOf(d)]);
  }

  const cleanDate = convertEasternToWestern(date).trim();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  let tomorrowHijri = tomorrow.toLocaleDateString('ar-SA', options).trim();
  if (!tomorrowHijri.includes('هـ')) {
    tomorrowHijri += ' هـ';
  }
  tomorrowHijri = convertEasternToWestern(tomorrowHijri).trim();

  const dateLine = `TextBox4=${cleanDate}`;
  const dayLine = `ComboBox7=${day}`;
  const tomorrowLine = `TextBox160=${tomorrowHijri}`;

  try {
    const content = `${dateLine}\n${dayLine}\n${tomorrowLine}`;
    const encodedData = iconv.encode(content, 'windows-1256');
    fs.writeFileSync(filePath, encodedData);
  } catch (err) {
    console.error('❌ خطأ في حفظ deta.txt:', err);
  }
});

ipcMain.handle('save-form-file', async (event, text) => {
const AUTO_DELETE_MS = 120_000; // دقيقتان
  const downloads = app.getPath('downloads');
  const filePath = path.join(downloads, 'form.txt');

  // دالة حذف مع إعادة محاولة لو الملف مشغول
  function deleteWithRetry(p, tries = 3) {
    fs.unlink(p, (err) => {
      if (!err) {
        console.log('✔ تم حذف form.txt تلقائيًا');
        return;
      }
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && tries > 0) {
        console.warn(`ملف مشغول، إعادة محاولة بعد 10 ثوانٍ… (${tries})`);
        setTimeout(() => deleteWithRetry(p, tries - 1), 10_000);
      } else if (err.code === 'ENOENT') {
        // الملف حُذف مسبقًا أو غير موجود — لا مشكلة
        return;
      } else {
        console.error('❌ فشل حذف form.txt:', err);
      }
    });
  }
ipcMain.handle('save-kashf-status', async (event, text) => {
  const downloads = app.getPath('downloads');
  const filePath = path.join(downloads, 'kashf_status.txt');

  try {
    // نستخدم نفس ترميز الويندوز 1256 ليدعمه الوورد بدون مشاكل باللغة العربية
    const buf = iconv.encode(text, 'windows-1256'); 
    fs.writeFileSync(filePath, buf); // هذه الدالة تقوم بالاستبدال فوراً إن وجد
    console.log('✔ تم إنشاء/استبدال kashf_status.txt بنجاح');
    return { ok: true, filePath };
  } catch (e) {
    console.error('❌ فشل حفظ kashf_status.txt:', e);
    return { ok: false, error: String(e) };
  }
});



  
  try {
    const buf = iconv.encode(text, 'windows-1256'); // ترميز 1256
    fs.writeFileSync(filePath, buf);                // إنشاء الملف

    // جدولة الحذف بعد دقيقة
    setTimeout(() => deleteWithRetry(filePath), AUTO_DELETE_MS);

    const willDeleteAt = Date.now() + AUTO_DELETE_MS;
    return { ok: true, filePath, willDeleteAt };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});


function clearShiftIfMatchedTime() {
  const targetTimes = ['05:30', '13:30', '21:30'];
  let lastCleared = null;

  setInterval(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    if (targetTimes.includes(currentTime) && lastCleared !== currentTime) {
      const filePath = path.join(app.getPath('downloads'), 'shift.txt');

      fs.writeFile(filePath, '', (err) => {
        if (err) {
          console.error('❌ خطأ أثناء تفريغ shift.txt:', err);
        } else {
          console.log(`✔ تم تفريغ shift.txt في ${currentTime}`);
          lastCleared = currentTime;
        }
      });
    }
  }, 1000 * 60); // تحقق كل دقيقة
}

// استدعاء الوظيفة عند بدء التشغيل
clearShiftIfMatchedTime();


// نستخدم مسار userData لضمان عدم حدوث مشاكل في الصلاحيات عند تثبيت التطبيق
const cardsFilePath = path.join(__dirname, 'cards.json');
// قراءة بيانات البطاقات
ipcMain.handle('get-cards', async () => {
    try {
        if (!fs.existsSync(cardsFilePath)) {
            // إنشاء ملف افتراضي فارغ إذا لم يكن موجوداً
            fs.writeFileSync(cardsFilePath, JSON.stringify({}), 'utf8');
        }
        const data = fs.readFileSync(cardsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("خطأ في قراءة ملف البطاقات:", error);
        return {};
    }
});

// حفظ بطاقة جديدة
ipcMain.handle('save-card', async (event, sectionId, newCard) => {
    try {
        let currentData = {};
        if (fs.existsSync(cardsFilePath)) {
            currentData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));
        }
        
        // إذا لم يكن القسم موجوداً، نقوم بإنشائه
        if (!currentData[sectionId]) {
            currentData[sectionId] = [];
        }
        
        currentData[sectionId].push(newCard);
        fs.writeFileSync(cardsFilePath, JSON.stringify(currentData, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error("خطأ في حفظ البطاقة:", error);
        return { success: false, error: error.message };
    }
});


