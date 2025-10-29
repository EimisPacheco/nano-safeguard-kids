# 🛡️ SafeGuard Kids - Facebook/Messenger Implementation Guide

## ✅ Current Status

Your extension is **ALREADY CONFIGURED** for Facebook and Messenger! The selectors are in place and the content script is ready to monitor conversations.

## 📋 Implementation Steps

### Step 1: Verify Extension is Loaded

1. **Open Chrome** and go to `chrome://extensions/`
2. **Ensure SafeGuard Kids is enabled** (toggle should be ON)
3. **Check that it has permissions** for:
   - ✅ `https://www.facebook.com/*`
   - ✅ `https://www.messenger.com/*`

### Step 2: Test on Facebook Messenger

1. **Open Facebook Messenger**: Go to `https://www.messenger.com/` or `https://www.facebook.com/messages`
2. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac)
3. **Go to Console tab**
4. **Look for SafeGuard logs**: You should see:
   ```
   [SafeGuard] Content script loaded on: messenger.com
   [SafeGuard] Platform: Messenger
   [SafeGuard] ✓ Monitoring active
   ```

### Step 3: Test Message Detection

**Test with TEXT messages:**

1. **Select a conversation** in Messenger
2. **Type a test message** (e.g., "Hello, how are you?")
3. **Send the message**
4. **Check console** - you should see:
   ```
   [SafeGuard] Message detected: "Hello, how are you?"
   [SafeGuard] Analyzing message...
   ```

**Test with INAPPROPRIATE content:**

1. **Type a message** with inappropriate content (or use test phrases from demo)
2. **Send it**
3. **Check console** for analysis logs
4. **You should see** a warning overlay if threat level is high

### Step 4: Test Image Detection

1. **Click the photo/video button** in Messenger
2. **Upload an image**
3. **Check console** - you should see:
   ```
   [SafeGuard] Image detected
   [SafeGuard] Analyzing image...
   ```

---

## 🔧 Troubleshooting

### Issue 1: "Content script not loaded"

**Solution:**
- Reload the extension in `chrome://extensions/`
- Refresh the Facebook/Messenger page
- Check if the domain is in the manifest's `content_scripts` matches

### Issue 2: "Messages not being detected"

**Problem:** Facebook's DOM structure might have changed.

**Solution:** Inspect the DOM and update selectors

#### How to Find Current Selectors:

1. **Open Facebook Messenger**
2. **Open DevTools** (F12)
3. **Click "Select Element" tool** (top-left in DevTools)
4. **Click on a message** in Messenger
5. **Look at the HTML structure** in DevTools

**Common Facebook/Messenger selectors (2025):**

```javascript
// MESSAGE INPUT
div[contenteditable='true'][role='textbox']
div[aria-label='Message']
div[data-lexical-editor='true']

// MESSAGE CONTAINER
div[role='main']
div[aria-label='Messages']

// SENT MESSAGES (your messages)
div[dir='auto'][class*='x1lliihq']

// RECEIVED MESSAGES (other person's messages)
div[dir='auto'][class*='x193iq5w']

// IMAGES
img[src*='scontent']
div[role='img']
```

**To update selectors:**

Edit `/Users/eimis/safeguard-kids/config/platforms.json`:

```json
{
  "platforms": {
    "facebook": {
      "selectors": {
        "messageInput": [
          "YOUR_NEW_SELECTOR_HERE"
        ]
      }
    }
  }
}
```

### Issue 3: "Images not being analyzed"

**Check:**
1. Image upload is detected
2. Image source URL is captured
3. Service worker receives the image

**Debug steps:**
```javascript
// In console, check if images are detected:
document.querySelectorAll("img[src*='scontent']")
```

---

## 🎯 Expected Behavior on Facebook

### When You SEND a Message:

1. **Message is captured** before sending
2. **Analyzed by AI** in background (< 1 second)
3. **If inappropriate:**
   - Child sees warning overlay (Active mode)
   - Parent receives email/SMS notification
   - Incident logged to dashboard

### When You RECEIVE a Message:

1. **Message is detected** as soon as it appears
2. **Analyzed by AI** immediately
3. **If inappropriate:**
   - Child sees warning (Active mode)
   - Parent notified
   - Logged

### When Images are Shared:

1. **Image is detected** (sent or received)
2. **Analyzed by multimodal AI** (Gemini Nano)
3. **If inappropriate:**
   - Image is **blurred**
   - Warning overlay shown
   - Parent notified immediately

---

## 📊 Monitoring Facebook in Real-Time

### What Gets Monitored:

✅ **Text messages** (sent and received)
✅ **Images** (uploaded and received)
✅ **Conversation context** (last 20 messages stored in memory)
✅ **User interactions** (who they're chatting with)

### What is Analyzed:

🔍 **Toxicity** (via TensorFlow.js)
🔍 **Sexual content**
🔍 **Grooming patterns**
🔍 **Personal information requests**
🔍 **Meeting requests**
🔍 **Manipulation tactics**
🔍 **Image safety** (nudity, violence, inappropriate content)

---

## 🚨 Threat Detection Levels

| Level | Severity | Action | Example |
|-------|----------|--------|---------|
| 0-1 | Safe | None | Normal conversation |
| 2-3 | Slight concern | Log only | Mildly inappropriate |
| 4-6 | Moderate | Monitor | Suggestive language |
| 7-8 | **HIGH** | **Alert parent** | Sexual content, grooming |
| 9-10 | **CRITICAL** | **Immediate notification** | Explicit content, exploitation |

---

## 📱 Parent Notifications

When a threat is detected on Facebook:

### Email Notification (if configured):
```
Subject: 🚨 SafeGuard Alert: HIGH Threat Detected

Severity: HIGH (8/10)
Time: 5:30 PM
Platform: Facebook Messenger
Primary Threat: sexual_content

Parent Guidance:
This appears to be sexual exploitation. Contact local
police and NCMEC (1-800-843-5678). Do not confront
the other party. Preserve all evidence.

Incident Details:
[Message or image description]
```

### SMS Notification (if configured):
```
🚨 SafeGuard Alert: HIGH threat detected on
Facebook Messenger. Threat level: 8/10.
Check extension dashboard for details.
```

---

## 🧪 Testing Scenarios

### Test 1: Normal Conversation
**Input:** "Hey, how's your day going?"
**Expected:** ✅ No alert, logged as safe

### Test 2: Mild Inappropriate
**Input:** "You're annoying"
**Expected:** ⚠️ Low threat (2-3), logged

### Test 3: Sexual Content
**Input:** "Send me nudes"
**Expected:** 🚨 CRITICAL (9/10), parent alerted

### Test 4: Grooming Pattern
**Input:** "You're so mature for your age, don't tell your parents about us"
**Expected:** 🚨 HIGH (7-8), parent alerted

### Test 5: Personal Info Request
**Input:** "What's your address? Where do you live?"
**Expected:** ⚠️ MEDIUM (6/10), monitored

### Test 6: Inappropriate Image
**Upload:** Image with nudity or violence
**Expected:** 🔒 Blurred + parent alerted

---

## 🎮 Live Testing on Facebook

1. **Open two Facebook accounts** (or use one account and test chat)
2. **Have SafeGuard Kids installed** on the child's browser
3. **Send test messages** from the "predator" account
4. **Watch the console** for analysis logs
5. **Check parent email/SMS** for notifications
6. **Review dashboard** for logged incidents

---

## 🔐 Privacy & Security on Facebook

### What Data is Stored:

✅ **Locally in Chrome Storage** (10MB limit)
- Last 20 messages in conversation memory
- Threat incidents (limited to 100 most recent)
- Analysis results

✅ **Synced Settings** (API keys, email, phone)

### What is NOT Stored:

❌ **Not sent to external servers** (except API calls for email/SMS)
❌ **Not uploaded to cloud**
❌ **Not shared with third parties**
❌ **Not accessible by Facebook**

All AI processing happens **locally** using:
- Chrome Prompt API (Gemini Nano)
- TensorFlow.js (browser-based)

---

## 🚀 Production Deployment

### For Parents Deploying to Child's Computer:

1. **Install Chrome** on child's computer
2. **Enable Gemini Nano**:
   - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
   - `chrome://flags/#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
   - Restart Chrome
   - `chrome://components/` → Update "Optimization Guide On Device Model"

3. **Install SafeGuard Kids**:
   - Load unpacked extension
   - Set parent password
   - Configure email/SMS alerts

4. **Lock Settings**:
   - Child cannot disable extension (requires parent password)
   - Child cannot access dashboard (password protected)

5. **Monitor Silently** (Passive Mode):
   - Child doesn't see monitoring indicators
   - Parents receive all alerts
   - Or use Active Mode for visible warnings

---

## 📞 Support & Next Steps

### If It Works:
🎉 Congratulations! The extension is now protecting your child on Facebook/Messenger.

### If It Doesn't Work:
1. Check console for errors
2. Verify Facebook selectors are up to date
3. Ensure permissions are granted
4. Test with simple messages first

### Need Help?
- Check GitHub Issues
- Review console logs
- Test on demo-chat.html first
- Verify Gemini Nano is installed

---

**Built to protect children online** 🛡️

*Google Chrome Built-in AI Challenge 2025*
