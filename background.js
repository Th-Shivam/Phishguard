const VIRUSTOTAL_API_KEY = 'YOUR_VIRUS_TOTAL_API_KEY'; // Replace with your actual VirusTotal API key

// Function to check URL with VirusTotal
async function checkUrlWithVirusTotal(url) {
  console.log(`Checking URL with VirusTotal: ${url}`);
  try {
    const apiResponse = await fetch(`https://www.virustotal.com/api/v3/urls`, {
      method: 'POST',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `url=${encodeURIComponent(url)}`
    });

    if (!apiResponse.ok) {
      console.error('VirusTotal API submission failed:', apiResponse.statusText);
      return null;
    }

    const { data } = await apiResponse.json();
    const analysisId = data.id;

    const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      method: 'GET',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY
      }
    });

    if (!reportResponse.ok) {
      console.error('VirusTotal report fetch failed:', reportResponse.statusText);
      return null;
    }

    const reportData = await reportResponse.json();
    const stats = reportData.data.attributes.stats;

    console.log(`VirusTotal stats for ${url}:`, stats);

    return stats.malicious > 0 ? "malicious" : stats.suspicious > 0 ? "suspicious" : "safe";
  } catch (error) {
    console.error('Error checking URL with VirusTotal:', error);
    return null;
  }
}

// Function to add a blocking rule for a URL
async function blockUrl(url) {
  console.log(`Blocking malicious URL: ${url}`);

  // Generate a unique integer ID for the rule
  const rawId = Date.now(); // Get current timestamp
  const ruleId = Math.floor(rawId); // Ensure it's an integer
  console.log(`Generated rule ID: ${ruleId}`);

  // Validate that the ID is an integer
  if (!Number.isInteger(ruleId)) {
    console.error(`Invalid rule ID: ${ruleId}. Expected an integer.`);
    return;
  }

  const rule = {
    id: ruleId, // Use the validated integer ID
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: url.replace(/https?:\/\//, ""), // Remove protocol
      resourceTypes: ["main_frame"] // Block only main frame requests
    }
  };

  try {
    // Add the rule dynamically
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [rule],
      removeRuleIds: [rule.id] // Ensure no duplicate rules
    });
    console.log(`Successfully blocked URL: ${url}`);
  } catch (error) {
    console.error('Error adding blocking rule:', error);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check if protection is active
  const result = await chrome.storage.local.get(["protectionActive"]);
  const isProtectionActive = result.protectionActive !== undefined ? result.protectionActive : true;

  if (!isProtectionActive) return; // Skip if protection is inactive

  if (changeInfo.status === "loading" && tab.url) {
    const url = tab.url;
    console.log(`Tab updated with URL: ${url}`);

    const severity = await checkUrlWithVirusTotal(url);
    if (severity === "malicious" || severity === "suspicious") {
      console.log(`Flagged ${severity} URL: ${url}`);
      await blockUrl(url);
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(url)}&severity=${severity}`)
      });
    }
  }
});