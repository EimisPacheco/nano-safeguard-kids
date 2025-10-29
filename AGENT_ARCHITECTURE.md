# SafeGuard Kids - Agent-Based AI Architecture

## Overview

SafeGuard Kids uses a sophisticated **multi-agent architecture** where specialized AI agents work together to protect children online. Each agent has a specific role, and they only collaborate when threats are detected.

---

## Agent Roles

### AGENT 1: Individual Text Message Analysis
**Purpose:** Analyze individual text messages for inappropriate content
**Technology:** Chrome Prompt API (Gemini Nano) with **Function Calling** + TensorFlow.js
**Role:** REPORTER (can trigger AGENT 4)

**Function:**
- Analyzes each text message independently
- Uses **3 specialized AI tools** via Prompt API function calling
- Dynamic prompting based on message type (sent vs. received)
- Combines with TensorFlow.js toxicity detection via **OR logic**
- If EITHER AGENT 1 OR TensorFlow flags inappropriate → triggers AGENT 4

**🔧 Specialized Tools (Function Calling):**

1. **`checkGroomingPattern`** - Identifies grooming stages with STRONG indicators only
   - Trust Building: "trust me/our secret/don't tell/between us/special friend/this is our secret"
   - Desensitization: "it's normal/everyone does/nothing wrong with it/just pictures/don't worry about it"
   - Isolation: "parents don't understand/don't tell anyone/they won't get it/keep this between us/our little secret"
   - Sexualization: "send pic/send photo/show me/nudes/naked/meet up alone/come over when no one's home/alone together"
   - Returns: `{ groomingDetected: true/false, stages: [...], severity: "high|medium|none" }`

2. **`extractPersonalInfo`** - Detects PII sharing
   - Phone numbers: `\d{3}[-.]?\d{3}[-.]?\d{4}`
   - Email addresses: `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}`
   - Physical addresses: Street/Ave/Rd/Dr patterns
   - School names: "school named/called..."
   - Age mentions: "i'm/i am/age [number]"
   - Returns: `{ piiFound: true/false, types: [...], riskLevel: "critical|high|low" }`

3. **`analyzeSentiment`** - Spots STRONG emotional manipulation only
   - Guilt: "thought you cared about me/thought we were special friends/so disappointed in you"
   - Pressure: "do it right now/send it now/hurry up and send/don't be a baby/come on send it"
   - Flattery (sexual): "so sexy/so hot/send me sexy pics/show me your body/you're so attractive send"
   - Coercion: "if you really cared/prove you like me/or else/you owe me"
   - Returns: `{ manipulationDetected: true/false, tactics: [...], severity: "high|medium|none" }`

**Balanced Detection System:**
- **Single indicators ALONE = SAFE**: "hello", "how are you", "you're nice" = safe
- **Multiple indicators COMBINED = FLAG**: "you're mature" + "our secret" + "don't tell parents" + "meet up" = GROOMING (CRITICAL 9-10)
- **Explicit examples in prompts**: Provides AI with clear patterns of what constitutes grooming
- **Combination logic**: Simple greeting ALONE = safe, BUT greeting + isolation tactics + meeting request = FLAG IMMEDIATELY

**What it detects:**
- Sexual content or solicitation (CRITICAL 9-10)
- Grooming tactics with MULTIPLE indicators (CRITICAL 9-10)
- Personal information requests (HIGH 7-8)
- Meeting arrangements from non-family (HIGH 7-8)
- Emotional manipulation or coercion (HIGH 7-8)
- Age-inappropriate conversations (MEDIUM 5-6)

**Output:**
```javascript
{
  isInappropriate: true/false,
  level: 0-10,
  category: "sexual_content|grooming|personal_info_request|...",
  explanation: "brief explanation based on tool results",
  redFlags: ["flag1", "flag2"],
  source: "AGENT 1 + TensorFlow"
}
```

---

### TensorFlow.js Toxicity Detection
**Purpose:** Detect toxic content using ML model
**Technology:** TensorFlow.js Toxicity Model (runs in content script)
**Role:** REPORTER (can trigger AGENT 4)

**Function:**
- Runs in content script (not service worker - tensor operations unavailable there)
- Classifies text into 7 toxicity categories
- Results sent to service worker and combined with AGENT 1 via OR logic

**7 Toxicity Categories:**
1. `sexual_explicit` (level 9)
2. `severe_toxicity` (level 8)
3. `threat` (level 7)
4. `obscene` (level 6)
5. `identity_attack` (level 6)
6. `insult` (level 5)
7. `toxicity` (level 5)

**Output:**
```javascript
{
  isToxic: true/false,
  level: 0-10,
  detectedTypes: [
    { type: "sexual_explicit", probability: 0.98, level: 9 }
  ],
  source: "TensorFlow.js Toxicity Model (v1.2.2)"
}
```

---

### Conversation Memory (Not an Agent)
**Purpose:** Store conversation context
**Technology:** Simple JavaScript array
**Role:** MEMORY STORAGE

**Function:**
- Stores last 20 messages (FIFO)
- When message #21 arrives, oldest message is deleted
- No Chrome Prompt API needed (just runtime memory)
- Provides context to AGENT 4 when needed

**Structure:**
```javascript
{
  messages: [
    {
      text: "message content",
      type: "sent|received",
      timestamp: 1234567890,
      platform: "instagram"
    }
  ],
  maxMessages: 20
}
```

---

### AGENT 2: Image Description
**Purpose:** Describe what an image contains
**Technology:** Chrome Prompt API (Gemini Nano) with multimodal input (`expectedInputs: [{ type: "image" }]`)
**Role:** INFORMATION GATHERER (not a reporter)

**Function:**
- Receives image from content script (after intelligent filtering)
- Converts data URLs to blobs for multimodal input: `await fetch(imageSrc).then(r => r.blob())`
- Uses multimodal Prompt API to "see" the image
- Provides PURE DESCRIPTION with ZERO judgement
- NO evaluation of appropriateness
- Output goes to AGENT 3 ONLY

**Image Filtering (Content Script):**
Before sending to AGENT 2, content script filters out:
- Profile pictures: < 300px width/height from external CDN URLs (`scontent-*.fbcdn.net`)
- UI elements: Images with profile-specific classes (`x1rg5ohu`, `x5yr21d`)
- Prioritizes: Base64-encoded message images (`data:image/...`)
- Uses: `naturalWidth`/`naturalHeight` for accurate dimensions (not `width`/`height` which can be 0 before loading)
- Waits: For image load events if not yet loaded (`img.complete` check)

**Prompt:**
```
Describe this image in detail. Focus on:
- What objects, people, or scenes are visible
- Any text or symbols present
- The setting or environment
- Colors, composition, and visual elements

Provide a purely factual, objective description with NO judgement,
evaluation, or assessment of appropriateness. Just describe what you see.
```

**Output:**
```javascript
{
  description: "A person wearing a white shirt standing in a park...",
  imageType: "sent|received",
  source: "AGENT 2",
  timestamp: 1234567890
}
```

---

### AGENT 3: Image Safety Assessment
**Purpose:** Evaluate if image is appropriate for a child
**Technology:** Chrome Prompt API (Gemini Nano)
**Role:** REPORTER (can trigger AGENT 4)

**Function:**
- Receives **ONLY** the description from AGENT 2 (not the image itself)
- Evaluates appropriateness based on description
- Different prompts for sent vs. received images
- If inappropriate → triggers AGENT 4

**Input:** AGENT 2's description ONLY
**Output:**
```javascript
{
  isInappropriate: true/false,
  level: 0-10,
  category: "sexual_content|personal_info|self_harm|...",
  explanation: "brief explanation",
  concerningElements: ["element1", "element2"],
  source: "AGENT 3"
}
```

---

### AGENT 4: Final Coordinator
**Purpose:** Make final threat assessment when reporters flag
**Technology:** Chrome Prompt API (Gemini Nano) with **Function Calling**
**Role:** FINAL DECISION MAKER

**Function:**
- **ONLY activates if:** `(AGENT 1 OR TensorFlow) OR AGENT 3` reports inappropriate
- Uses **3 strategic AI tools** for final coordination
- Gathers ALL available information:
  - AGENT 1 result (if text message)
  - TensorFlow result (if text message)
  - Conversation memory (last 20 messages for context)
  - AGENT 2 description (if image analyzed)
  - AGENT 3 assessment (if image flagged)
- Makes final threat level determination
- Decides what action to take
- Generates parent guidance and child warning

**🔧 Strategic Tools (Function Calling):**

1. **`assessThreatLevel`** - Weighted threat scoring
   - Takes agent levels + conversation pattern count
   - Escalates +2 if 3+ concerning patterns
   - Escalates +1 if 2 concerning patterns
   - Returns final level (0-10) and severity

2. **`generateParentGuidance`** - Specific actions by threat type
   - **CRITICAL grooming:** "Contact police and NCMEC (1-800-843-5678)"
   - **HIGH sexual content:** "Talk to child immediately, report to platform"
   - **MEDIUM personal info:** "Review privacy settings together"
   - Includes next steps based on severity

3. **`createChildWarning`** - Age-appropriate warnings
   - Different messages per threat type
   - Shows "Get Help" button for CRITICAL/HIGH
   - Non-scary language for children

**Output:**
```javascript
{
  finalLevel: 0-10,
  severity: "LOW|MEDIUM|HIGH|CRITICAL",
  primaryThreat: "sexual_content|grooming|...",
  actionRequired: "immediate_parent_notification|warn_child|monitor|log_only",
  parentGuidance: "from generateParentGuidance tool - specific, actionable",
  childWarning: "from createChildWarning tool - age-appropriate",
  reporterResults: { /* all agent results */ },
  conversationContext: [ /* last 5 messages */ ]
}
```

---

## Flow Diagrams

### Text Message Flow

```
Text Message from Content Script
  ↓
Content Script: Run TensorFlow analysis
  ↓
Send to Service Worker:
  { text, type, platform, tensorflowResult }
  ↓
┌─────────────────────────────────────┐
│ Service Worker Receives Message     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 1. Store in Conversation Memory     │
│    (max 20, FIFO)                   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 2. AGENT 1: Analyze message         │
│    + TensorFlow result (OR logic)   │
└─────────────────────────────────────┘
  ↓
Is inappropriate?
  │
  ├─ NO → Return safe response, done
  │
  └─ YES → Continue
      ↓
┌─────────────────────────────────────┐
│ 3. AGENT 4: Final Coordinator       │
│    Gathers:                         │
│    - AGENT 1 result                 │
│    - TensorFlow result              │
│    - Conversation memory (20 msgs)  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 4. Storage Manager:                 │
│    - Check 10MB limit               │
│    - Cleanup if > 80%               │
│    - Store incident                 │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 5. Take Action:                     │
│    - Active Mode: Show warning      │
│    - Send email to parent           │
│    - Send SMS to parent             │
└─────────────────────────────────────┘
```

### Image Message Flow

```
Image Sent/Received from Content Script
  ↓
Send to Service Worker:
  { imageSrc, imageType, platform }
  ↓
┌─────────────────────────────────────┐
│ 1. AGENT 2: Describe Image          │
│    Uses multimodal Prompt API       │
│    NO judgement - pure description  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 2. AGENT 3: Assess Safety           │
│    Receives ONLY AGENT 2 description│
│    Evaluates appropriateness        │
└─────────────────────────────────────┘
  ↓
Is inappropriate?
  │
  ├─ NO → Return safe response, done
  │
  └─ YES → Continue
      ↓
┌─────────────────────────────────────┐
│ 3. AGENT 4: Final Coordinator       │
│    Gathers:                         │
│    - AGENT 2 description            │
│    - AGENT 3 assessment             │
│    - Conversation memory (context)  │
│    - AGENT 1 result (if text exists)│
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 4. Storage Manager:                 │
│    - Check 10MB limit               │
│    - Cleanup if > 80%               │
│    - Store incident                 │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 5. Take Action:                     │
│    - Active Mode: Show warning      │
│    - Send email to parent           │
│    - Send SMS to parent             │
└─────────────────────────────────────┘
```

---

## Storage Management

### Chrome Storage Strategy

**Limit:** 10MB (10,485,760 bytes)

**Thresholds:**
- 80% (8MB) → Warning, auto-cleanup of oldest 30%
- 95% (9.5MB) → Critical, keep only 50 critical incidents

**Incident Structure:**
```javascript
{
  id: timestamp,
  timestamp: "2025-01-01T12:00:00.000Z",
  type: "message|image",
  severity: "LOW|MEDIUM|HIGH|CRITICAL",
  level: 0-10,
  platform: "instagram|facebook|...",
  content: "truncated to 500 chars",
  agentResults: {
    agent1: { /* essential data only */ },
    agent2: { /* essential data only */ },
    agent3: { /* essential data only */ },
    agent4: { /* essential data only */ },
    tensorflow: { /* essential data only */ }
  },
  actionTaken: "warn_child|parent_notification|...",
  emailSent: true/false,
  smsSent: true/false
}
```

**Auto-Cleanup Logic:**
1. Before each write, check storage size
2. If > 80%, delete oldest 30% of incidents
3. If > 95%, keep only 50 most critical incidents (level 7+)
4. Set sync storage flag: `storageLimitReached: true`
5. Update dashboard to show storage warning

**Priority Retention:**
- CRITICAL (9-10): Keep as long as possible
- HIGH (7-8): Keep for 7 days or until 80% limit
- MEDIUM (5-6): Keep for 3 days or until 80% limit
- LOW (<5): Don't store (runtime logs only)

---

## Advantages of Agent Architecture

### 1. Efficiency
- Agents only run when needed
- AGENT 4 only activates if reporters flag
- No wasted API calls on safe content
- Conversation memory uses simple array (no Prompt API sessions)

### 2. Modularity
- Each agent has single responsibility
- Easy to update individual agents
- Can disable/enable agents independently
- Clear separation of concerns

### 3. Scalability
- Agents run independently
- No session management complexity
- Memory freed immediately after use
- Storage auto-manages 10MB limit

### 4. Accuracy
- AGENT 2 provides unbiased descriptions
- AGENT 3 evaluates based on facts
- AGENT 4 has full context from all sources
- OR logic ensures nothing is missed

### 5. Explainability
- Each agent's decision is logged
- Parents see what each agent detected
- Chain of reasoning is transparent
- Auditability for law enforcement

---

## Resource Management

### Memory Management
- Each agent creates fresh session per analysis
- Sessions destroyed immediately after use
- Conversation memory limited to 20 messages (FIFO)
- No long-lived sessions (prevents memory leaks)

### Token Management
- Each agent has focused, concise prompts
- No need to check `inputQuota` (sessions are short-lived)
- Context provided only when needed (AGENT 4)
- Conversation memory stored in array (no tokens used)

### Storage Management
- Automatic monitoring of 10MB Chrome Storage limit
- Auto-cleanup at 80% capacity
- Priority-based retention (critical incidents kept longer)
- Sync storage flag for parent notification

---

## Code Structure

```
src/
  ├── agents.js                    # All agent classes
  │   ├── ConversationMemory
  │   ├── Agent1_TextAnalysis
  │   ├── Agent2_ImageDescription
  │   ├── Agent3_ImageSafetyAssessment
  │   └── Agent4_FinalCoordinator
  │
  ├── storage-manager.js           # Storage management
  │   └── StorageManager
  │
  └── service-worker.js            # Main orchestration
      └── SafeGuardServiceWorker
          ├── handleTextAnalysis()
          ├── handleImageAnalysis()
          ├── takeAction()
          └── sendParentNotification()

content/
  └── monitor.js                   # Content script
      ├── TensorFlowAnalyzer       # Runs in content script
      ├── analyzeText()            # Calls TensorFlow + service worker
      └── analyzeImage()           # Sends to service worker
```

---

## Testing

### Test Scenario 1: Safe Message
```
Input: "hey what's up?"
Expected:
  - AGENT 1: level 0, safe
  - TensorFlow: not toxic
  - AGENT 4: NOT activated
  - No storage, no notification
```

### Test Scenario 2: Critical Grooming Message
```
Input: "You're so special and mature for your age, not like other kids.
        I really understand you. This is our secret, okay? Don't tell your
        parents about our chats, they just won't understand our connection.
        Want to meet up this weekend? I'll pick you up."
Expected:
  - checkGroomingPattern() detects: trustBuilding, isolation, sexualization
  - extractPersonalInfo() detects: no PII
  - analyzeSentiment() detects: flattery, isolation
  - AGENT 1: level 9-10, inappropriate (MULTIPLE indicators)
  - TensorFlow: may/may not flag (grooming can be subtle)
  - OR logic: TRUE (AGENT 1 flagged)
  - AGENT 4: ACTIVATED
  - Final level: 9-10, CRITICAL (grooming + meeting request)
  - Store incident
  - Send parent notification: "CALL POLICE IMMEDIATELY"
  - Show child warning (if Active Mode)
```

### Test Scenario 3: Safe Friendly Message
```
Input: "hey long time no see, how have you been?"
Expected:
  - checkGroomingPattern() detects: no patterns
  - extractPersonalInfo() detects: no PII
  - analyzeSentiment() detects: no manipulation
  - AGENT 1: level 0, SAFE (single friendly phrase, no other indicators)
  - TensorFlow: not toxic
  - OR logic: FALSE (neither flagged)
  - AGENT 4: NOT activated
  - No storage, no notification
```

### Test Scenario 4: Inappropriate Image
```
Input: Image with concerning content
Expected:
  - AGENT 2: Pure description (no judgement)
  - AGENT 3: level 8, inappropriate
  - AGENT 4: ACTIVATED
  - Gathers: AGENT 2 + AGENT 3 + conversation memory
  - Final level: 8, HIGH
  - Store incident
  - Send parent notification
```

### Test Scenario 5: Storage Limit
```
Condition: Storage at 85%
Expected:
  - Storage manager detects > 80%
  - Auto-cleanup removes oldest 30%
  - Sync flag set: storageLimitReached = true
  - Parent sees warning in dashboard
```

---

## Performance Metrics

**Analysis Speed:**
- AGENT 1: ~200-400ms
- TensorFlow: ~100-300ms (parallel)
- AGENT 2: ~300-500ms
- AGENT 3: ~200-400ms
- AGENT 4: ~400-600ms

**Memory Usage:**
- Conversation memory: ~50KB (20 messages)
- Per incident stored: ~5-10KB
- Max storage: 10MB (100 incidents avg)

**API Efficiency:**
- Safe content: 1 session (AGENT 1 only)
- Flagged text: 2 sessions (AGENT 1 + AGENT 4)
- Flagged image: 3 sessions (AGENT 2 + AGENT 3 + AGENT 4)

---

## Console Logging

### Unified Logging Format

Both the test chatbot simulator and Facebook monitoring use **identical console logging** for consistency and debugging:

**Text Analysis Logging:**
```javascript
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('📤 SENT MESSAGE');  // or '📥 RECEIVED MESSAGE'
console.log('═══════════════════════════════════════════════════════════════════');
console.log('Message:', text);
console.log('Timestamp:', timestamp);
console.log('Type:', type);
console.log('───────────────────────────────────────────────────────────────────');
console.log('📨 Sending SENT message to SafeGuard for analysis...');
// ... analysis happens
console.log('✅ SafeGuard Analysis Results for SENT MESSAGE:', response);
console.log('   Text analyzed:', text);
console.log('   Threat level:', response.threat ? response.threat.level : 0);
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
```

**Image Analysis Logging:**
```javascript
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('📤 SENT IMAGE');  // or '📥 RECEIVED IMAGE'
console.log('═══════════════════════════════════════════════════════════════════');
console.log('Image URL:', imageElement.src);
console.log('Image dimensions:', imageElement.width + 'x' + imageElement.height);
console.log('Timestamp:', timestamp);
console.log('───────────────────────────────────────────────────────────────────');
// ... analysis happens
console.log('SafeGuard Image Analysis Results:', response);
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
```

**Error Handling:**
```javascript
catch (error) {
  console.error('❌ SafeGuard Analysis Error:', error);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
}
```

**Key Features:**
- **Consistent separators**: `═══` for major sections, `───` for subsections
- **Emoji indicators**: 📤 sent, 📥 received, 📨 processing, ✅ success, ❌ error
- **Detailed results**: Shows text analyzed, threat level, and full response object
- **Clean formatting**: Empty lines before/after for readability
- **Identical across platforms**: Test chatbot and Facebook use exact same format

This unified logging makes debugging consistent across test environments and production.

---

**Architecture Version:** 2.2
**Last Updated:** January 3, 2025
**Status:** ✅ Implemented and Working

**Recent Updates:**
- **v2.2**: Added unified console logging format across test chatbot and Facebook monitoring
- **v2.1**: Added balanced detection system - single indicators = safe, multiple = flag
- Enhanced image filtering with naturalWidth/naturalHeight detection
- Updated function calling tools with STRONG indicator patterns
- Added explicit examples in prompts for clearer AI guidance
