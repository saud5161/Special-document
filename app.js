const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

// دالة لتحميل مستند DOCX وقراءة البوكماركت
function extractBookmarkContent(docxPath, bookmarkName) {
  return new Promise((resolve, reject) => {
    fs.readFile(docxPath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // استخدام مكتبة mammoth لقراءة مستند DOCX
      mammoth.extractRawText({ buffer: data })
        .then(function(result) {
          const rawText = result.value;

          // البحث عن البوكماركت باستخدام الاسم
          const regex = new RegExp(`<w:bookmarkStart[^>]*w:name="(${bookmarkName})"[^>]*>.*?<\/w:bookmarkEnd>`, 'g');
          const matches = rawText.match(regex);

          if (matches && matches.length > 0) {
            // استخراج النص الذي يوجد داخل البوكماركت
            const textInsideBookmark = matches[0].replace(/<[^>]+>/g, '').trim(); // إزالة الوسوم واستخراج النص فقط
            resolve(textInsideBookmark);
          } else {
            reject('لم يتم العثور على البوكماركت المحدد');
          }
        })
        .catch(reject);
    });
  });
}

// استخدام الدالة في تطبيق Electron لعرض النتيجة في HTML
const docxFilePath = path.join(__dirname, 'yourfile.docx');  // تحديد المسار إلى الملف الخاص بك
extractBookmarkContent(docxFilePath, 'SSSS')
  .then(content => {
    // عرض النص داخل البوكماركت في HTML
    document.getElementById('bookmark-content').innerText = content;
  })
  .catch(err => {
    document.getElementById('bookmark-content').innerText = 'حدث خطأ: ' + err;
  });
