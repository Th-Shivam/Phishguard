document.addEventListener("DOMContentLoaded", async () => {
  const statusIndicator = document.getElementById("status-indicator");
  const statusMessage = document.getElementById("status-message");
  const toggleButton = document.getElementById("toggle-protection");

  let isProtectionActive = true;
  chrome.storage.local.get(["protectionActive"], (result) => {
    isProtectionActive = result.protectionActive !== undefined ? result.protectionActive : true;
    updateUI();
  });

  function updateUI() {
    if (isProtectionActive) {
      statusIndicator.className = "indicator green";
      statusMessage.textContent = "Protection is active.";
      toggleButton.textContent = "Stop Protection";
    } else {
      statusIndicator.className = "indicator yellow";
      statusMessage.textContent = "Protection is inactive.";
      toggleButton.textContent = "Start Protection";
    }
  }

  toggleButton.addEventListener("click", async () => {
    isProtectionActive = !isProtectionActive;
    await chrome.storage.local.set({ protectionActive: isProtectionActive });
    updateUI();
  });

  document.getElementById("refresh-button").addEventListener("click", () => {
    updateUI();
    alert("Status refreshed!");
  });
});