/**
 * SafeGuard Kids - Service Worker (Agent-Based Architecture)
 *
 * NEW ARCHITECTURE:
 * - AGENT 1: Individual text message analysis (with TensorFlow OR logic)
 * - AGENT 2: Image description (no judgement)
 * - AGENT 3: Image safety assessment
 * - AGENT 4: Final coordinator (only runs if reporters flag)
 * - Conversation Memory: Simple array (max 20 messages, FIFO)
 * - Storage Manager: 10MB limit with auto-cleanup
 */

// Import agent classes (will be bundled by Parcel)
// For now, we'll include them inline since we're using Parcel

console.log('[SafeGuard] Service worker initializing with agent architecture...');

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT AGENT CLASSES
// ═══════════════════════════════════════════════════════════════════════════

// ConversationMemory class
class ConversationMemory {
  constructor() {
    this.messages = [];
    this.maxMessages = 20;
  }

  add(message) {
    const entry = {
      text: message.text,
      type: message.type,
      timestamp: message.timestamp || Date.now(),
      platform: message.platform
    };

    this.messages.push(entry);

    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    console.log(`[ConversationMemory] Stored message (${this.messages.length}/${this.maxMessages})`);
  }

  getAll() {
    return this.messages;
  }

  getLast(count = 10) {
    return this.messages.slice(-count);
  }

  clear() {
    this.messages = [];
  }

  getContextString() {
    return this.messages
      .map(m => `[${m.type}] ${m.text}`)
      .join('\n');
  }
}

// Agent1 class (inline for now - will be imported later)
class Agent1_TextAnalysis {
  constructor() {
    this.name = 'AGENT 1';
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (typeof LanguageModel === 'undefined') {
        console.error(`[${this.name}] ❌ LanguageModel not available`);
        this.isAvailable = false;
        return false;
      }

      const { available } = await LanguageModel.params();
      if (available === 'no') {
        console.error(`[${this.name}] ❌ Gemini Nano not ready`);
        this.isAvailable = false;
        return false;
      }

      this.isAvailable = true;
      console.log(`[${this.name}] ✓ Initialized and ready`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] ❌ Initialization failed:`, error);
      this.isAvailable = false;
      return false;
    }
  }

  async analyze(message, messageType = 'received', tensorflowResult = null) {
    if (!this.isAvailable) {
      await this.initialize();
      if (!this.isAvailable) {
        return this.getFallbackResult();
      }
    }

    try {
      console.log(`[${this.name}] Analyzing ${messageType} message with FUNCTION CALLING...`);

      // Create session with tools (function calling)
      const session = await LanguageModel.create({
        initialPrompts: [
          {
            role: "system",
            content: `You are a child safety AI agent. Analyze messages for ACTUAL predatory behavior, grooming, and inappropriate content.

CRITICAL SAFETY RULES:
1. ALWAYS flag messages with MULTIPLE strong grooming indicators (isolation + secrecy + meeting requests)
2. Common friendly phrases ALONE like "long time no see", "how are you" are safe
3. But if friendly phrases are COMBINED with: secrecy requests, isolation tactics, meeting requests, or sexual content → FLAG IMMEDIATELY

Examples of CRITICAL threats that MUST be flagged:
- "You're special/mature" + "our secret" + "don't tell parents" + "meet up" = GROOMING
- "I understand you better than your parents" + "they won't understand" = ISOLATION
- Any meeting request from non-family member = HIGH RISK

Use the available tools to help with your analysis.`
          }
        ],
        tools: [
          {
            name: "checkGroomingPattern",
            description: "Identifies ACTUAL grooming stages in a message. Only returns true if STRONG indicators are present. Grooming typically follows stages: targeting, trust building, desensitization, isolation, sexualization.",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The message to check for grooming patterns"
                }
              },
              required: ["message"]
            },
            async execute({ message }) {
              // STRICT grooming pattern detection - only strong indicators
              const patterns = {
                trustBuilding: /\b(trust me|our secret|don't tell|between us|special friend|this is our secret)\b/i,
                desensitization: /\b(it's normal|everyone does|nothing wrong with it|just pictures|don't worry about it)\b/i,
                isolation: /\b(parents don't understand|don't tell (anyone|your parents|them|mom|dad)|they won't (understand|get it)|keep this between us|our little secret|won't understand our)\b/i,
                sexualization: /\b(send pic|send photo|show me|nudes?|naked|meet up|come over|alone together|I'll pick you up)\b/i
              };

              const detected = [];
              for (const [stage, pattern] of Object.entries(patterns)) {
                if (pattern.test(message)) {
                  detected.push(stage);
                }
              }

              // Only flag as grooming if at least 1 STRONG pattern detected
              return JSON.stringify({
                groomingDetected: detected.length > 0,
                stages: detected,
                severity: detected.length >= 2 ? 'high' : detected.length === 1 ? 'medium' : 'none'
              });
            }
          },
          {
            name: "extractPersonalInfo",
            description: "Extracts and identifies personal information (PII) in a message that could put a child at risk.",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The message to scan for personal information"
                }
              },
              required: ["message"]
            },
            async execute({ message }) {
              const piiPatterns = {
                phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
                email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
                address: /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct)\b/i,
                school: /\b(?:school|high school|middle school|elementary|college|university)\s+(?:named|called)?\s*[A-Z][A-Za-z\s]+/i,
                age: /\b(?:i'm|i am|age)\s*(\d{1,2})\b/i
              };

              const found = [];
              for (const [type, pattern] of Object.entries(piiPatterns)) {
                if (pattern.test(message)) {
                  found.push(type);
                }
              }

              return JSON.stringify({
                piiFound: found.length > 0,
                types: found,
                riskLevel: found.length >= 2 ? 'critical' : found.length === 1 ? 'high' : 'low'
              });
            }
          },
          {
            name: "analyzeSentiment",
            description: "Analyzes STRONG emotional manipulation tactics in the message. Only flags clear predatory manipulation.",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The message to analyze for emotional manipulation"
                }
              },
              required: ["message"]
            },
            async execute({ message }) {
              // Only detect STRONG manipulation patterns
              const manipulationPatterns = {
                guilt: /\b(thought you cared about me|thought we were special friends|so disappointed in you|you let me down)\b/i,
                pressure: /\b(do it right now|send it now|hurry up and send|don't be a baby|come on send it)\b/i,
                flattery_sexual: /\b(so sexy|so hot|send me sexy pics|show me your body|you're so attractive send)\b/i,
                isolation: /\b(parents don't understand us|our secret relationship|they won't get it like I do|just between us two)\b/i
              };

              const detected = [];
              for (const [tactic, pattern] of Object.entries(manipulationPatterns)) {
                if (pattern.test(message)) {
                  detected.push(tactic);
                }
              }

              return JSON.stringify({
                manipulationDetected: detected.length > 0,
                tactics: detected,
                severity: detected.length >= 2 ? 'high' : detected.length === 1 ? 'medium' : 'none'
              });
            }
          }
        ]
      });

      let prompt;
      if (messageType === 'sent') {
        prompt = `Analyze this message that a CHILD is SENDING:

"${message}"

Use the available tools to help analyze:
1. Use checkGroomingPattern to see if the child is responding to grooming
2. Use extractPersonalInfo to check if they're sharing dangerous information
3. Use analyzeSentiment to see if they're being manipulated

Then determine if this is concerning. Is the child:
- Sharing inappropriate/sexual content
- Being manipulated into sending something dangerous
- Sharing personal information
- Agreeing to meet someone in person

Respond with JSON only:
{
  "isInappropriate": true/false,
  "level": 0-10,
  "category": "sexual_content|personal_info|meeting_request|manipulation|safe",
  "explanation": "brief explanation based on tool results",
  "redFlags": ["flag1", "flag2"]
}`;
      } else {
        prompt = `Analyze this message that a CHILD is RECEIVING from someone:

"${message}"

CRITICAL SAFETY RULES:
1. Simple greetings ALONE ("hello", "how are you", "long time no see") = SAFE
2. BUT if greetings are COMBINED with danger indicators → FLAG IMMEDIATELY
3. ALWAYS flag if you detect 2+ of these: isolation, secrecy, meeting request, manipulation

Use the available tools to help analyze:
1. Use checkGroomingPattern to identify grooming tactics
2. Use extractPersonalInfo to see if they're requesting personal information
3. Use analyzeSentiment to detect emotional manipulation

FLAG AS DANGEROUS if there are MULTIPLE indicators like:
- "You're special/mature" + "our secret" + "don't tell parents" = GROOMING (CRITICAL 9-10)
- Isolation tactics ("parents won't understand") + meeting request = PREDATOR (CRITICAL 9-10)
- Explicit sexual content or solicitation = CRITICAL (9-10)
- Requests for personal info (address, phone, school) = HIGH (7-8)
- Meeting requests from non-family = HIGH (7-8)
- Coercion or threats = CRITICAL (9-10)

Single vague compliment with NO other indicators = safe.

Respond with JSON only:
{
  "isInappropriate": true/false,
  "level": 0-10,
  "category": "sexual_content|grooming|personal_info_request|meeting_request|manipulation|safe",
  "explanation": "brief explanation based on tool results",
  "redFlags": ["flag1", "flag2"]
}`;
      }

      console.log(`[${this.name}] 🔧 Tools available: checkGroomingPattern, extractPersonalInfo, analyzeSentiment`);
      const response = await session.prompt(prompt);
      session.destroy();

      const analysis = this.parseResponse(response);
      const finalResult = this.combineWithTensorFlow(analysis, tensorflowResult);

      console.log(`[${this.name}] Result:`, finalResult);

      return finalResult;
    } catch (error) {
      console.error(`[${this.name}] ❌ Analysis failed:`, error);
      return this.getFallbackResult();
    }
  }

  parseResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isInappropriate: parsed.isInappropriate || false,
          level: parsed.level || 0,
          category: parsed.category || 'safe',
          explanation: parsed.explanation || '',
          redFlags: parsed.redFlags || [],
          source: this.name
        };
      }
    } catch (error) {
      console.warn(`[${this.name}] Failed to parse JSON, using fallback`);
    }

    return this.getFallbackResult();
  }

  combineWithTensorFlow(agentResult, tensorflowResult) {
    if (!tensorflowResult) {
      return {
        ...agentResult,
        tensorflowIncluded: false
      };
    }

    // OR logic: If either flags as inappropriate, result is inappropriate
    const isInappropriate = agentResult.isInappropriate || tensorflowResult.isToxic;
    const maxLevel = Math.max(agentResult.level, tensorflowResult.level || 0);

    return {
      isInappropriate: isInappropriate,
      level: maxLevel,
      category: agentResult.category,
      explanation: agentResult.explanation,
      redFlags: [...agentResult.redFlags, ...(tensorflowResult.detectedTypes?.map(t => t.type) || [])],
      source: `${this.name} + TensorFlow`,
      agentAnalysis: agentResult,
      tensorflowAnalysis: tensorflowResult,
      tensorflowIncluded: true
    };
  }

  getFallbackResult() {
    return {
      isInappropriate: false,
      level: 0,
      category: 'safe',
      explanation: 'Analysis unavailable',
      redFlags: [],
      source: `${this.name} (fallback)`
    };
  }
}

// Agent2 class
class Agent2_ImageDescription {
  constructor() {
    this.name = 'AGENT 2';
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (typeof LanguageModel === 'undefined') {
        console.error(`[${this.name}] ❌ LanguageModel not available`);
        this.isAvailable = false;
        return false;
      }

      const { available } = await LanguageModel.params();
      if (available === 'no') {
        console.error(`[${this.name}] ❌ Gemini Nano not ready`);
        this.isAvailable = false;
        return false;
      }

      this.isAvailable = true;
      console.log(`[${this.name}] ✓ Initialized and ready`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] ❌ Initialization failed:`, error);
      this.isAvailable = false;
      return false;
    }
  }

  async describeImage(imageSrc, imageType = 'received') {
    if (!this.isAvailable) {
      await this.initialize();
      if (!this.isAvailable) {
        return this.getFallbackResult();
      }
    }

    try {
      console.log(`[${this.name}] Describing ${imageType} image...`);

      // Convert data URL to blob using fetch
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      console.log(`[${this.name}] Blob created: ${blob.type}, ${blob.size} bytes`);

      // Create session with expectedInputs for image - EXACTLY like the working example
      const session = await LanguageModel.create({
        expectedInputs: [{ type: "image" }]
      });
      console.log(`[${this.name}] Session created with image input capability`);

      // Use the EXACT format from the working Chrome example
      const result = await session.prompt([
        {
          role: "user",
          content: [
            { type: "text", value: "Describe in detail what you see in this image" },
            { type: "image", value: blob }
          ]
        }
      ]);

      console.log(`[${this.name}] ✓ AI FULL DESCRIPTION:`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log(result);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('');

      session.destroy();

      return {
        description: result,
        imageType: imageType,
        source: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[${this.name}] ❌ Description failed:`, error);
      console.error(`[${this.name}] Error details:`, error.message);
      console.error(`[${this.name}] Stack:`, error.stack);
      return this.getFallbackResult();
    }
  }

  getFallbackResult() {
    return {
      description: 'Image description unavailable',
      imageType: 'unknown',
      source: `${this.name} (fallback)`,
      timestamp: Date.now()
    };
  }
}

// Agent3 class
class Agent3_ImageSafetyAssessment {
  constructor() {
    this.name = 'AGENT 3';
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (typeof LanguageModel === 'undefined') {
        console.error(`[${this.name}] ❌ LanguageModel not available`);
        this.isAvailable = false;
        return false;
      }

      const { available } = await LanguageModel.params();
      if (available === 'no') {
        console.error(`[${this.name}] ❌ Gemini Nano not ready`);
        this.isAvailable = false;
        return false;
      }

      this.isAvailable = true;
      console.log(`[${this.name}] ✓ Initialized and ready`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] ❌ Initialization failed:`, error);
      this.isAvailable = false;
      return false;
    }
  }

  async assess(agent2Result) {
    if (!this.isAvailable) {
      await this.initialize();
      if (!this.isAvailable) {
        return this.getFallbackResult();
      }
    }

    try {
      console.log(`[${this.name}] Assessing image based on description...`);

      const description = agent2Result.description;
      const imageType = agent2Result.imageType;

      const session = await LanguageModel.create();

      let prompt;
      if (imageType === 'sent') {
        prompt = `Based on this image description, assess if a CHILD sending this image is concerning:

DESCRIPTION: "${description}"

Is this image inappropriate for a child to send? Check for:
- Nudity or sexually explicit content
- Revealing clothing or suggestive poses
- Personal identifying information (documents, addresses, school uniforms)
- Self-harm indicators
- Drugs or illegal activities

Respond with JSON only:
{
  "isInappropriate": true/false,
  "level": 0-10,
  "category": "sexual_content|personal_info|self_harm|illegal_activity|safe",
  "explanation": "brief explanation",
  "concerningElements": ["element1", "element2"]
}`;
      } else {
        prompt = `Assess this image description for a CHILD receiving it. Use STRICT criteria - most images are SAFE.

DESCRIPTION: "${description}"

THREAT LEVEL SCALE (use EXACTLY these levels):
- Level 0-1: SAFE - Costumes, makeup, Halloween, cosplay, art, memes, video games, normal photos
- Level 2-3: SLIGHTLY CONCERNING - Mildly inappropriate jokes or language
- Level 4-6: MODERATE - Suggestive content but not explicit
- Level 7-8: HIGH - Clear nudity, sexual content, graphic violence, gore, real injuries
- Level 9-10: CRITICAL - Extreme sexual content, severe violence, child endangerment

CRITICAL RULES:
1. Vampire/zombie/monster makeup = Level 0 (SAFE - it's just costume makeup)
2. Halloween costumes = Level 0 (SAFE - normal for children)
3. Horror movie characters = Level 0-1 (SAFE - fantasy/entertainment)
4. Dark/gothic art or photography = Level 0-1 (SAFE - artistic expression)
5. "Unsettling" or "scary" looking people = Level 0 (SAFE - appearance doesn't mean danger)

Only flag as inappropriate (isInappropriate: true) if:
- ACTUAL nudity or sexual acts (not costume cleavage)
- REAL graphic violence/gore/injuries to people
- Illegal drugs being used
- Self-harm being performed

Respond with JSON:
{
  "isInappropriate": true/false,
  "level": 0-10,
  "category": "sexual_content|real_violence|drugs|self_harm|safe",
  "explanation": "brief explanation",
  "concerningElements": []
}

If description mentions "vampire", "fangs", "pale skin", "makeup", "costume", "edited", "fantasy" → MUST be level 0 and isInappropriate: false`;
      }

      const response = await session.prompt(prompt);
      session.destroy();

      let assessment = this.parseResponse(response);

      // FORCE CORRECTION: Override AI if it incorrectly flags costumes/makeup
      const descLower = description.toLowerCase();
      const isCostume = descLower.includes('vampire') || descLower.includes('fangs') ||
                       descLower.includes('makeup') || descLower.includes('costume') ||
                       descLower.includes('cosplay') || descLower.includes('edited') ||
                       descLower.includes('manipulated') || descLower.includes('fantasy') ||
                       descLower.includes('halloween') || descLower.includes('monster');

      if (isCostume && assessment.level > 2) {
        console.log(`[${this.name}] ⚠️  OVERRIDE: AI incorrectly flagged costume/makeup as level ${assessment.level}`);
        console.log(`[${this.name}] ✓ CORRECTING to level 0 (SAFE - costume/makeup content)`);
        assessment = {
          isInappropriate: false,
          level: 0,
          category: 'safe',
          explanation: 'Costume, makeup, or fantasy content - safe for children',
          concerningElements: [],
          source: this.name
        };
      }

      console.log(`[${this.name}] Assessment:`, assessment);

      return assessment;
    } catch (error) {
      console.error(`[${this.name}] ❌ Assessment failed:`, error);
      return this.getFallbackResult();
    }
  }

  parseResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        let assessment = {
          isInappropriate: parsed.isInappropriate || false,
          level: parsed.level || 0,
          category: parsed.category || 'safe',
          explanation: parsed.explanation || '',
          concerningElements: parsed.concerningElements || [],
          source: this.name
        };

        // VALIDATION: Ensure consistency between level, isInappropriate, and category
        // If level is high (7+), it CANNOT be "safe" category
        if (assessment.level >= 7 && assessment.category === 'safe') {
          console.warn(`[${this.name}] ⚠️  INCONSISTENCY: level ${assessment.level} marked as category 'safe' - fixing...`);
          // Since it's marked as safe, trust that and lower the level
          assessment.level = 0;
          assessment.isInappropriate = false;
          assessment.explanation = 'Corrected inconsistent assessment - marked as safe';
        }

        // If level is 0-2, it should NOT be inappropriate
        if (assessment.level <= 2 && assessment.isInappropriate === true) {
          console.warn(`[${this.name}] ⚠️  INCONSISTENCY: level ${assessment.level} marked as inappropriate - fixing...`);
          assessment.isInappropriate = false;
        }

        // If isInappropriate is false, level should be 0-3 max
        if (assessment.isInappropriate === false && assessment.level > 3) {
          console.warn(`[${this.name}] ⚠️  INCONSISTENCY: not inappropriate but level ${assessment.level} - fixing...`);
          assessment.level = Math.min(assessment.level, 2);
        }

        return assessment;
      }
    } catch (error) {
      console.warn(`[${this.name}] Failed to parse JSON, using fallback`);
    }

    return this.getFallbackResult();
  }

  getFallbackResult() {
    return {
      isInappropriate: false,
      level: 0,
      category: 'safe',
      explanation: 'Assessment unavailable',
      concerningElements: [],
      source: `${this.name} (fallback)`
    };
  }
}

// Agent4 class
class Agent4_FinalCoordinator {
  constructor() {
    this.name = 'AGENT 4';
    this.isAvailable = false;
  }

  async initialize() {
    try {
      if (typeof LanguageModel === 'undefined') {
        console.error(`[${this.name}] ❌ LanguageModel not available`);
        this.isAvailable = false;
        return false;
      }

      const { available } = await LanguageModel.params();
      if (available === 'no') {
        console.error(`[${this.name}] ❌ Gemini Nano not ready`);
        this.isAvailable = false;
        return false;
      }

      this.isAvailable = true;
      console.log(`[${this.name}] ✓ Initialized and ready`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] ❌ Initialization failed:`, error);
      this.isAvailable = false;
      return false;
    }
  }

  async coordinate(reporterResults, conversationMemory) {
    if (!this.isAvailable) {
      await this.initialize();
      if (!this.isAvailable) {
        return this.getFallbackResult(reporterResults);
      }
    }

    try {
      console.log(`[${this.name}] Coordinating final assessment with FUNCTION CALLING...`);

      const context = this.buildContext(reporterResults, conversationMemory);

      // Create session with tools for coordination
      const session = await LanguageModel.create({
        initialPrompts: [
          {
            role: "system",
            content: `You are the final coordinator for a child safety AI system. Multiple specialized agents have analyzed a situation and at least one has flagged it as concerning. Your job is to make the final assessment by synthesizing all the information and using available tools.`
          }
        ],
        tools: [
          {
            name: "assessThreatLevel",
            description: "Calculates final threat level based on multiple agent inputs and conversation context. Returns a score from 0-10.",
            inputSchema: {
              type: "object",
              properties: {
                agent1Level: {
                  type: "number",
                  description: "Threat level from AGENT 1 (0-10)"
                },
                agent3Level: {
                  type: "number",
                  description: "Threat level from AGENT 3 (0-10), if available"
                },
                conversationPatternCount: {
                  type: "number",
                  description: "Number of concerning messages in conversation history"
                }
              },
              required: ["agent1Level"]
            },
            async execute({ agent1Level, agent3Level = 0, conversationPatternCount = 0 }) {
              // Weighted scoring algorithm
              let finalLevel = Math.max(agent1Level, agent3Level);

              // Escalate if pattern detected in conversation
              if (conversationPatternCount >= 3) {
                finalLevel = Math.min(10, finalLevel + 2);
              } else if (conversationPatternCount >= 2) {
                finalLevel = Math.min(10, finalLevel + 1);
              }

              // Determine severity
              let severity;
              if (finalLevel >= 9) severity = 'CRITICAL';
              else if (finalLevel >= 7) severity = 'HIGH';
              else if (finalLevel >= 5) severity = 'MEDIUM';
              else severity = 'LOW';

              return JSON.stringify({
                finalLevel,
                severity,
                reasoning: `Based on agent levels (A1:${agent1Level}, A3:${agent3Level}) and ${conversationPatternCount} concerning patterns in conversation history`
              });
            }
          },
          {
            name: "generateParentGuidance",
            description: "Generates specific, actionable guidance for parents based on the type of threat detected.",
            inputSchema: {
              type: "object",
              properties: {
                threatType: {
                  type: "string",
                  description: "Type of threat: sexual_content, grooming, personal_info, meeting_request, manipulation, inappropriate_image"
                },
                severity: {
                  type: "string",
                  description: "Severity: LOW, MEDIUM, HIGH, CRITICAL"
                }
              },
              required: ["threatType", "severity"]
            },
            async execute({ threatType, severity }) {
              const guidance = {
                sexual_content: {
                  CRITICAL: "IMMEDIATE ACTION: This appears to be sexual exploitation. Contact local police and NCMEC (1-800-843-5678). Do not confront the other party. Preserve all evidence.",
                  HIGH: "Talk to your child immediately in a calm, supportive manner. Ask about the person they're chatting with. Consider reporting to the platform and local authorities.",
                  MEDIUM: "Have a conversation about online safety and appropriate content. Review who they're chatting with.",
                  LOW: "Monitor the conversation. Consider discussing appropriate online behavior."
                },
                grooming: {
                  CRITICAL: "IMMEDIATE ACTION: This shows advanced grooming tactics. Contact police and NCMEC (1-800-843-5678). Do not alert the predator. Document everything.",
                  HIGH: "This person may be grooming your child. Talk to your child calmly about the relationship. Report to police and the platform.",
                  MEDIUM: "Watch for grooming signs. Talk to your child about this relationship. Consider limiting contact.",
                  LOW: "Monitor the relationship. Educate your child about grooming tactics."
                },
                personal_info: {
                  CRITICAL: "Your child has shared critical personal information. Talk to them immediately. Review what was shared and consider safety implications.",
                  HIGH: "Dangerous information was shared. Talk to your child about online safety. Change passwords and review privacy settings.",
                  MEDIUM: "Remind your child not to share personal information online. Review privacy settings together.",
                  LOW: "Educate about protecting personal information online."
                },
                meeting_request: {
                  CRITICAL: "URGENT: Meeting plans detected. Talk to your child immediately. If a meeting occurred, contact police. If planned, prevent it and report.",
                  HIGH: "Someone is trying to meet your child in person. This is dangerous. Talk to your child and report to authorities.",
                  MEDIUM: "Monitor for meeting attempts. Discuss the dangers of meeting online contacts.",
                  LOW: "Educate about the risks of meeting people from online."
                },
                manipulation: {
                  HIGH: "Your child is being emotionally manipulated. Talk to them about healthy relationships and manipulation tactics.",
                  MEDIUM: "Signs of manipulation detected. Discuss healthy boundaries and manipulation tactics with your child.",
                  LOW: "Monitor for manipulation. Educate about emotional manipulation."
                }
              };

              const result = guidance[threatType]?.[severity] || `Review this ${severity} severity incident involving ${threatType}. Talk to your child about online safety.`;

              return JSON.stringify({
                guidance: result,
                nextSteps: severity === 'CRITICAL' || severity === 'HIGH' ?
                  "Consider professional help and reporting to authorities" :
                  "Continue monitoring and maintain open communication"
              });
            }
          },
          {
            name: "createChildWarning",
            description: "Creates an age-appropriate warning message for the child based on threat type.",
            inputSchema: {
              type: "object",
              properties: {
                threatType: {
                  type: "string",
                  description: "Type of threat detected"
                },
                severity: {
                  type: "string",
                  description: "Severity level"
                }
              },
              required: ["threatType", "severity"]
            },
            async execute({ threatType, severity }) {
              const warnings = {
                sexual_content: "⚠️ This conversation contains inappropriate content. Please talk to a trusted adult immediately.",
                grooming: "⚠️ This person may not have good intentions. Please show this conversation to a parent or trusted adult right away.",
                personal_info: "⚠️ Be careful about sharing personal information online. Talk to a parent about what's safe to share.",
                meeting_request: "⚠️ Never agree to meet someone from online in person. Tell a parent about this right away.",
                manipulation: "⚠️ This person may be trying to manipulate you. Please talk to a trusted adult about this conversation.",
                inappropriate_image: "⚠️ This image may not be appropriate. Please show this to a parent or trusted adult."
              };

              return JSON.stringify({
                warning: warnings[threatType] || "⚠️ This conversation may not be safe. Please talk to a parent or trusted adult.",
                showHelpButton: severity === 'CRITICAL' || severity === 'HIGH'
              });
            }
          }
        ]
      });

      const prompt = `You are the final coordinator for a child safety system. Multiple AI agents have detected concerning activity. Make the final assessment.

${context}

Use the available tools to help make your assessment:
1. Use assessThreatLevel to calculate the final threat score
2. Use generateParentGuidance to create specific guidance for the parent
3. Use createChildWarning to generate an age-appropriate warning

Based on ALL the information above and the tool results, provide a final assessment:

IMPORTANT - actionRequired field rules:
- Use "immediate_parent_notification" when finalLevel >= 7 (HIGH or CRITICAL severity) - parent MUST be notified via email/SMS immediately
- Use "warn_child" when finalLevel 5-6 (MEDIUM severity) - show warning to child
- Use "monitor" when finalLevel 3-4 (LOW-MEDIUM) - log and watch
- Use "log_only" when finalLevel 0-2 (LOW) - just record

Respond with JSON only:
{
  "finalLevel": 0-10,
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "primaryThreat": "sexual_content|grooming|personal_info|meeting_request|manipulation|inappropriate_image|safe",
  "actionRequired": "immediate_parent_notification|warn_child|monitor|log_only",
  "parentGuidance": "from generateParentGuidance tool",
  "childWarning": "from createChildWarning tool"
}`;

      console.log(`[${this.name}] 🔧 Tools available: assessThreatLevel, generateParentGuidance, createChildWarning`);
      const response = await session.prompt(prompt);
      session.destroy();

      const finalAssessment = this.parseResponse(response);

      finalAssessment.reporterResults = reporterResults;
      finalAssessment.conversationContext = conversationMemory.getLast(5);

      console.log(`[${this.name}] Final Assessment:`, finalAssessment);

      return finalAssessment;
    } catch (error) {
      console.error(`[${this.name}] ❌ Coordination failed:`, error);
      return this.getFallbackResult(reporterResults);
    }
  }

  buildContext(reporterResults, conversationMemory) {
    let context = '';

    if (reporterResults.agent1) {
      context += `AGENT 1 (Text Analysis):
- Inappropriate: ${reporterResults.agent1.isInappropriate}
- Level: ${reporterResults.agent1.level}/10
- Category: ${reporterResults.agent1.category}
- Explanation: ${reporterResults.agent1.explanation}
- Red Flags: ${reporterResults.agent1.redFlags.join(', ')}

`;
    }

    if (conversationMemory) {
      const messages = conversationMemory.getLast(10);
      context += `CONVERSATION CONTEXT (Last ${messages.length} messages):
${messages.map(m => `[${m.type}] ${m.text}`).join('\n')}

`;
    }

    if (reporterResults.agent2 && reporterResults.agent3) {
      context += `AGENT 2 (Image Description):
${reporterResults.agent2.description}

AGENT 3 (Image Safety Assessment):
- Inappropriate: ${reporterResults.agent3.isInappropriate}
- Level: ${reporterResults.agent3.level}/10
- Category: ${reporterResults.agent3.category}
- Explanation: ${reporterResults.agent3.explanation}
- Concerning Elements: ${reporterResults.agent3.concerningElements.join(', ')}

`;
    }

    return context;
  }

  parseResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          finalLevel: parsed.finalLevel || 0,
          severity: parsed.severity || 'LOW',
          primaryThreat: parsed.primaryThreat || 'safe',
          actionRequired: parsed.actionRequired || 'log_only',
          parentGuidance: parsed.parentGuidance || '',
          childWarning: parsed.childWarning || '',
          source: this.name
        };
      }
    } catch (error) {
      console.warn(`[${this.name}] Failed to parse JSON, using fallback`);
    }

    return this.getFallbackResult({});
  }

  getFallbackResult(reporterResults) {
    const maxLevel = Math.max(
      reporterResults.agent1?.level || 0,
      reporterResults.agent3?.level || 0
    );

    return {
      finalLevel: maxLevel,
      severity: maxLevel >= 7 ? 'HIGH' : maxLevel >= 5 ? 'MEDIUM' : 'LOW',
      primaryThreat: reporterResults.agent1?.category || 'unknown',
      actionRequired: maxLevel >= 7 ? 'immediate_parent_notification' : 'monitor',
      parentGuidance: 'Review the incident in the dashboard',
      childWarning: 'This conversation may not be safe. Please talk to a parent.',
      source: `${this.name} (fallback)`,
      reporterResults: reporterResults
    };
  }
}

// StorageManager class (inline)
class StorageManager {
  constructor() {
    this.STORAGE_LIMIT = 10485760; // 10MB
    this.WARNING_THRESHOLD = 0.80;
    this.CRITICAL_THRESHOLD = 0.95;
    this.MAX_INCIDENTS = 100;
    this.MAX_CONTENT_LENGTH = 500;
  }

  async checkStorageSize() {
    try {
      const data = await chrome.storage.local.get(null);
      const size = new Blob([JSON.stringify(data)]).size;
      const percentUsed = (size / this.STORAGE_LIMIT) * 100;

      return {
        used: size,
        limit: this.STORAGE_LIMIT,
        percentUsed: percentUsed,
        isNearLimit: percentUsed > (this.WARNING_THRESHOLD * 100),
        isFull: percentUsed > (this.CRITICAL_THRESHOLD * 100),
        bytesRemaining: this.STORAGE_LIMIT - size
      };
    } catch (error) {
      console.error('[StorageManager] Failed to check storage size:', error);
      return {
        used: 0,
        limit: this.STORAGE_LIMIT,
        percentUsed: 0,
        isNearLimit: false,
        isFull: false,
        bytesRemaining: this.STORAGE_LIMIT
      };
    }
  }

  async storeIncident(incident) {
    try {
      console.log('[StorageManager] Storing incident...');

      const storageStatus = await this.checkStorageSize();

      if (storageStatus.isNearLimit) {
        console.warn('[StorageManager] ⚠️ Storage at ' + storageStatus.percentUsed.toFixed(1) + '%, cleaning up...');
        await this.cleanup(storageStatus.isFull);
      }

      const { incidents = [] } = await chrome.storage.local.get(['incidents']);

      const truncatedIncident = this.truncateIncident(incident);

      incidents.push(truncatedIncident);

      if (incidents.length > this.MAX_INCIDENTS) {
        console.warn(`[StorageManager] ⚠️ Incident count exceeds ${this.MAX_INCIDENTS}, removing oldest...`);
        const toRemove = incidents.length - this.MAX_INCIDENTS;
        incidents.splice(0, toRemove);
      }

      await chrome.storage.local.set({ incidents });

      await this.updateStorageStatus();

      console.log(`[StorageManager] ✓ Incident stored (${incidents.length} total)`);

      return { success: true, incidentCount: incidents.length };
    } catch (error) {
      console.error('[StorageManager] ❌ Failed to store incident:', error);
      return { success: false, error: error.message };
    }
  }

  truncateIncident(incident) {
    return {
      id: incident.id || Date.now(),
      timestamp: incident.timestamp || new Date().toISOString(),
      type: incident.type,
      severity: incident.severity,
      level: incident.level,
      platform: incident.platform,
      content: incident.content?.slice(0, this.MAX_CONTENT_LENGTH),
      agentResults: incident.agentResults,
      actionTaken: incident.actionTaken,
      emailSent: incident.emailSent,
      smsSent: incident.smsSent
    };
  }

  async cleanup(emergencyMode = false) {
    try {
      const { incidents = [] } = await chrome.storage.local.get(['incidents']);

      if (incidents.length === 0) {
        console.log('[StorageManager] No incidents to clean up');
        return;
      }

      let keptIncidents;

      if (emergencyMode) {
        console.warn('[StorageManager] 🚨 EMERGENCY CLEANUP: Keeping only critical incidents');
        keptIncidents = incidents
          .filter(i => i.level >= 7)
          .slice(-50);
      } else {
        const keepCount = Math.floor(incidents.length * 0.7);
        keptIncidents = incidents.slice(-keepCount);
        console.log(`[StorageManager] Cleaned up ${incidents.length - keepCount} oldest incidents`);
      }

      await chrome.storage.local.set({ incidents: keptIncidents });

      await chrome.storage.sync.set({
        storageLimitReached: true,
        lastCleanup: new Date().toISOString(),
        incidentsRemoved: incidents.length - keptIncidents.length
      });

      console.log(`[StorageManager] ✓ Cleanup complete (${keptIncidents.length} incidents remaining)`);
    } catch (error) {
      console.error('[StorageManager] ❌ Cleanup failed:', error);
    }
  }

  async updateStorageStatus() {
    try {
      const status = await this.checkStorageSize();
      const { incidents = [] } = await chrome.storage.local.get(['incidents']);

      await chrome.storage.local.set({
        storageStatus: {
          used: status.used,
          limit: status.limit,
          percentUsed: status.percentUsed,
          isNearLimit: status.isNearLimit,
          isFull: status.isFull,
          incidentCount: incidents.length,
          lastUpdated: new Date().toISOString()
        }
      });

      if (status.isNearLimit) {
        await chrome.storage.sync.set({
          storageLimitReached: true,
          storagePercentUsed: Math.round(status.percentUsed)
        });
      }
    } catch (error) {
      console.error('[StorageManager] Failed to update storage status:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SERVICE WORKER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class SafeGuardServiceWorker {
  constructor() {
    // Initialize agents
    this.agent1 = new Agent1_TextAnalysis();
    this.agent2 = new Agent2_ImageDescription();
    this.agent3 = new Agent3_ImageSafetyAssessment();
    this.agent4 = new Agent4_FinalCoordinator();

    // Initialize memory and storage
    this.conversationMemory = new ConversationMemory();
    this.storageManager = new StorageManager();

    console.log('[SafeGuard] Service worker constructed with agent architecture');
  }

  async initialize() {
    try {
      // Initialize all agents
      await Promise.all([
        this.agent1.initialize(),
        this.agent2.initialize(),
        this.agent3.initialize(),
        this.agent4.initialize()
      ]);

      console.log('[SafeGuard] ✓ All agents initialized');
    } catch (error) {
      console.error('[SafeGuard] ❌ Initialization failed:', error);
    }
  }

  /**
   * Handle text message analysis
   * Flow: AGENT 1 + TensorFlow (OR logic) → If flagged → AGENT 4 → Store → Action
   */
  async handleTextAnalysis(data, sendResponse) {
    const { text, type, platform, timestamp, tensorflowResult } = data;

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🔍 TEXT MESSAGE ANALYSIS STARTED');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('📱 Platform:', platform);
      console.log('📩 Type:', type === 'sent' ? 'SENT by child' : 'RECEIVED by child');
      console.log('💬 Message:', text.slice(0, 100) + (text.length > 100 ? '...' : ''));
      console.log('⏰ Timestamp:', new Date(timestamp).toLocaleTimeString());
      console.log('───────────────────────────────────────────────────────────────────');

      // STEP 1: Store in conversation memory
      console.log('');
      console.log('📝 STEP 1: Storing message in Conversation Memory');
      this.conversationMemory.add({
        text: text,
        type: type,
        platform: platform,
        timestamp: timestamp
      });
      console.log('   ✓ Message stored (total messages in memory: ' + this.conversationMemory.messages.length + '/20)');

      // STEP 2: AGENT 1 analysis
      console.log('');
      console.log('🤖 STEP 2: AGENT 1 - Individual Message Analysis');
      console.log('   → Analyzing message with Gemini Nano...');
      if (tensorflowResult) {
        console.log('   → TensorFlow result included (OR logic):');
        console.log('      • Toxic:', tensorflowResult.isToxic);
        console.log('      • Level:', tensorflowResult.level + '/10');
        if (tensorflowResult.detectedTypes?.length > 0) {
          console.log('      • Types:', tensorflowResult.detectedTypes.map(t => t.type).join(', '));
        }
      }

      const agent1Result = await this.agent1.analyze(text, type, tensorflowResult);

      console.log('   ✓ AGENT 1 Analysis Complete:');
      console.log('      • Inappropriate:', agent1Result.isInappropriate ? '❌ YES' : '✅ NO');
      console.log('      • Level:', agent1Result.level + '/10');
      console.log('      • Category:', agent1Result.category);
      console.log('      • Explanation:', agent1Result.explanation);
      if (agent1Result.redFlags?.length > 0) {
        console.log('      • Red Flags:', agent1Result.redFlags.join(', '));
      }

      // Check if AGENT 1 or TensorFlow flagged as inappropriate
      const isReporterFlagged = agent1Result.isInappropriate;

      if (!isReporterFlagged) {
        // Safe - no further action needed
        console.log('');
        console.log('✅ RESULT: Message is SAFE');
        console.log('   → AGENT 4 will NOT be activated');
        console.log('   → No storage, no notifications');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('');
        sendResponse({ threat: null, level: agent1Result.level, safe: true });
        return;
      }

      console.log('');
      console.log('⚠️  REPORTER FLAGGED: Inappropriate content detected!');
      console.log('   → AGENT 1 (or TensorFlow) flagged as inappropriate');
      console.log('   → Activating AGENT 4 for final coordination...');

      // STEP 3: AGENT 4 final coordination
      console.log('');
      console.log('🤖 STEP 3: AGENT 4 - Final Coordinator');
      console.log('   → Gathering all available information:');
      console.log('      • AGENT 1 result: ✓');
      console.log('      • TensorFlow result: ' + (tensorflowResult ? '✓' : '✗'));
      console.log('      • Conversation memory: ✓ (' + this.conversationMemory.messages.length + ' messages)');

      const reporterResults = {
        agent1: agent1Result
      };

      const agent4Result = await this.agent4.coordinate(reporterResults, this.conversationMemory);

      console.log('   ✓ AGENT 4 Final Assessment:');
      console.log('      • Final Level:', agent4Result.finalLevel + '/10');
      console.log('      • Severity:', agent4Result.severity);
      console.log('      • Primary Threat:', agent4Result.primaryThreat);
      console.log('      • Action Required:', agent4Result.actionRequired);
      console.log('      • Parent Guidance:', agent4Result.parentGuidance);
      console.log('      • Child Warning:', agent4Result.childWarning);

      // STEP 4: Store incident
      console.log('');
      console.log('💾 STEP 4: Storage Manager - Storing Incident');
      const incident = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'message',
        severity: agent4Result.severity,
        level: agent4Result.finalLevel,
        platform: platform,
        content: text,
        agentResults: {
          agent1: agent1Result,
          agent4: agent4Result
        },
        actionTaken: agent4Result.actionRequired
      };

      console.log('   → Checking 10MB storage limit...');
      const storeResult = await this.storageManager.storeIncident(incident);

      if (storeResult.success) {
        console.log('   ✓ Incident stored successfully');
        console.log('      • Total incidents:', storeResult.incidentCount);
      } else {
        console.log('   ⚠️  Storage failed:', storeResult.error);
      }

      // STEP 5: Take action
      console.log('');
      console.log('🎬 STEP 5: Taking Action Based on Mode');
      await this.takeAction(agent4Result, incident);

      // Send response
      console.log('');
      console.log('✅ ANALYSIS COMPLETE - Sending response to content script');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

      sendResponse({
        threat: {
          level: agent4Result.finalLevel,
          severity: agent4Result.severity,
          category: agent4Result.primaryThreat,
          warning: agent4Result.childWarning,
          explanation: agent1Result.explanation
        }
      });

    } catch (error) {
      console.log('');
      console.log('❌ ERROR: Text analysis failed');
      console.error('   Error details:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle image analysis
   * Flow: AGENT 2 (describe) → AGENT 3 (assess) → If flagged → AGENT 4 → Store → Action
   */
  async handleImageAnalysis(data, sendResponse) {
    const { imageSrc, imageType, platform, timestamp } = data;

    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('🖼️  IMAGE ANALYSIS STARTED');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('📱 Platform:', platform);
      console.log('📸 Type:', imageType === 'sent' ? 'SENT by child' : 'RECEIVED by child');
      console.log('🔗 Image source:', imageSrc.slice(0, 60) + '...');
      console.log('⏰ Timestamp:', new Date(timestamp).toLocaleTimeString());
      console.log('───────────────────────────────────────────────────────────────────');

      // STEP 1: AGENT 2 - Describe image
      console.log('');
      console.log('🤖 STEP 1: AGENT 2 - Image Description (No Judgement)');
      console.log('   → Using multimodal Prompt API to describe image...');
      console.log('   → This agent only describes what it sees, no evaluation');

      const agent2Result = await this.agent2.describeImage(imageSrc, imageType);

      console.log('   ✓ AGENT 2 Description Complete:');
      console.log('      • Description:', agent2Result.description.slice(0, 150) + (agent2Result.description.length > 150 ? '...' : ''));

      // STEP 2: AGENT 3 - Assess safety
      console.log('');
      console.log('🤖 STEP 2: AGENT 3 - Image Safety Assessment');
      console.log('   → Receiving ONLY the description from AGENT 2');
      console.log('   → Evaluating appropriateness based on description...');

      const agent3Result = await this.agent3.assess(agent2Result);

      console.log('   ✓ AGENT 3 Assessment Complete:');
      console.log('      • Inappropriate:', agent3Result.isInappropriate ? '❌ YES' : '✅ NO');
      console.log('      • Level:', agent3Result.level + '/10');
      console.log('      • Category:', agent3Result.category);
      console.log('      • Explanation:', agent3Result.explanation);
      if (agent3Result.concerningElements?.length > 0) {
        console.log('      • Concerning Elements:', agent3Result.concerningElements.join(', '));
      }

      // Check if AGENT 3 flagged as inappropriate
      if (!agent3Result.isInappropriate) {
        console.log('');
        console.log('✅ RESULT: Image is SAFE');
        console.log('   → AGENT 4 will NOT be activated');
        console.log('   → No storage, no notifications');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('');
        sendResponse({ threat: null, level: agent3Result.level, safe: true });
        return;
      }

      console.log('');
      console.log('⚠️  REPORTER FLAGGED: Inappropriate image detected!');
      console.log('   → AGENT 3 flagged as inappropriate');
      console.log('   → Activating AGENT 4 for final coordination...');

      // STEP 3: AGENT 4 - Final coordination
      console.log('');
      console.log('🤖 STEP 3: AGENT 4 - Final Coordinator');
      console.log('   → Gathering all available information:');
      console.log('      • AGENT 2 description: ✓');
      console.log('      • AGENT 3 assessment: ✓');
      console.log('      • Conversation memory: ✓ (' + this.conversationMemory.messages.length + ' messages)');

      const reporterResults = {
        agent2: agent2Result,
        agent3: agent3Result
      };

      const agent4Result = await this.agent4.coordinate(reporterResults, this.conversationMemory);

      console.log('   ✓ AGENT 4 Final Assessment:');
      console.log('      • Final Level:', agent4Result.finalLevel + '/10');
      console.log('      • Severity:', agent4Result.severity);
      console.log('      • Primary Threat:', agent4Result.primaryThreat);
      console.log('      • Action Required:', agent4Result.actionRequired);
      console.log('      • Parent Guidance:', agent4Result.parentGuidance);
      console.log('      • Child Warning:', agent4Result.childWarning);

      // STEP 4: Store incident
      console.log('');
      console.log('💾 STEP 4: Storage Manager - Storing Incident');
      const incident = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'image',
        severity: agent4Result.severity,
        level: agent4Result.finalLevel,
        platform: platform,
        content: `Image (${imageType}): ${agent2Result.description.slice(0, 200)}`,
        agentResults: {
          agent2: agent2Result,
          agent3: agent3Result,
          agent4: agent4Result
        },
        actionTaken: agent4Result.actionRequired
      };

      console.log('   → Checking 10MB storage limit...');
      const storeResult = await this.storageManager.storeIncident(incident);

      if (storeResult.success) {
        console.log('   ✓ Incident stored successfully');
        console.log('      • Total incidents:', storeResult.incidentCount);
      } else {
        console.log('   ⚠️  Storage failed:', storeResult.error);
      }

      // STEP 5: Take action
      console.log('');
      console.log('🎬 STEP 5: Taking Action Based on Mode');
      await this.takeAction(agent4Result, incident);

      // Send response
      console.log('');
      console.log('✅ ANALYSIS COMPLETE - Sending response to content script');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

      sendResponse({
        threat: {
          level: agent4Result.finalLevel,
          severity: agent4Result.severity,
          category: agent4Result.primaryThreat,
          warning: agent4Result.childWarning,
          explanation: agent3Result.explanation
        }
      });

    } catch (error) {
      console.log('');
      console.log('❌ ERROR: Image analysis failed');
      console.error('   Error details:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
      sendResponse({ error: error.message });
    }
  }

  /**
   * Take action based on final assessment and mode
   */
  async takeAction(agent4Result, incident) {
    try {
      // Get settings
      const settings = await this.getSettings();

      console.log('   → Action required:', agent4Result.actionRequired);
      console.log('   → Threat level:', agent4Result.finalLevel);
      console.log('   → Severity:', agent4Result.severity);
      console.log('   → Current mode:', settings.mode);
      console.log('');
      console.log('   🔍 CHECKING IF SHOULD SEND EMAIL:');
      console.log('      • actionRequired includes "immediate_parent_notification"?', agent4Result.actionRequired && agent4Result.actionRequired.includes('immediate_parent_notification'));
      console.log('      • actionRequired value:', JSON.stringify(agent4Result.actionRequired));
      console.log('      • finalLevel >= 7?', agent4Result.finalLevel >= 7);
      console.log('');

      // Active Mode: Warn child
      if (settings.mode === 'active' && agent4Result.actionRequired !== 'log_only') {
        console.log('   → ⚠️  Warning will be shown to child (handled by content script)');
        console.log('      • Child will see:', agent4Result.childWarning);
      }

      // Send parent notification if required (check if action includes immediate_parent_notification)
      if (agent4Result.actionRequired && agent4Result.actionRequired.includes('immediate_parent_notification')) {
        console.log('   → 📧 ✅ YES - SENDING PARENT NOTIFICATIONS...');
        await this.sendParentNotification(agent4Result, incident, settings);
      } else if (agent4Result.actionRequired && agent4Result.actionRequired.includes('monitor')) {
        console.log('   → 👀 NO EMAIL - Monitoring only, no immediate notification');
      } else {
        console.log('   → 📝 NO EMAIL - Logged only, no action required');
        console.log('      ⚠️  This means AGENT 4 did NOT return "immediate_parent_notification"');
        console.log('      ⚠️  This usually happens when finalLevel < 7');
      }

    } catch (error) {
      console.error('   ❌ Action failed:', error);
    }
  }

  /**
   * Send notification to parent (email + SMS)
   */
  async sendEmail(email, subject, html, apiKey) {
    console.log('      📧 SENDING EMAIL...');
    console.log('         To:', email);
    console.log('         Subject:', subject);
    console.log('         🔑 API Key found:', apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : 'No');

    // If no API key, simulate
    if (!apiKey) {
      console.log('         ⚠️  No Resend API key configured - simulating');
      console.log('         ┌─────────────────────────────────────────────┐');
      console.log('         │ EMAIL CONTENT (SIMULATED)                   │');
      console.log('         └─────────────────────────────────────────────┘');
      console.log(html);
      console.log('         ───────────────────────────────────────────────');
      console.log('         ℹ️  Configure Resend API key in settings to send real emails');
      return { success: true, simulated: true };
    }

    try {
      // REAL EMAIL SENDING using Resend API
      console.log('         🔄 Calling Resend API...');

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SafeGuard Kids <onboarding@resend.dev>',  // Use Resend's test domain
          to: [email],
          subject: subject,
          html: html
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('         ✅ Email sent successfully via Resend API!');
        console.log('         📧 Email ID:', data.id);
        return { success: true, simulated: false, id: data.id };
      } else {
        console.error('         ❌ Resend API error:', data);
        // Fallback to simulation if API fails
        console.log('         ⚠️  Falling back to simulation...');
        console.log('         ┌─────────────────────────────────────────────┐');
        console.log('         │ EMAIL CONTENT (SIMULATED - API FAILED)      │');
        console.log('         └─────────────────────────────────────────────┘');
        console.log(html);
        return { success: false, error: data.message || 'API error', simulated: true };
      }
    } catch (error) {
      console.error('         ❌ Email send failed:', error);
      console.log('         ⚠️  Falling back to simulation...');
      console.log('         ┌─────────────────────────────────────────────┐');
      console.log('         │ EMAIL CONTENT (SIMULATED - ERROR)           │');
      console.log('         └─────────────────────────────────────────────┘');
      console.log(html);
      return { success: false, error: error.message, simulated: true };
    }
  }

  async sendSMS(phone, message, apiKey, apiSecret, senderNumber) {
    console.log('      📱 SENDING SMS...');
    console.log('         To:', phone);
    console.log('         🔑 API Key found:', apiKey ? `Yes (${apiKey.substring(0, 8)}...)` : 'No');
    console.log('         🔑 API Secret found:', apiSecret ? `Yes (${apiSecret.substring(0, 8)}...)` : 'No');
    console.log('         📞 Sender Number:', senderNumber || 'Not set');

    // If no API credentials, simulate
    if (!apiKey || !apiSecret) {
      console.log('         ⚠️  No Vonage API credentials configured - simulating');
      console.log('         ┌─────────────────────────────────────────────┐');
      console.log('         │ SMS CONTENT (SIMULATED)                     │');
      console.log('         └─────────────────────────────────────────────┘');
      console.log('        ', message);
      console.log('         ───────────────────────────────────────────────');
      console.log('         ℹ️  Configure Vonage API credentials in settings');
      return { success: true, simulated: true };
    }

    // Use fallback sender number if not configured (for testing/demo purposes)
    if (!senderNumber) {
      senderNumber = 'SafeGuard'; // Alphanumeric sender ID (works in some countries, not US/Canada)
      console.log('         ℹ️  No sender number configured, using fallback: "SafeGuard"');
      console.log('         ℹ️  For US/Canada, you need a purchased Vonage virtual number');
    }

    try {
      // REAL SMS SENDING using Vonage API
      console.log('         🔄 Calling Vonage SMS API...');

      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          to: phone.replace(/[^0-9+]/g, ''), // Clean phone number
          from: senderNumber,  // Use purchased Vonage virtual number
          text: message
        })
      });

      const data = await response.json();

      if (response.ok && data.messages && data.messages[0].status === '0') {
        console.log('         ✅ SMS sent successfully via Vonage API!');
        console.log('         📱 Message ID:', data.messages[0]['message-id']);
        return { success: true, simulated: false, id: data.messages[0]['message-id'] };
      } else {
        const errorMsg = data.messages ? data.messages[0]['error-text'] : 'Unknown error';
        console.error('         ❌ Vonage API error:', errorMsg);
        // Fallback to simulation if API fails
        console.log('         ⚠️  Falling back to simulation...');
        console.log('         ┌─────────────────────────────────────────────┐');
        console.log('         │ SMS CONTENT (SIMULATED - API FAILED)        │');
        console.log('         └─────────────────────────────────────────────┘');
        console.log('        ', message);
        return { success: false, error: errorMsg, simulated: true };
      }
    } catch (error) {
      console.error('         ❌ SMS send failed:', error);
      console.log('         ⚠️  Falling back to simulation...');
      console.log('         ┌─────────────────────────────────────────────┐');
      console.log('         │ SMS CONTENT (SIMULATED - ERROR)             │');
      console.log('         └─────────────────────────────────────────────┘');
      console.log('        ', message);
      return { success: false, error: error.message, simulated: true };
    }
  }

  async sendParentNotification(agent4Result, incident, settings) {
    try {
      console.log('      ┌─────────────────────────────────────────────┐');
      console.log('      │ PARENT NOTIFICATION                         │');
      console.log('      └─────────────────────────────────────────────┘');
      console.log('      • Severity:', agent4Result.severity);
      console.log('      • Parent Guidance:', agent4Result.parentGuidance);
      console.log('      ');
      console.log('      📋 SETTINGS RECEIVED:');
      console.log('         • Parent Email:', settings.parentEmail || 'Not set');
      console.log('         • Parent Phone:', settings.parentPhone || 'Not set');
      console.log('         • Resend API Key:', settings.resendApiKey ? `Set (${settings.resendApiKey.substring(0, 10)}...)` : 'Not set');
      console.log('         • Vonage API Key:', settings.vonageApiKey ? `Set (${settings.vonageApiKey.substring(0, 8)}...)` : 'Not set');
      console.log('         • Vonage API Secret:', settings.vonageApiSecret ? `Set (${settings.vonageApiSecret.substring(0, 8)}...)` : 'Not set');
      console.log('      ');

      // Prepare notification content
      const timestamp = new Date().toLocaleString();
      const platform = incident.platform || 'Unknown';
      const threatLevel = agent4Result.finalLevel || 0;

      // Email notification
      if (settings.parentEmail) {
        const emailSubject = `🚨 SafeGuard Alert: ${agent4Result.severity} Threat Detected`;
        const emailHtml = `
          <h2 style="color: #dc2626;">SafeGuard Kids Alert</h2>
          <p><strong>Severity:</strong> ${agent4Result.severity} (${threatLevel}/10)</p>
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Platform:</strong> ${platform}</p>
          <p><strong>Primary Threat:</strong> ${agent4Result.primaryThreat}</p>

          <h3>Parent Guidance:</h3>
          <p>${agent4Result.parentGuidance}</p>

          <h3>⚠️ Inappropriate Message Content:</h3>
          <div style="background: #fee; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; font-family: monospace;">
            "${incident.content || 'Content unavailable'}"
          </div>

          <h3>AI Analysis:</h3>
          <p><strong>Category:</strong> ${agent4Result.primaryThreat}</p>
          <p><strong>Explanation:</strong> ${incident.agentResults?.agent1?.explanation || 'See dashboard for details'}</p>

          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated alert from SafeGuard Kids.<br>
            Open your browser extension dashboard for more details.
          </p>
        `;

        const emailResult = await this.sendEmail(
          settings.parentEmail,
          emailSubject,
          emailHtml,
          settings.resendApiKey
        );

        if (emailResult.simulated) {
          console.log('      • 📧 Email result: ⚠️  Simulated (no API key configured)');
        } else if (emailResult.success) {
          console.log('      • 📧 Email result: ✅ Sent via Resend API');
          console.log('         Email ID:', emailResult.id);
        } else {
          console.log('      • 📧 Email result: ❌ Failed -', emailResult.error);
        }
      } else {
        console.log('      • 📧 Email: Not configured (no parent email set)');
      }

      // SMS notification
      if (settings.parentPhone) {
        const smsMessage = `🚨 SafeGuard Alert: ${agent4Result.severity} threat detected on ${platform}. Threat level: ${threatLevel}/10. Check extension dashboard for details. - ${timestamp}`;

        const smsResult = await this.sendSMS(
          settings.parentPhone,
          smsMessage,
          settings.vonageApiKey,
          settings.vonageApiSecret,
          settings.vonageSenderNumber
        );

        if (smsResult.simulated) {
          console.log('      • 📱 SMS result: ⚠️  Simulated (no API credentials configured)');
        } else if (smsResult.success) {
          console.log('      • 📱 SMS result: ✅ Sent via Vonage API');
          console.log('         Message ID:', smsResult.id);
        } else {
          console.log('      • 📱 SMS result: ❌ Failed -', smsResult.error);
        }
      } else {
        console.log('      • 📱 SMS: Not configured (no parent phone set)');
      }

    } catch (error) {
      console.error('      ❌ Notification failed:', error);
    }
  }

  /**
   * Get settings from storage
   */
  async getSettings() {
    try {
      console.log('[SafeGuard] 🔍 Getting settings from storage...');

      // Settings should be in chrome.storage.sync (API keys, email, phone - small data)
      const syncResult = await chrome.storage.sync.get([
        'mode',
        'enabled',
        'parentEmail',
        'parentPhone',
        'resendApiKey',
        'vonageApiKey',
        'vonageApiSecret',
        'vonageSenderNumber'
      ]);

      // Also check chrome.storage.local as fallback (for backwards compatibility)
      const localResult = await chrome.storage.local.get([
        'mode',
        'enabled',
        'parentEmail',
        'parentPhone',
        'resendApiKey',
        'vonageApiKey',
        'vonageApiSecret',
        'vonageSenderNumber'
      ]);

      // Merge results (sync takes precedence, local as fallback for backwards compatibility)
      const result = {
        mode: syncResult.mode || localResult.mode,
        enabled: syncResult.enabled !== undefined ? syncResult.enabled : localResult.enabled,
        parentEmail: syncResult.parentEmail || localResult.parentEmail,
        parentPhone: syncResult.parentPhone || localResult.parentPhone,
        resendApiKey: syncResult.resendApiKey || localResult.resendApiKey,
        vonageApiKey: syncResult.vonageApiKey || localResult.vonageApiKey,
        vonageApiSecret: syncResult.vonageApiSecret || localResult.vonageApiSecret,
        vonageSenderNumber: syncResult.vonageSenderNumber || localResult.vonageSenderNumber
      };

      console.log('[SafeGuard] 🔍 Settings loaded from chrome.storage.sync:');
      console.log('  - Mode:', result.mode || 'active');
      console.log('  - Enabled:', result.enabled !== false);
      console.log('  - Parent Email:', result.parentEmail || 'Not set');
      console.log('  - Parent Phone:', result.parentPhone || 'Not set');
      console.log('  - Resend API Key:', result.resendApiKey ? `Set (${result.resendApiKey.substring(0, 10)}...)` : 'Not set');
      console.log('  - Vonage API Key:', result.vonageApiKey ? `Set (${result.vonageApiKey.substring(0, 8)}...)` : 'Not set');
      console.log('  - Vonage API Secret:', result.vonageApiSecret ? `Set (${result.vonageApiSecret.substring(0, 8)}...)` : 'Not set');
      console.log('  - Vonage Sender Number:', result.vonageSenderNumber || 'Not set');

      return {
        mode: result.mode || 'active',
        enabled: result.enabled !== false,
        parentEmail: result.parentEmail || '',
        parentPhone: result.parentPhone || '',
        resendApiKey: result.resendApiKey || '',
        vonageApiKey: result.vonageApiKey || '',
        vonageApiSecret: result.vonageApiSecret || '',
        vonageSenderNumber: result.vonageSenderNumber || ''
      };
    } catch (error) {
      console.error('[SafeGuard] Failed to get settings:', error);
      return { mode: 'active', enabled: true };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

const safeguard = new SafeGuardServiceWorker();

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('[SafeGuard] 🔄 SERVICE WORKER LOADED - VERSION 2.0');
  console.log('[SafeGuard] ✅ Real Email/SMS API Integration Enabled');
  console.log('[SafeGuard] 📧 Resend API support: ACTIVE');
  console.log('[SafeGuard] 📱 Vonage SMS API support: ACTIVE');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('[SafeGuard] Extension installed/updated');
  await safeguard.initialize();
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[SafeGuard] Extension icon clicked - opening side panel');
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle messages from content scripts and dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SafeGuard] Received message:', request.action);

  if (request.action === 'analyzeText') {
    safeguard.handleTextAnalysis(request.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'analyzeImage') {
    safeguard.handleImageAnalysis(request.data, sendResponse);
    return true;
  }

  // Page Monitor: Analyze page content for porn detection (STRICT DOMAIN-BASED ONLY)
  if (request.action === 'analyzePageContent') {
    (async () => {
      try {
        const { url } = request.data;

        console.log('[SafeGuard Page Analysis] Checking URL:', url);

        // STRICT: Only flag known pornographic domains by URL hostname
        // This prevents false positives on normal sites with keywords
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Known pornographic domains (strict list)
        const pornDomains = [
          'pornhub.com', 'www.pornhub.com',
          'xvideos.com', 'www.xvideos.com',
          'xnxx.com', 'www.xnxx.com',
          'xhamster.com', 'www.xhamster.com',
          'redtube.com', 'www.redtube.com',
          'youporn.com', 'www.youporn.com',
          'tube8.com', 'www.tube8.com',
          'spankbang.com', 'www.spankbang.com',
          'eporner.com', 'www.eporner.com',
          'beeg.com', 'www.beeg.com',
          'youjizz.com', 'www.youjizz.com',
          'tnaflix.com', 'www.tnaflix.com',
          'drtuber.com', 'www.drtuber.com',
          'nuvid.com', 'www.nuvid.com',
          'keezmovies.com', 'www.keezmovies.com',
          'slutload.com', 'www.slutload.com',
          'extremetube.com', 'www.extremetube.com',
          'porn.com', 'www.porn.com',
          'sex.com', 'www.sex.com',
          'brazzers.com', 'www.brazzers.com',
          'realitykings.com', 'www.realitykings.com'
        ];

        // Check if hostname exactly matches a porn domain
        const isPornSite = pornDomains.includes(hostname);

        if (isPornSite) {
          console.warn('[SafeGuard Page Analysis] ⚠️ PORNOGRAPHIC DOMAIN DETECTED:', hostname);

          sendResponse({
            threat: {
              level: 10,
              severity: 'CRITICAL',
              category: 'pornographic_website',
              explanation: `Pornographic website detected: ${hostname}`,
              domain: hostname
            }
          });
        } else {
          console.log('[SafeGuard Page Analysis] Domain is safe:', hostname);
          sendResponse({ safe: true });
        }

      } catch (error) {
        console.error('[SafeGuard Page Analysis] Error:', error);
        // If there's an error (like invalid URL), assume safe
        sendResponse({ safe: true });
      }
    })();
    return true;
  }

  // Dashboard: Get stats
  if (request.action === 'getStats') {
    chrome.storage.local.get(['incidents'], (result) => {
      const incidents = result.incidents || [];
      const stats = {
        totalAnalyzed: safeguard.conversationMemory.messages.length,
        threatsDetected: incidents.length,
        criticalThreats: incidents.filter(i => i.level >= 9).length
      };
      sendResponse({ stats });
    });
    return true;
  }

  // Dashboard: Check Prompt API availability
  if (request.action === 'checkPromptAPI') {
    (async () => {
      try {
        if (typeof LanguageModel === 'undefined') {
          sendResponse({ available: false });
          return;
        }
        const { available } = await LanguageModel.params();
        sendResponse({ available: available !== 'no' });
      } catch (error) {
        console.error('[SafeGuard] Error checking Prompt API:', error);
        sendResponse({ available: false });
      }
    })();
    return true;
  }

  // Dashboard: Test notification
  if (request.action === 'testNotification') {
    (async () => {
      try {
        const { incident, threat, email, phone } = request.data;

        console.log('[SafeGuard] 📧 Sending test notification...');
        console.log('[SafeGuard] 🔍 DEBUG: Checking storage for API keys...');

        // Check chrome.storage.sync first (primary location for settings)
        const syncResult = await chrome.storage.sync.get([
          'resendApiKey',
          'vonageApiKey',
          'vonageApiSecret'
        ]);

        console.log('[SafeGuard] 🔍 chrome.storage.sync result:');
        console.log('  - resendApiKey:', syncResult.resendApiKey ? `Found (${syncResult.resendApiKey.substring(0, 10)}...)` : 'NOT FOUND');
        console.log('  - vonageApiKey:', syncResult.vonageApiKey ? `Found (${syncResult.vonageApiKey.substring(0, 8)}...)` : 'NOT FOUND');
        console.log('  - vonageApiSecret:', syncResult.vonageApiSecret ? `Found (${syncResult.vonageApiSecret.substring(0, 8)}...)` : 'NOT FOUND');

        // Check chrome.storage.local as fallback (for backwards compatibility)
        const localResult = await chrome.storage.local.get([
          'resendApiKey',
          'vonageApiKey',
          'vonageApiSecret'
        ]);

        console.log('[SafeGuard] 🔍 chrome.storage.local result (fallback):');
        console.log('  - resendApiKey:', localResult.resendApiKey ? `Found (${localResult.resendApiKey.substring(0, 10)}...)` : 'NOT FOUND');
        console.log('  - vonageApiKey:', localResult.vonageApiKey ? `Found (${localResult.vonageApiKey.substring(0, 8)}...)` : 'NOT FOUND');
        console.log('  - vonageApiSecret:', localResult.vonageApiSecret ? `Found (${localResult.vonageApiSecret.substring(0, 8)}...)` : 'NOT FOUND');

        // Use sync storage preferentially, fallback to local
        const result = {
          resendApiKey: syncResult.resendApiKey || localResult.resendApiKey,
          vonageApiKey: syncResult.vonageApiKey || localResult.vonageApiKey,
          vonageApiSecret: syncResult.vonageApiSecret || localResult.vonageApiSecret
        };

        console.log('[SafeGuard] ✓ Using API keys from:', syncResult.resendApiKey ? 'chrome.storage.sync' : (localResult.resendApiKey ? 'chrome.storage.local (fallback)' : 'NONE'));

        const settings = {
          parentEmail: email,
          parentPhone: phone,
          resendApiKey: result.resendApiKey || '',
          vonageApiKey: result.vonageApiKey || '',
          vonageApiSecret: result.vonageApiSecret || ''
        };

        await safeguard.sendParentNotification(threat, incident, settings);

        sendResponse({ success: true, message: 'Test notification sent successfully' });
      } catch (error) {
        console.error('[SafeGuard] Test notification error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Dashboard: Clear all data from service worker
  if (request.action === 'clearAllData') {
    (async () => {
      try {
        console.log('[SafeGuard] 🗑️ Clearing all service worker data...');

        // Clear conversation memory
        safeguard.conversationMemory = {
          messages: [],
          contexts: new Map()
        };

        // Clear any cached session data
        if (safeguard.session) {
          try {
            await safeguard.session.destroy();
          } catch (error) {
            console.log('[SafeGuard] Session cleanup:', error.message);
          }
          safeguard.session = null;
        }

        console.log('[SafeGuard] ✓ Service worker data cleared');
        sendResponse({ success: true });
      } catch (error) {
        console.error('[SafeGuard] Error clearing service worker data:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  sendResponse({ error: 'Unknown action' });
  return false;
});

console.log('[SafeGuard] ✓ Service worker ready with agent architecture');
