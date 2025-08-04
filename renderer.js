document.addEventListener("DOMContentLoaded", function () {
  const shiftInput = document.getElementById("shift-input");
  const sendButton = document.getElementById("send-shift");

  if (shiftInput && sendButton) {
    sendButton.addEventListener("click", function () {
      const value = shiftInput.value.trim();
      if (value && window.electronAPI) {
        window.electronAPI.saveShiftValue(value);
        alert("✅ تم حفظ المناوبة: " + value);
      } else {
        alert("يرجى كتابة رقم المناوبة أولاً");
      }
    });
  }
});
setInterval(() => {
  const date = document.getElementById("custom-hijri-date")?.value || '';
  const day = document.getElementById("custom-weekday")?.value || '';

  if (window.electronAPI && date && day) {
    window.electronAPI.sendDateInfo(date, day);
  }
}, 1000);
