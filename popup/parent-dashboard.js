/**
 * SafeGuard Kids - Parent Dashboard JavaScript
 */

class ParentDashboard {
  constructor() {
    this.isAuthenticated = false;
    this.currentStats = null;

    this.init();
  }

  async init() {
    // Check if first time setup is needed
    const hasPassword = await this.checkIfPasswordExists();

    if (!hasPassword) {
      this.showFirstTimeSetup();
    } else {
      this.showLoginScreen();
    }

    this.setupEventListeners();
  }

  async checkIfPasswordExists() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['parentPassword'], (result) => {
        resolve(!!result.parentPassword);
      });
    });
  }

  showFirstTimeSetup() {
    document.getElementById('first-time-setup').style.display = 'block';
    document.getElementById('parent-password').disabled = true;
    document.getElementById('login-btn').disabled = true;
  }

  showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('dashboard-screen').style.display = 'none';
  }

  showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';
    this.isAuthenticated = true;

    // Load dashboard data
    this.loadStats();
    this.loadThreats();
    this.loadNotifications();
    this.loadSettings();
    this.checkAIStatus();
  }

  setupEventListeners() {
    // Login
    document.getElementById('login-btn').addEventListener('click', () => {
      this.handleLogin();
    });

    document.getElementById('parent-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });

    // First time setup
    document.getElementById('setup-btn').addEventListener('click', () => {
      this.handleSetup();
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Navigation (Sidebar)
    document.querySelectorAll('.nav-item').forEach(navItem => {
      navItem.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Settings
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('change-password-btn').addEventListener('click', () => {
      this.changePassword();
    });

    document.getElementById('test-notifications-btn').addEventListener('click', () => {
      this.testNotifications();
    });

    document.getElementById('export-data-btn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
      this.clearData();
    });

    // Threat filter
    document.getElementById('threat-filter').addEventListener('change', (e) => {
      this.filterThreats(e.target.value);
    });

    // Test Chat Button
    const testChatBtn = document.getElementById('open-test-chat');
    if (testChatBtn) {
      testChatBtn.addEventListener('click', () => {
        this.openTestChat();
      });
    }

    // Chat Simulator Button
    const chatSimulatorBtn = document.getElementById('open-chat-simulator');
    if (chatSimulatorBtn) {
      chatSimulatorBtn.addEventListener('click', () => {
        this.openChatSimulator();
      });
    }

    const testPornBtn = document.getElementById('open-test-porn');
    if (testPornBtn) {
      testPornBtn.addEventListener('click', () => {
        this.openTestPornDetection();
      });
    }
  }

  openTestChat() {
    // Open test messages in a new tab
    const testUrl = chrome.runtime.getURL('tests/demo-chat.html');
    chrome.tabs.create({ url: testUrl });
  }

  openChatSimulator() {
    // Open chat simulator in a new tab
    const testUrl = chrome.runtime.getURL('tests/chat-simulator.html');
    chrome.tabs.create({ url: testUrl });
  }

  openTestPornDetection() {
    // Open porn detection test page in a new tab
    const testUrl = chrome.runtime.getURL('tests/test-porn-detection.html');
    chrome.tabs.create({ url: testUrl });
  }

  async handleLogin() {
    const password = document.getElementById('parent-password').value;

    if (!password) {
      this.showError('Please enter your password');
      return;
    }

    const stored = await this.getStoredPassword();

    if (password === stored) {
      this.showDashboard();
    } else {
      this.showError('Incorrect password');
    }
  }

  async handleSetup() {
    const password = document.getElementById('setup-password').value;
    const email = document.getElementById('setup-email').value;
    const mode = document.getElementById('setup-mode').value;

    if (!password || password.length < 6) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    if (!email || !this.validateEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    // Save settings
    await chrome.storage.local.set({
      parentPassword: password,
      parentEmail: email,
      mode: mode,
      enabled: true,
      setupComplete: true
    });

    // Show dashboard
    this.showDashboard();
  }

  handleLogout() {
    this.isAuthenticated = false;
    this.showLoginScreen();
    document.getElementById('parent-password').value = '';
  }

  switchTab(tabName) {
    // Update navigation items
    document.querySelectorAll('.nav-item').forEach(navItem => {
      navItem.classList.remove('active');
      if (navItem.dataset.tab === tabName) {
        navItem.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
    } else {
      console.error(`Tab not found: ${tabName}-tab`);
    }
  }

  async loadStats() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (response && response.stats) {
        this.currentStats = response.stats;
        this.displayStats(response.stats);
      }
    });
  }

  displayStats(stats) {
    document.getElementById('total-analyzed').textContent = stats.totalAnalyzed || 0;
    document.getElementById('threats-detected').textContent = stats.threatsDetected || 0;
    document.getElementById('critical-threats').textContent = stats.criticalThreats || 0;
  }

  async loadThreats() {
    chrome.storage.local.get(['incidents'], (result) => {
      const incidents = result.incidents || [];
      this.displayThreats(incidents.reverse()); // Most recent first
    });
  }

  displayThreats(threats) {
    const container = document.getElementById('threats-list');

    if (threats.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>No threats detected yet</p>
          <p class="empty-subtitle">Your child's conversations appear safe</p>
        </div>
      `;
      return;
    }

    container.innerHTML = threats.map(threat => this.createThreatCard(threat)).join('');
  }

  createThreatCard(incident) {
    // Incident structure: { id, timestamp, type, severity, level, platform, content, agentResults, actionTaken }
    const levelClass = this.getThreatLevelClass(incident.level);
    const levelText = this.getThreatLevelText(incident.level);
    const date = new Date(incident.timestamp).toLocaleString();

    // Extract explanation from agent results
    const explanation = incident.agentResults?.agent1?.explanation || '';
    const redFlags = incident.agentResults?.agent1?.redFlags || [];

    return `
      <div class="threat-card ${levelClass}">
        <div class="threat-header">
          <div class="threat-level">
            <span class="threat-badge ${levelClass}">${incident.severity || levelText}</span>
            <span class="threat-platform">${incident.platform}</span>
          </div>
          <div class="threat-time">${date}</div>
        </div>

        <div class="threat-content">
          <p class="threat-message"><strong>⚠️ Inappropriate Content:</strong></p>
          <div style="background: #fee; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; font-family: monospace; white-space: pre-wrap;">
"${this.escapeHtml(incident.content)}"
          </div>

          ${explanation ? `
            <p class="threat-explanation">
              <strong>AI Analysis:</strong> ${this.escapeHtml(explanation)}
            </p>
          ` : ''}

          ${redFlags && redFlags.length > 0 ? `
            <div class="threat-flags">
              <strong>Red flags detected:</strong>
              ${redFlags.map(flag => `<span class="flag-badge">${flag}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="threat-actions">
          <button class="btn btn-small" onclick="dashboard.viewThreatDetails('${incident.id || incident.timestamp}')">
            View Details
          </button>
          ${incident.level >= 8 ? `
            <button class="btn btn-danger btn-small" onclick="dashboard.reportThreat('${incident.id || incident.timestamp}')">
              Report to Authorities
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getThreatLevelClass(level) {
    if (level >= 9) return 'critical';
    if (level >= 7) return 'high';
    if (level >= 5) return 'medium';
    return 'low';
  }

  getThreatLevelText(level) {
    if (level >= 9) return 'CRITICAL';
    if (level >= 7) return 'HIGH';
    if (level >= 5) return 'MEDIUM';
    return 'LOW';
  }

  filterThreats(filter) {
    chrome.storage.local.get(['threats'], (result) => {
      let threats = result.threats || [];

      if (filter === 'critical') {
        threats = threats.filter(t => t.threat.level >= 9);
      } else if (filter === 'high') {
        threats = threats.filter(t => t.threat.level >= 7 && t.threat.level < 9);
      } else if (filter === 'medium') {
        threats = threats.filter(t => t.threat.level >= 5 && t.threat.level < 7);
      }

      this.displayThreats(threats.reverse());
    });
  }

  async loadNotifications() {
    chrome.storage.local.get(['parentNotifications'], (result) => {
      const notifications = result.parentNotifications || [];
      this.displayNotifications(notifications.reverse());
    });
  }

  displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');

    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications.map(notif => `
      <div class="notification-card ${notif.read ? '' : 'unread'}">
        <h4>${notif.type === 'child_help_request' ? '🆘 Child Requested Help' : '⚠️ Critical Alert'}</h4>
        <p>${new Date(notif.timestamp).toLocaleString()}</p>
        ${notif.threat ? `<p>Threat Level: ${notif.threat.level}/10</p>` : ''}
      </div>
    `).join('');
  }

  async loadSettings() {
    // Load settings from chrome.storage.sync (small data, syncs across browsers)
    chrome.storage.sync.get([
      'mode', 'enabled', 'parentEmail', 'resendApiKey', 'emailThreshold',
      'parentPhone', 'vonageApiKey', 'vonageApiSecret', 'vonageSenderNumber', 'smsThreshold'
    ], (result) => {
      console.log('📋 Loading settings from chrome.storage.sync...');
      console.log('  - Mode:', result.mode || 'active');
      console.log('  - Parent Email:', result.parentEmail || 'Not set');
      console.log('  - Resend API Key:', result.resendApiKey ? 'Found' : 'Not found');
      console.log('  - Vonage API Key:', result.vonageApiKey ? 'Found' : 'Not found');
      console.log('  - Vonage API Secret:', result.vonageApiSecret ? 'Found' : 'Not found');
      console.log('  - Vonage Sender Number:', result.vonageSenderNumber || 'Not set');

      document.getElementById('mode-select').value = result.mode || 'active';
      document.getElementById('enabled-toggle').checked = result.enabled !== false;
      document.getElementById('parent-email-input').value = result.parentEmail || '';
      document.getElementById('resend-api-key-input').value = result.resendApiKey || '';
      document.getElementById('email-threshold-select').value = result.emailThreshold || '7';
      document.getElementById('parent-phone-input').value = result.parentPhone || '';
      document.getElementById('vonage-api-key-input').value = result.vonageApiKey || '';
      document.getElementById('vonage-api-secret-input').value = result.vonageApiSecret || '';
      document.getElementById('vonage-sender-number-input').value = result.vonageSenderNumber || '';
      document.getElementById('sms-threshold-select').value = result.smsThreshold || '7';
    });
  }

  async saveSettings() {
    const mode = document.getElementById('mode-select').value;
    const enabled = document.getElementById('enabled-toggle').checked;
    const email = document.getElementById('parent-email-input').value;
    const resendApiKey = document.getElementById('resend-api-key-input').value;
    const emailThreshold = parseInt(document.getElementById('email-threshold-select').value);
    const parentPhone = document.getElementById('parent-phone-input').value;
    const vonageApiKey = document.getElementById('vonage-api-key-input').value;
    const vonageApiSecret = document.getElementById('vonage-api-secret-input').value;
    const vonageSenderNumber = document.getElementById('vonage-sender-number-input').value;
    const smsThreshold = parseInt(document.getElementById('sms-threshold-select').value);

    if (email && !this.validateEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (resendApiKey && !resendApiKey.startsWith('re_')) {
      alert('Invalid Resend API key. It should start with "re_"');
      return;
    }

    if (email && !resendApiKey) {
      alert('Please enter a Resend API key to enable email notifications');
      return;
    }

    // Validate phone number format (E.164)
    if (parentPhone && !parentPhone.match(/^\+[1-9]\d{1,14}$/)) {
      alert('Please enter phone number in E.164 format (e.g., +1234567890)');
      return;
    }

    if (parentPhone && (!vonageApiKey || !vonageApiSecret)) {
      alert('Please enter Vonage API Key, Secret, and Sender Number to enable SMS notifications');
      return;
    }

    // Save settings to chrome.storage.sync (small data, syncs across browsers)
    await chrome.storage.sync.set({
      mode: mode,
      enabled: enabled,
      parentEmail: email,
      resendApiKey: resendApiKey,
      emailThreshold: emailThreshold,
      parentPhone: parentPhone,
      vonageApiKey: vonageApiKey,
      vonageApiSecret: vonageApiSecret,
      vonageSenderNumber: vonageSenderNumber,
      smsThreshold: smsThreshold
    });

    console.log('✅ Settings saved to chrome.storage.sync');
    console.log('  - Mode:', mode);
    console.log('  - Parent Email:', email);
    console.log('  - Resend API Key:', resendApiKey ? 'Set' : 'Not set');
    console.log('  - Vonage API Key:', vonageApiKey ? 'Set' : 'Not set');
    console.log('  - Vonage API Secret:', vonageApiSecret ? 'Set' : 'Not set');

    alert('Settings saved successfully!');
  }

  async changePassword() {
    const currentPassword = prompt('Enter your current password:');
    if (!currentPassword) return;

    const stored = await this.getStoredPassword();
    if (currentPassword !== stored) {
      alert('Incorrect current password');
      return;
    }

    const newPassword = prompt('Enter your new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    await chrome.storage.local.set({ parentPassword: newPassword });
    alert('Password changed successfully!');
  }

  async testNotifications() {
    console.log('Testing notifications...');

    // Get current settings including API keys
    const email = document.getElementById('parent-email-input').value;
    const phone = document.getElementById('parent-phone-input').value;
    const resendApiKey = document.getElementById('resend-api-key-input').value;
    const vonageApiKey = document.getElementById('vonage-api-key-input').value;
    const vonageApiSecret = document.getElementById('vonage-api-secret-input').value;

    if (!email && !phone) {
      alert('❌ Please configure at least one notification method (email or phone) before testing.');
      return;
    }

    // Show loading state
    const testBtn = document.getElementById('test-notifications-btn');
    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = 'Sending Test...';

    try {
      // Create a test incident
      const testIncident = {
        platform: 'Test',
        text: 'This is a test notification from SafeGuard Kids to verify your notification settings are configured correctly.',
        timestamp: Date.now(),
        type: 'test'
      };

      const testThreat = {
        finalLevel: 7,
        severity: 'MEDIUM',
        primaryThreat: 'notification_test',
        actionRequired: 'immediate_parent_notification',
        parentGuidance: 'This is a test notification. If you received this, your notification settings are working correctly! You will receive alerts like this when SafeGuard Kids detects actual threats to your child.',
        childWarning: 'Test notification'
      };

      // Save current settings first (including API keys) to sync storage
      await chrome.storage.sync.set({
        parentEmail: email,
        parentPhone: phone,
        resendApiKey: resendApiKey,
        vonageApiKey: vonageApiKey,
        vonageApiSecret: vonageApiSecret
      });

      console.log('💾 Settings saved to chrome.storage.sync before test');
      console.log('  - Email:', email);
      console.log('  - Phone:', phone);
      console.log('  - Resend API Key:', resendApiKey ? 'Set' : 'Not set');
      console.log('  - Vonage API Key:', vonageApiKey ? 'Set' : 'Not set');

      // Send test notification via service worker
      const response = await chrome.runtime.sendMessage({
        action: 'testNotification',
        data: {
          incident: testIncident,
          threat: testThreat,
          email: email,
          phone: phone
        }
      });

      console.log('Test notification response:', response);

      // Show results based on API key configuration
      let message = '✅ Test Notification Sent!\n\n';
      message += 'Check your console (F12) for detailed logs.\n\n';

      if (email) {
        if (resendApiKey) {
          message += '📧 Email: Sent via Resend API to ' + email + '\n';
          message += '   Check your inbox!\n';
        } else {
          message += '📧 Email: SIMULATED (no Resend API key configured)\n';
          message += '   Add your Resend API key to send real emails\n';
        }
      }

      if (phone) {
        if (vonageApiKey && vonageApiSecret) {
          message += '📱 SMS: Sent via Vonage API to ' + phone + '\n';
          message += '   Check your phone!\n';
        } else {
          message += '📱 SMS: SIMULATED (no Vonage API credentials configured)\n';
          message += '   Add your Vonage API credentials to send real SMS\n';
        }
      }

      alert(message);

    } catch (error) {
      console.error('Test notification error:', error);
      alert('❌ Test notification failed: ' + error.message);
    } finally {
      // Reset button
      testBtn.disabled = false;
      testBtn.textContent = originalText;
    }
  }

  async exportData() {
    chrome.storage.local.get(['threats', 'analysisLog', 'parentNotifications'], (result) => {
      const data = {
        threats: result.threats || [],
        analysisLog: result.analysisLog || [],
        notifications: result.parentNotifications || [],
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `safeguard-kids-data-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    });
  }

  async clearData() {
    if (!confirm('⚠️ WARNING: Clear All Browser Memory\n\nThis will permanently delete:\n• All threat logs and analysis data\n• All conversations and notifications\n• All extension settings and configuration\n• Parent password (you will need to set up again)\n\nThis action CANNOT be undone.\n\nAre you absolutely sure?')) {
      return;
    }

    if (!confirm('⛔ FINAL CONFIRMATION\n\nYou are about to erase ALL SafeGuard Kids data from browser memory.\n\nClick OK to proceed with complete data deletion.')) {
      return;
    }

    try {
      console.log('🗑️ Starting complete data cleanup...');

      // Clear ALL chrome.storage.local data
      await chrome.storage.local.clear();
      console.log('✓ Chrome local storage cleared');

      // Clear chrome.storage.sync if used
      await chrome.storage.sync.clear();
      console.log('✓ Chrome sync storage cleared');

      // Send message to service worker to clear any cached data
      try {
        await chrome.runtime.sendMessage({
          action: 'clearAllData'
        });
        console.log('✓ Service worker cache cleared');
      } catch (error) {
        console.log('Note: Service worker already cleared or not responding');
      }

      console.log('✅ All browser memory cleared successfully');

      alert('✅ Success!\n\nAll data has been permanently deleted from browser memory.\n\nThe extension will now reset. You will need to set up again when you next access the dashboard.');

      // Close the side panel/popup to force refresh
      window.close();

    } catch (error) {
      console.error('❌ Error clearing data:', error);
      alert('❌ Error clearing data:\n\n' + error.message);
    }
  }

  viewThreatDetails(threatId) {
    // This would show a modal with full conversation context
    alert('View threat details - Feature coming soon');
  }

  reportThreat(threatId) {
    if (confirm('This will prepare a report for law enforcement. Continue?')) {
      alert('Report preparation - Feature coming soon.\n\nFor immediate danger, call local emergency services.');
    }
  }

  async getStoredPassword() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['parentPassword'], (result) => {
        resolve(result.parentPassword);
      });
    });
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showError(message) {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async checkAIStatus() {
    const statusIcon = document.getElementById('prompt-api-status');
    const statusText = document.getElementById('prompt-api-text');
    const setupHint = document.getElementById('gemini-setup-hint');
    const setupLink = document.getElementById('gemini-setup-link');

    if (!statusIcon || !statusText) return;

    try {
      // Send message to background to check Prompt API status
      chrome.runtime.sendMessage({ action: 'checkPromptAPI' }, (response) => {
        if (response && response.available) {
          // Prompt API is available
          statusIcon.textContent = '🟢';
          statusText.textContent = 'Active - Gemini Nano ready';
          statusText.style.color = '#10b981';
          if (setupHint) setupHint.style.display = 'none';
        } else {
          // Prompt API not available
          statusIcon.textContent = '🔴';
          statusText.innerHTML = 'Not available - <strong>60% protection active</strong>';
          statusText.style.color = '#f59e0b';
          if (setupHint) setupHint.style.display = 'block';
        }
      });
    } catch (error) {
      console.error('[Dashboard] Error checking AI status:', error);
      statusIcon.textContent = '🔴';
      statusText.textContent = 'Status unknown';
      statusText.style.color = '#999';
    }

    // Setup link handler
    if (setupLink) {
      setupLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Open README.md which contains Gemini Nano setup instructions
        const setupGuideUrl = chrome.runtime.getURL('README.md');
        chrome.tabs.create({ url: setupGuideUrl });
      });
    }
  }
}

// Initialize dashboard
const dashboard = new ParentDashboard();
