# SafeGuard Kids - Setup Guide

Complete installation and testing guide for the SafeGuard Kids Chrome extension.

---

## 📋 Prerequisites

### 1. Chrome Browser (Version 127+)

Check your Chrome version:
1. Open Chrome
2. Go to `chrome://settings/help`
3. Verify you have version 127 or higher

### 2. Enable Chrome Built-in AI (Gemini Nano)

#### Step-by-step:

1. **Open Chrome Flags**
   - Navigate to `chrome://flags/`

2. **Enable Prompt API**
   - Search for: `Prompt API for Gemini Nano`
   - Or directly go to: `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to: **Enabled**

3. **Enable Optimization Guide**
   - Search for: `Optimization Guide On Device Model`
   - Or go to: `chrome://flags/#optimization-guide-on-device-model`
   - Set to: **Enabled BypassPerfRequirement**

4. **Restart Chrome**
   - Click the "Relaunch" button that appears

5. **Verify Model Download**
   - Go to `chrome://components/`
   - Look for "Optimization Guide On Device Model"
   - Click "Check for update"
   - Wait for download (requires ~22GB free space)
   - Status should show "Up-to-date"

#### Troubleshooting Gemini Nano:

If the model doesn't download:
- Ensure you have at least 22GB free disk space
- Make sure you're on a stable, unmetered network
- Try restarting Chrome and checking `chrome://components/` again
- Wait 10-15 minutes; download may happen in background

---

## 🚀 Installation

### Option 1: Install from Source (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/safeguard-kids.git
   cd safeguard-kids
   ```

2. **Install Dependencies** (Optional - for TensorFlow.js)
   ```bash
   npm install
   ```

   Note: The extension will work without npm install, but for optimal performance, you can load TensorFlow.js from CDN or install it.

3. **Load Extension in Chrome**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `safeguard-kids` directory
   - Extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "SafeGuard Kids"
   - Click the pin icon to keep it visible

### Option 2: Load Pre-built Package (Production)

1. Download the latest release ZIP
2. Extract to a folder
3. Follow steps 3-4 from Option 1

---

## ⚙️ Initial Configuration

### First Time Setup

1. **Click the Extension Icon**
   - The SafeGuard Kids icon in your Chrome toolbar

2. **Create Parent Password**
   - Enter a strong password (minimum 6 characters)
   - This protects the parent dashboard
   - **IMPORTANT**: Remember this password!

3. **Enter Parent Email**
   - Enter your email for critical threat alerts
   - Format: `your.email@example.com`

4. **Choose Monitoring Mode**
   - **Active Mode**: Child sees warnings when threats detected
   - **Passive Mode**: Silent monitoring, parent gets emails

5. **Complete Setup**
   - Click "Complete Setup"
   - You'll see the parent dashboard

---

## 🧪 Testing the Extension

### Test with Demo Page

1. **Open Demo Chat**
   ```bash
   # From project directory
   open tests/demo-chat.html
   # Or double-click the file
   ```

2. **Run Test Scenarios**
   - Click the scenario buttons to simulate different threats
   - Watch the extension detect and respond
   - Check for warning popups (Active mode)
   - View threats in parent dashboard

### Test Scenarios Included:

| Scenario | Threat Level | Expected Behavior |
|----------|--------------|-------------------|
| Sexual Content | Critical (10/10) | Immediate alert, parent notification |
| Meeting Request | High (9/10) | High priority warning |
| Personal Info | High (8/10) | High priority warning |
| Grooming Pattern | Medium-High (7/10) | Warning popup |
| Manipulation | Medium (6/10) | Logged, monitored |
| Safe Conversation | Low (1/10) | No action |

### Test on Real Platforms (Optional)

**⚠️ WARNING**: Only test with a second account you control. Do NOT test with strangers.

1. **Create Test Accounts**
   - Create two accounts on Facebook/Instagram
   - One as "child", one as "adult"

2. **Start Chat**
   - Use the "child" account in Chrome with extension
   - Chat from "adult" account (different browser/device)

3. **Send Test Messages**
   - Try the test scenarios from demo page
   - Verify extension detects threats
   - Check parent dashboard for logs

---

## 📊 Using the Parent Dashboard

### Access Dashboard

1. Click the SafeGuard Kids extension icon
2. Enter your parent password
3. Click "Access Dashboard"

### Dashboard Tabs

#### 1. Alerts Tab
- View all detected threats
- Filter by severity (All/Critical/High/Medium)
- See threat details:
  - Message content
  - Threat level (0-10)
  - Platform (Facebook, Instagram, etc.)
  - Timestamp
  - AI analysis explanation
  - Red flags detected

#### 2. Settings Tab
- **Monitoring Mode**: Switch between Active/Passive
- **Enable/Disable**: Turn monitoring on/off
- **Parent Email**: Update email address
- **Change Password**: Update dashboard password
- **Export Data**: Download all threat logs (JSON)
- **Clear Data**: Delete all stored data

#### 3. About Tab
- Extension information
- How it works
- Privacy details
- Version information

### Understanding Threat Levels

| Level | Color | Meaning | Action |
|-------|-------|---------|--------|
| 0-2 | Green | Safe | No action |
| 3-4 | Yellow | Low risk | Logged |
| 5-6 | Orange | Medium risk | Monitored |
| 7-8 | Red | High risk | Child alerted (Active mode) |
| 9-10 | Dark Red | Critical | Parent notified immediately |

---

## 🔧 Troubleshooting

### Extension Not Working

**Problem**: Extension icon shows but doesn't monitor

**Solutions**:
1. Check if Gemini Nano is downloaded:
   - Go to `chrome://components/`
   - Verify "Optimization Guide On Device Model" is up-to-date

2. Verify permissions:
   - Go to `chrome://extensions/`
   - Find SafeGuard Kids
   - Check "Site access" is set to "On all sites"

3. Check console for errors:
   - Right-click extension icon → "Inspect popup"
   - Look for errors in Console tab

### No Threats Detected

**Problem**: Test scenarios don't trigger alerts

**Solutions**:
1. Open Chrome DevTools (F12) on the test page
2. Check Console for logs starting with `[SafeGuard Kids]`
3. Verify monitoring is enabled in Settings
4. Make sure you're testing on a supported platform

### Prompt API Not Available

**Problem**: AI analysis shows "unavailable"

**Solutions**:
1. Verify Chrome version 127+
2. Confirm Gemini Nano flags are enabled
3. Wait for model download to complete
4. Check system requirements:
   - 22GB free disk space
   - 4GB+ GPU VRAM or 16GB+ RAM
   - Supported OS (Windows 10+, macOS 13+, Linux)

### Password Reset

**Problem**: Forgot parent password

**Solutions**:
1. Open Chrome DevTools
2. Go to Application → Storage → Local Storage
3. Find SafeGuard Kids extension
4. Delete the `parentPassword` key
5. Reload extension
6. Complete first-time setup again

---

## 🔐 Privacy & Data

### What Data is Stored?

**Locally in Chrome Storage**:
- Conversation logs (last 7 days)
- Threat detections
- Parent settings
- Parent password (hashed - coming soon)

**Not Stored**:
- No cloud uploads
- No external API calls
- No tracking or analytics

### Where is Data Stored?

All data is stored locally using Chrome's Storage API:
- Location: Chrome's local extension storage
- Access: Only the extension and parent (with password)

### Data Retention

- Conversation logs: 7 days (automatic cleanup)
- Threat alerts: Until manually cleared
- Settings: Until extension uninstalled

### Clearing Data

**From Dashboard**:
1. Go to Settings tab
2. Scroll to "Data Management"
3. Click "Clear All Data"
4. Confirm deletion

**Complete Reset**:
1. Go to `chrome://extensions/`
2. Find SafeGuard Kids
3. Click "Remove"
4. Reinstall extension

---

## 📱 Platform Support

### Fully Supported ✅

- Facebook (facebook.com)
- Messenger (messenger.com)
- Instagram (instagram.com)
- WhatsApp Web (web.whatsapp.com)
- Discord (discord.com)
- Twitter/X (twitter.com, x.com)

### Partially Supported ⚠️

- TikTok (tiktok.com) - Web version only
- Snapchat (web.snapchat.com) - Limited web features

### Not Supported ❌

- Mobile apps (extension is Chrome-only)
- Native desktop apps
- Encrypted messaging (Signal, Telegram)

---

## 🆘 Support & Help

### Getting Help

1. **Check Documentation**
   - README.md
   - This SETUP.md file

2. **Common Issues**
   - See Troubleshooting section above

3. **Report Bugs**
   - GitHub Issues: [Link to repo]
   - Include:
     - Chrome version
     - Extension version
     - Steps to reproduce
     - Console error logs

### Emergency Contacts

**If you discover a real threat to a child**:
- 🇺🇸 USA: Call 911 or National Center for Missing & Exploited Children: 1-800-843-5678
- 🇬🇧 UK: Call 999 or CEOP: https://www.ceop.police.uk/safety-centre/
- 🌍 International: Contact local law enforcement immediately

**This extension is a tool, not a substitute for:**
- Parental supervision
- Conversations about online safety
- Professional help when needed

---

## 📚 Additional Resources

### For Parents

- [NetSmartz Online Safety Resources](https://www.missingkids.org/netsmartz)
- [Common Sense Media](https://www.commonsensemedia.org/)
- [FBI's Parent Guide to Internet Safety](https://www.fbi.gov/resources/parents)

### For Developers

- [Chrome Prompt API Docs](https://developer.chrome.com/docs/ai/prompt-api)
- [TensorFlow.js Toxicity Model](https://github.com/tensorflow/tfjs-models/tree/master/toxicity)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)

---

## ✅ Quick Start Checklist

- [ ] Chrome 127+ installed
- [ ] Gemini Nano flags enabled
- [ ] Model downloaded (check `chrome://components/`)
- [ ] Extension loaded from `chrome://extensions/`
- [ ] Extension pinned to toolbar
- [ ] Parent password created
- [ ] Parent email configured
- [ ] Monitoring mode selected
- [ ] Tested with demo page
- [ ] Verified threats are detected
- [ ] Dashboard accessible

---

**You're all set! SafeGuard Kids is now protecting your child online.**

For questions or issues, refer to the Troubleshooting section or contact support.

🛡️ **Stay safe online!**
