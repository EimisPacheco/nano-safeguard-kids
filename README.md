# 🛡️ SafeGuard Kids

**AI-Powered Parental Control Chrome Extension**

Protect children from online predators and inappropriate content using Chrome's built-in AI (Gemini Nano) and TensorFlow.js.

Created for the **Google Chrome Built-in AI Challenge 2025**.

---

## 🎯 Problem Statement

Every day, children and teenagers face serious dangers online:

- **Predators** pretending to be peers to gain trust
- **Grooming** behavior leading to exploitation
- **Inappropriate content** and sexual solicitation
- **Requests for personal information** (address, school, photos)
- **Meeting requests** from strangers

Parents cannot monitor every conversation, and children often don't recognize danger until it's too late.

## 💡 Solution

SafeGuard Kids is a Chrome extension that uses **advanced AI** to analyze conversations in real-time and detect predatory behavior, grooming patterns, and inappropriate content.

### Two Monitoring Modes:

1. **Active Mode** - Immediately warns the child when dangerous content is detected
2. **Passive Mode** - Silent monitoring with parent notifications

---

## ✨ Features

### 🤖 AI-Powered Analysis with Function Calling
- **Chrome Prompt API (Gemini Nano)** with **Function Calling** & **Multimodal Capabilities** - AI agents use specialized tools for advanced threat detection
- **6 Specialized AI Tools:**
  - `checkGroomingPattern` - Identifies grooming stages with STRONG indicators (trust building, isolation, sexualization)
  - `extractPersonalInfo` - Detects PII sharing (phone, address, school)
  - `analyzeSentiment` - Spots emotional manipulation tactics (guilt, pressure, coercion)
  - `assessThreatLevel` - Weighted threat scoring algorithm
  - `generateParentGuidance` - Specific actions by threat type (includes NCMEC hotline)
  - `createChildWarning` - Age-appropriate warnings
- **TensorFlow.js Toxicity Model** - Detects 7 types of toxic content
- **Multimodal Image Analysis** - Vision AI describes images, safety agent evaluates appropriateness
- **Balanced Detection System** - Single indicators = safe, multiple indicators combined = threat

### 🔍 Multi-Layered Threat Detection

**Balanced Detection System:**
- ✅ **Single indicators ALONE = SAFE**: "hello", "how are you", "you're nice" won't trigger false alarms
- ⚠️ **Multiple indicators COMBINED = THREAT**: "you're mature" + "our secret" + "don't tell parents" + "meet up" = CRITICAL
- 🎯 **Combination Logic**: Simple greeting alone = safe, BUT greeting + isolation tactics + meeting request = immediate flag
- 📊 **Examples in Prompts**: AI receives explicit patterns: `"You're special/mature" + "our secret" + "don't tell parents" + "meet up" = GROOMING (9-10)`

**What it detects:**
- Sexual explicit content (CRITICAL 9-10)
- Grooming patterns with multiple indicators (CRITICAL 9-10)
- Personal information requests (HIGH 7-8)
- Meeting arrangements from non-family (HIGH 7-8)
- Manipulation tactics (HIGH 7-8)
- Age-inappropriate conversations (MEDIUM 5-6)

### 🚨 Smart Alerting
- Real-time danger assessment (0-10 scale)
- Immediate warnings for critical threats
- **Email notifications** via Resend API (real emails sent to parents)
- **SMS alerts** via Vonage API (real text messages sent to parents)
- Configurable notification thresholds (Medium/High/Critical)
- Test notification feature to verify configuration
- Detailed threat logs and analytics

### 🌐 Platform Support
- Facebook & Messenger
- Instagram
- WhatsApp Web
- Discord
- Twitter/X
- TikTok
- Snapchat Web

### 🔒 Privacy-First
- All AI processing happens **locally** using Chrome's built-in Gemini Nano
- No conversation data sent to external servers
- Parent-only access with password protection

---

## 🏗️ Technical Architecture

### Agent-Based AI Architecture

```
User Message/Image
     ↓
┌────────────────────────────────────────────────┐
│  Content Script (monitor.js)                   │
│  - Captures messages and images                │
│  - Runs TensorFlow.js toxicity detection       │
│  - Sends to Service Worker                     │
└────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────┐
│  Service Worker - Agent Orchestration          │
└────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────┐
│  TEXT FLOW:                                    │
│  1. AGENT 1: Individual message analysis       │
│     (combines with TensorFlow via OR logic)    │
│  2. Store in Conversation Memory (max 20)      │
│  3. IF flagged → AGENT 4: Final coordinator    │
└────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────┐
│  IMAGE FLOW:                                   │
│  1. AGENT 2: Describe image (no judgement)     │
│  2. AGENT 3: Assess safety from description    │
│  3. IF flagged → AGENT 4: Final coordinator    │
└────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────┐
│  AGENT 4 (Only if reporters flag):             │
│  - Gathers all available information           │
│  - Makes final threat assessment               │
│  - Determines action required                  │
│  - Stores incident (with 10MB limit management)│
└────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────┐
│  Action Based on Mode:                         │
│  - Active: Show warning to child               │
│  - Passive/Active: Email + SMS to parent       │
│  - Log incident to Chrome Storage              │
└────────────────────────────────────────────────┘
```

### Key Technologies

- **Chrome Prompt API** - Gemini Nano for contextual analysis
- **TensorFlow.js** - Toxicity detection model
- **Chrome Extension Manifest V3** - Modern extension architecture
- **Content Scripts** - Monitor social media platforms
- **Service Workers** - Background AI processing
- **Chrome Storage API** - Secure data storage

---

## 📦 Installation

### Prerequisites

1. **Chrome Browser** (version 127+)
2. **Node.js** (version 18+) for building
3. **Gemini Nano** model:
   - Go to `chrome://flags/`
   - Enable `#prompt-api-for-gemini-nano`
   - Enable `#optimization-guide-on-device-model` → "Enabled BypassPerfRequirement"
   - Restart Chrome
   - Go to `chrome://components/`
   - Find "Optimization Guide On Device Model" → Click "Check for update"
   - Wait for download (~1.5GB)

### Install Extension

1. Clone and build:
   ```bash
   git clone https://github.com/yourusername/safeguard-kids.git
   cd safeguard-kids
   npm install
   npm run build
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `safeguard-kids` directory

3. Complete setup:
   - Click the extension icon
   - Create a parent password
   - Enter parent email and Resend API key (optional: for email notifications)
   - Enter parent phone and Vonage credentials (optional: for SMS alerts)
   - Choose Active or Passive mode

4. Configure notifications (optional):
   - **Email**: Get a free API key from [Resend](https://resend.com/api-keys)
   - **SMS**: Get free credentials from [Vonage](https://dashboard.nexmo.com/settings)
   - Without API keys, notifications will be simulated (logged only)

---

## 🎮 Usage

### For Parents

1. **Initial Setup**
   - Install the extension
   - Create a secure password
   - Configure your email for alerts
   - Choose Active or Passive mode

2. **Monitor Activity**
   - Click extension icon to open dashboard
   - View threat statistics
   - Review conversation logs
   - Check notifications

3. **Respond to Alerts**
   - Critical threats trigger immediate email alerts
   - Review full conversation context
   - Export data if needed for authorities

### For Children

**Active Mode:**
- See a shield indicator showing monitoring is active
- Receive immediate warnings for dangerous conversations
- Option to request parental help

**Passive Mode:**
- No visible indication of monitoring
- Parents receive silent alerts

---

## 🧪 Testing

### Demo Page

A test HTML page is included for testing the extension without using real social media:

```bash
open tests/demo-chat.html
```

This provides a simulated chat interface to test:
- Message monitoring
- Threat detection
- Alert popups
- Image analysis

### Test Scenarios

1. **Safe Message Test** (Balanced Detection)
   - Type: "hey long time no see, how have you been?"
   - Expected: ✅ SAFE - Single friendly phrase, no other indicators

2. **Critical Grooming Test** (Multiple Indicators)
   - Type: "You're so special and mature for your age, not like other kids. I really understand you. This is our secret, okay? Don't tell your parents about our chats, they just won't understand our connection. Want to meet up this weekend? I'll pick you up."
   - Expected: ⚠️ CRITICAL (9-10) - Multiple indicators: flattery + secrecy + isolation + meeting request
   - AI detects: trustBuilding, isolation, sexualization stages
   - Parent notification: "CALL POLICE IMMEDIATELY (911)"

3. **Sexual Content Test**
   - Type: "Send me nude pictures"
   - Expected: ⚠️ CRITICAL (9-10) - Explicit sexual solicitation
   - Immediate alert to parent and child

4. **Personal Info Test**
   - Type: "What's your address? I want to send you something"
   - Expected: ⚠️ HIGH (7-8) - Personal information request

5. **Image Analysis Test**
   - Upload inappropriate image
   - Expected: Agent 2 describes → Agent 3 evaluates → Alert if inappropriate
   - Note: Profile pictures (< 300px) are automatically filtered out

---

## 🏆 Hackathon Submission

### Innovation

- **First-of-its-kind** parental control using Chrome's built-in AI
- **Hybrid AI approach** combining three detection methods
- **Privacy-focused** with local AI processing
- **Real-world impact** protecting children from real dangers

### Chrome Built-in AI Usage

✅ **Prompt API** - Primary analysis engine (40% weight)
- Contextual conversation understanding
- Grooming pattern detection
- Age-appropriateness assessment

✅ **Multimodal Input** - Image analysis
- Inappropriate photo detection
- Personal information in images

✅ **Structured Output** - JSON responses for threat assessment

### Bonus: Hybrid AI

✅ Combines:
- Chrome Prompt API (Gemini Nano)
- TensorFlow.js Toxicity Model
- Custom Pattern Detection

---

## 📊 Detection Capabilities

### Text Analysis

| Category | Examples | Danger Level |
|----------|----------|--------------|
| Sexual Content | "send nudes", explicit language | Critical (9-10) |
| Meeting Requests | "let's meet up", "I'll pick you up" | High (7-9) |
| Personal Info | "where do you live", "what school" | Medium-High (6-8) |
| Grooming | "you're special", "our secret" | Medium-High (6-8) |
| Manipulation | "if you loved me", "prove it" | Medium (5-7) |
| Age Inappropriate | "mature for your age" | Medium (5-6) |

### Grooming Stages Detection

The extension recognizes the 5 stages of grooming:

1. ✅ **Friendship forming** - Compliments, shared interests
2. ✅ **Building trust** - Secrets, understanding
3. ✅ **Assessment** - Testing boundaries
4. ✅ **Isolation** - Moving to other platforms
5. ✅ **Sexualization** - Inappropriate content

When 3+ stages detected → High priority alert

---

## 🔐 Privacy & Security

### Data Storage
- All data stored **locally** using Chrome Storage API
- Conversation logs kept for 7 days (configurable)
- Parent can export or delete data anytime

### Security Features
- Password-protected parent dashboard
- No external API calls for AI analysis
- No tracking or analytics
- Open source and auditable

### Compliance
- COPPA compliant (designed for children 13 and under)
- GDPR friendly (local processing, user control)
- Transparent data usage

---

## 🛠️ Configuration

### Parent Dashboard Settings

- **Monitoring Mode**: Active vs Passive
- **Enable/Disable**: Turn monitoring on/off
- **Parent Email**: For critical alerts
- **Resend API Key**: Enable real email notifications ([Get free key](https://resend.com/api-keys))
- **Parent Phone**: For SMS alerts (E.164 format: +1234567890)
- **Vonage Credentials**: Enable real SMS notifications ([Get free account](https://dashboard.nexmo.com/settings))
- **Email/SMS Thresholds**: Configure when to send notifications (Medium/High/Critical)
- **Password Protection**: Change password anytime
- **Data Management**: Export or clear all data
- **Test Notifications**: Send test email/SMS to verify configuration

### Threat Sensitivity

Configured in `config/platforms.json`:

```json
{
  "dangerScoring": {
    "low": { "threshold": 3, "action": "log" },
    "medium": { "threshold": 5, "action": "monitor" },
    "high": { "threshold": 7, "action": "alert_child" },
    "critical": { "threshold": 9, "action": "alert_parent_immediately" }
  }
}
```

---

## 📁 Project Structure

```
safeguard-kids/
├── manifest.json                      # Extension configuration
├── package.json                       # Dependencies
│
├── src/
│   └── service-worker.js             # All agents + storage manager (42KB)
│
├── background/
│   └── service-worker.js             # Built bundle (28KB)
│
├── content/
│   ├── monitor.js                    # Social media monitoring + TensorFlow
│   ├── page-monitor.js               # Webpage monitoring + blur
│   └── styles.css                    # Warning popup styles
│
├── popup/
│   ├── parent-dashboard.html         # Parent dashboard UI
│   ├── parent-dashboard.js           # Dashboard logic
│   └── styles.css                    # Dashboard styles
│
├── config/
│   └── platforms.json                # Platform-specific selectors
│
└── assets/
    └── icons/                        # Extension icons (16, 32, 48, 128)
```

### Key Files:

- **`src/service-worker.js`** - All 4 agents + ConversationMemory + StorageManager
- **`content/monitor.js`** - TensorFlowAnalyzer + social media monitoring
- **`content/page-monitor.js`** - General webpage content monitoring
- **`config/platforms.json`** - CSS selectors for each platform

---

## 🐛 Development & Debugging

### Console Logging

For development and debugging, SafeGuard Kids uses **unified console logging** across both the test chatbot simulator and Facebook monitoring. This ensures consistent debugging experience:

**Text Analysis Logging Format:**
```
═══════════════════════════════════════════════════════════════════
📤 SENT MESSAGE   (or 📥 RECEIVED MESSAGE)
═══════════════════════════════════════════════════════════════════
Message: [message text]
Timestamp: [HH:MM AM/PM]
Type: sent
───────────────────────────────────────────────────────────────────
📨 Sending SENT message to SafeGuard for analysis...
✅ SafeGuard Analysis Results for SENT MESSAGE: [response object]
   Text analyzed: [message text]
   Threat level: [0-10]
═══════════════════════════════════════════════════════════════════
```

**Image Analysis Logging Format:**
```
═══════════════════════════════════════════════════════════════════
📤 SENT IMAGE   (or 📥 RECEIVED IMAGE)
═══════════════════════════════════════════════════════════════════
Image URL: [url]
Image dimensions: [width]x[height]
Timestamp: [HH:MM AM/PM]
───────────────────────────────────────────────────────────────────
SafeGuard Image Analysis Results: [response object]
═══════════════════════════════════════════════════════════════════
```

**Key Features:**
- **Consistent separators**: `═══` for major sections, `───` for subsections
- **Visual indicators**: 📤 sent, 📥 received, 📨 processing, ✅ success, ❌ error
- **Detailed results**: Full response objects, threat levels, and analyzed text
- **Clean formatting**: Empty lines before/after for readability
- **Cross-platform consistency**: Test chatbot and Facebook use identical format

This makes debugging and testing consistent whether you're using the test chatbot simulator (`tests/chat-simulator.html`) or testing on real Facebook conversations.

---

## 🚀 Future Enhancements

- [x] Real email integration (Resend API)
- [x] Real SMS integration (Vonage API)
- [ ] Browser notification sound alerts
- [ ] WhiteList/BlackList keywords
- [ ] ML model training on detected threats
- [ ] Export reports for law enforcement
- [ ] Multi-language support
- [ ] Mobile browser support
- [ ] Parental dashboard web app
- [ ] Anonymous threat sharing database

---

## 🤝 Contributing

This project was created for the Google Chrome Built-in AI Challenge 2025, but contributions are welcome!

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Make changes
4. Test in Chrome
5. Submit pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## ⚠️ Disclaimer

This extension is a protective tool but **not a substitute** for parental supervision and education.

- Always talk to your children about online safety
- Monitor their internet usage
- Contact local authorities if you discover real threats
- For emergencies, call your local emergency number

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/safeguard-kids/issues)
- **Email**: your.email@example.com
- **Emergency**: Contact local law enforcement

---

## 🙏 Acknowledgments

- Google Chrome team for the built-in AI APIs
- TensorFlow.js team for the toxicity model
- All organizations fighting to protect children online

---

## 📹 Demo Video

[Link to demo video - to be added]

---

**Built with ❤️ to protect children online**

*Google Chrome Built-in AI Challenge 2025*
