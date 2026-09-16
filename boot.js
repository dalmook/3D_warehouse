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

// Keep the existing editor and its saved layouts intact; the default entry is Warehouse City.
function addWarehouseCityEntry() {
  if (document.getElementById("warehouse-city-entry")) return;
  const link = document.createElement("a");
  link.id = "warehouse-city-entry";
  link.href = "./index.html";
  link.textContent = "새 창고 설계 · 운영 · 내부 체험 ↗ (v9.1)";
  link.setAttribute("aria-label", "Warehouse City v9.1 열기");
  link.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:10000;max-width:calc(100vw - 24px);padding:11px 15px;border-radius:10px;background:#147f72;color:#fff;text-decoration:none;font:600 13px/1.5 sans-serif;box-shadow:0 4px 18px #0003;";
  document.body.appendChild(link);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addWarehouseCityEntry, { once: true });
else addWarehouseCityEntry();
