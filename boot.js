window.__warehouseBootErrors = [];
document.documentElement.dataset.bootScript = "loaded";
window.addEventListener("error", function (event) {
  const message = String(event.message || event.error || "Unknown error");
  window.__warehouseBootErrors.push(message);
  document.documentElement.dataset.bootError = message.slice(0, 180);
  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = `시작 오류: ${message}`;
    toast.className = "toast show error";
  }
});
window.addEventListener("unhandledrejection", function (event) {
  const message = String(event.reason || "Unhandled promise rejection");
  window.__warehouseBootErrors.push(message);
  document.documentElement.dataset.bootError = message.slice(0, 180);
});
