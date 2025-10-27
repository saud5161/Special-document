document.addEventListener("DOMContentLoaded", function () {
  const shiftInput = document.getElementById("shift-input");
  const sendButton = document.getElementById("send-shift");

  if (shiftInput && sendButton) {
    sendButton.addEventListener("click", function () {
      const value = shiftInput.value.trim();
      if (value && window.electronAPI) {
        window.electronAPI.saveShiftValue(value);
      }
    });
  }

  // ⏱️ إرسال التاريخ مباشرة عند فتح الصفحة
  sendDateNow();

  // 🔁 ثم كل 5 دقائق (300000 مللي ثانية)
  setInterval(sendDateNow, 300000);
});

// 📤 دالة إرسال التاريخ إلى main.js
function sendDateNow() {
  const date = document.getElementById("custom-hijri-date")?.value || '';
  const day = document.getElementById("custom-weekday")?.value || '';

  if (window.electronAPI && date && day) {
    window.electronAPI.sendDateInfo(date, day);
    console.log("📤 إرسال التاريخ:", date, "اليوم:", day);
  }
}
