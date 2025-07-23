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
