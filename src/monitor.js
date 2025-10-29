/**
 * SafeGuard Kids - Content Script Monitor
 * This script runs on social media platforms and monitors conversations in real-time
 */

// Note: TensorFlow.js cannot be bundled properly - kernel functions break
// Loading from local extension files (vendor/) which are web_accessible_resources
const loadTensorFlow = async () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, 15000);

    // Load TensorFlow.js from local extension files
    const tfScript = document.createElement('script');
    tfScript.src = chrome.runtime.getURL('vendor/tf.min.js');
    tfScript.onload = () => {
      // Wait for window.tf to be available
      const checkTf = setInterval(() => {
        if (window.tf) {
          clearInterval(checkTf);
          clearTimeout(timeout);
          console.log('[SafeGuard TensorFlow] ✓ TensorFlow.js loaded from local extension');

          // Load Toxicity model
          const toxicityScript = document.createElement('script');
          toxicityScript.src = chrome.runtime.getURL('vendor/toxicity.min.js');
          toxicityScript.onload = () => {
            // Wait for window.toxicity to be available
            const checkToxicity = setInterval(() => {
              if (window.toxicity) {
                clearInterval(checkToxicity);
                console.log('[SafeGuard TensorFlow] ✓ Toxicity model loaded from local extension');
                resolve();
              }
            }, 50);
          };
          toxicityScript.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
          document.head.appendChild(toxicityScript);
        }
      }, 50);
    };
    tfScript.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };
    document.head.appendChild(tfScript);
  });
};

// TensorFlow Toxicity Analyzer (runs in content script with bundled TensorFlow)
class TensorFlowAnalyzer {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;
    this.loadFailed = false;
    this.initAttempted = false;
  }

  async initialize() {
    if (this.isReady) return true;
    if (this.loadFailed) return false; // Don't retry if failed

    if (this.isLoading) {
      // Wait for existing load
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isReady;
    }

    this.isLoading = true;
    this.initAttempted = true;

    try {
      console.log('[SafeGuard TensorFlow] Loading TensorFlow.js from local extension...');

      // Load TensorFlow scripts from local extension
      await loadTensorFlow();

      // Load toxicity model with threshold 0.7
      console.log('[SafeGuard TensorFlow] Loading toxicity model...');
      this.model = await window.toxicity.load(0.7);

      console.log('[SafeGuard TensorFlow] ✓ Model ready for classification!');
      this.isReady = true;
      this.isLoading = false;
      return true;
    } catch (error) {
      this.isLoading = false;
      this.loadFailed = true;

      if (error.message === 'TIMEOUT') {
        console.log('[SafeGuard TensorFlow] ⚠️  CDN loading timed out (normal if offline or CSP blocked)');
      } else {
        console.log('[SafeGuard TensorFlow] ⚠️  Failed to load:', error.message);
      }
      console.log('[SafeGuard TensorFlow] ✓ Gemini Nano AI will still analyze all messages');

      this.isReady = false;
      return false;
    }
  }

  async analyzeText(text) {
    if (!this.isReady) {
      // Only try to initialize once per session
      if (!this.initAttempted) {
        const success = await this.initialize();
        if (!success) {
          return { isToxic: false, level: 0, detectedTypes: [], source: 'tensorflow-unavailable' };
        }
      } else {
        // Already attempted initialization and failed - skip silently
        return { isToxic: false, level: 0, detectedTypes: [], source: 'tensorflow-unavailable' };
      }
    }

    try {
      const predictions = await this.model.classify([text]);

      let detectedTypes = [];
      let maxLevel = 0;

      // Process predictions for 7 toxicity categories
      predictions.forEach(prediction => {
        const match = prediction.results[0].match;
        if (match) {
          const probability = prediction.results[0].probabilities[1];
          const label = prediction.label;

          // Map to danger levels
          let level = 0;
          if (label === 'sexual_explicit') level = 9;
          else if (label === 'severe_toxicity') level = 8;
          else if (label === 'threat') level = 7;
          else if (label === 'obscene') level = 6;
          else if (label === 'insult') level = 5;
          else if (label === 'identity_attack') level = 6;
          else if (label === 'toxicity') level = 5;

          detectedTypes.push({
            type: label,
            probability: probability,
            level: level
          });

          maxLevel = Math.max(maxLevel, level);
        }
      });

      console.log('[SafeGuard TensorFlow] Analysis complete:', detectedTypes.map(t => t.type).join(', ') || 'none');

      return {
        isToxic: detectedTypes.length > 0,
        level: maxLevel,
        detectedTypes: detectedTypes,
        source: 'tensorflow-toxicity'
      };

    } catch (error) {
      console.error('[SafeGuard TensorFlow] Classification error:', error);
      return { isToxic: false, level: 0, detectedTypes: [], source: 'tensorflow-error' };
    }
  }
}

// Initialize TensorFlow analyzer
const tensorflowAnalyzer = new TensorFlowAnalyzer();

class ConversationMonitor {
  constructor() {
    this.platform = null;
    this.platformConfig = null;
    // NOTE: Conversation history is managed by service worker, not content script
    this.monitoringEnabled = false;
    this.mode = 'active'; // 'active' or 'passive'
    this.observedElements = new Set();
    this.lastAnalyzedMessages = new Set();

    this.init();
  }

  async init() {
    console.log('[SafeGuard Kids] Initializing monitor...');

    // Get settings from storage
    const settings = await this.getSettings();
    this.mode = settings.mode || 'active';
    this.monitoringEnabled = settings.enabled !== false;

    if (!this.monitoringEnabled) {
      console.log('[SafeGuard Kids] Monitoring is disabled');
      return;
    }

    // Detect current platform
    await this.detectPlatform();

    if (!this.platform) {
      console.log('[SafeGuard Kids] Platform not supported');
      return;
    }

    console.log(`[SafeGuard Kids] Monitoring ${this.platform.name} in ${this.mode} mode`);

    // Start monitoring
    this.startMonitoring();
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['mode', 'enabled', 'parentEmail'], (result) => {
        resolve(result);
      });
    });
  }

  async detectPlatform() {
    try {
      // Verify chrome.runtime is available
      if (!chrome.runtime || !chrome.runtime.getURL) {
        console.error('[SafeGuard] Chrome runtime not available');
        return null;
      }

      // Load platform configurations
      const configUrl = chrome.runtime.getURL('config/platforms.json');
      console.log('[SafeGuard] Loading config from:', configUrl);

      const response = await fetch(configUrl);

      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }

      const config = await response.json();

    const hostname = window.location.hostname;

    // Find matching platform
    for (const [key, platformData] of Object.entries(config.platforms)) {
      const domains = Array.isArray(platformData.domain)
        ? platformData.domain
        : [platformData.domain];

      if (domains.some(domain => hostname.includes(domain))) {
        this.platform = platformData;
        this.platformConfig = config;
        console.log('[SafeGuard] Platform detected:', platformData.name);
        return;
      }
    }

    console.warn('[SafeGuard] No matching platform found for:', hostname);
    } catch (error) {
      console.error('[SafeGuard] Failed to detect platform:', error);
      return null;
    }
  }

  startMonitoring() {
    // Monitor input fields (what the child is typing)
    this.monitorInputFields();

    // Monitor incoming messages
    this.monitorMessages();

    // Monitor images
    this.monitorImages();

    // IMPORTANT: Do NOT show indicator - child should not know they are being monitored
    // if (this.mode === 'active') {
    //   this.showMonitoringIndicator();
    // }
  }

  monitorInputFields() {
    const checkForInputs = () => {
      const selectors = this.platform.selectors.messageInput;

      selectors.forEach(selector => {
        const inputs = document.querySelectorAll(selector);

        inputs.forEach(input => {
          if (!this.observedElements.has(input)) {
            this.observedElements.add(input);

            // Monitor input events
            input.addEventListener('input', (e) => {
              this.handleInput(e.target);
            });

            // Monitor before send (keypress Enter)
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                setTimeout(() => this.handleMessageSent(input), 100);
              }
            });
          }
        });
      });
    };

    // Initial check
    checkForInputs();

    // Check periodically for dynamically added inputs
    setInterval(checkForInputs, 2000);
  }

  monitorMessages() {
    const selectors = [
      ...this.platform.selectors.sentMessage,
      ...this.platform.selectors.receivedMessage
    ];

    // Create mutation observer for new messages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a message
            selectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                this.handleNewMessage(node);
              }

              // Check children
              const messages = node.querySelectorAll(selector);
              messages.forEach(msg => this.handleNewMessage(msg));
            });
          }
        });
      });
    });

    // Observe message containers
    const containerSelectors = this.platform.selectors.messageContainer;
    containerSelectors.forEach(selector => {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        observer.observe(container, {
          childList: true,
          subtree: true
        });
      });
    });

    // Also observe body for dynamic containers
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  monitorImages() {
    console.log('[SafeGuard Kids] Starting image monitoring...');
    const selectors = this.platform.selectors.images;
    console.log('[SafeGuard Kids] Image selectors:', selectors);

    // Helper function to check if an image is a profile picture
    const isProfilePicture = (img) => {
      // Check if image is loaded (dimensions available)
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      console.log(`[SafeGuard Kids] Checking image: ${width}x${height}, src: ${img.src.substring(0, 50)}, classes: ${img.className}`);

      // Profile pictures are typically:
      // - Small (under 300px)
      // - From external CDN URLs (scontent-*.fbcdn.net)
      // - Have specific classes (x1rg5ohu, x5yr21d)
      // - Have "profile" in URL
      const isSmall = width < 300 || height < 300;
      const isExternalCDN = img.src.includes('scontent') || img.src.includes('fbcdn.net');
      const hasProfileClass = img.classList.contains('x1rg5ohu') || img.classList.contains('x5yr21d');
      const hasProfileInUrl = img.src.includes('profile');

      return (isSmall && isExternalCDN) || hasProfileClass || hasProfileInUrl;
    };

    // Helper function to check if an image is a message image
    const isMessageImage = (img) => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Message images are typically:
      // - Base64 encoded (data:image/...)
      // - Large (300px+)
      // - Have specific classes (xz74otr, x193iq5w, xmz0i5r)
      const isBase64 = img.src.startsWith('data:image');
      const isLarge = width >= 300 && height >= 300;
      const hasMessageImageClass = img.classList.contains('xz74otr') ||
                                   img.classList.contains('x193iq5w') ||
                                   img.classList.contains('xmz0i5r');

      return isBase64 || (isLarge && hasMessageImageClass);
    };

    // Scan existing images first
    console.log('[SafeGuard Kids] Scanning for existing images...');
    selectors.forEach(selector => {
      const existingImages = document.querySelectorAll(selector);
      console.log(`[SafeGuard Kids] Found ${existingImages.length} existing images with selector: ${selector}`);
      existingImages.forEach(img => {
        if (!isProfilePicture(img) && isMessageImage(img)) {
          console.log(`[SafeGuard Kids] ✓ Message image detected: ${img.width}x${img.height}`);
          this.handleImage(img);
        } else {
          console.log(`[SafeGuard Kids] ✗ Skipping (profile pic or UI element): ${img.width}x${img.height}`);
        }
      });
    });

    // Also scan for ANY image in message containers as fallback
    const messageContainers = document.querySelectorAll(this.platform.selectors.messageContainer.join(','));
    messageContainers.forEach(container => {
      const allImages = container.querySelectorAll('img');
      console.log(`[SafeGuard Kids] Found ${allImages.length} total images in message containers`);
      allImages.forEach(img => {
        if (!isProfilePicture(img) && isMessageImage(img)) {
          console.log(`[SafeGuard Kids] ✓ Fallback message image: ${img.width}x${img.height}`);
          this.handleImage(img);
        }
      });
    });

    // Create mutation observer for new images
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this matches image selectors
            selectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                console.log('[SafeGuard Kids] New image detected via selector:', selector);
                // Wait for image to load before checking dimensions
                if (node.complete) {
                  if (!isProfilePicture(node) && isMessageImage(node)) {
                    console.log(`[SafeGuard Kids] ✓ New message image: ${node.width}x${node.height}`);
                    this.handleImage(node);
                  } else {
                    console.log(`[SafeGuard Kids] ✗ Skipping new image (profile): ${node.width}x${node.height}`);
                  }
                } else {
                  // Image not loaded yet, wait for load event
                  node.addEventListener('load', () => {
                    if (!isProfilePicture(node) && isMessageImage(node)) {
                      console.log(`[SafeGuard Kids] ✓ New message image (after load): ${node.width}x${node.height}`);
                      this.handleImage(node);
                    }
                  }, { once: true });
                }
              }

              // Check children
              const images = node.querySelectorAll(selector);
              if (images.length > 0) {
                console.log(`[SafeGuard Kids] Found ${images.length} new child images`);
              }
              images.forEach(img => {
                if (img.complete) {
                  if (!isProfilePicture(img) && isMessageImage(img)) {
                    console.log(`[SafeGuard Kids] ✓ New child message image: ${img.width}x${img.height}`);
                    this.handleImage(img);
                  }
                } else {
                  img.addEventListener('load', () => {
                    if (!isProfilePicture(img) && isMessageImage(img)) {
                      console.log(`[SafeGuard Kids] ✓ New child message image (after load): ${img.width}x${img.height}`);
                      this.handleImage(img);
                    }
                  }, { once: true });
                }
              });
            });

            // Fallback: Check for any img tags
            if (node.tagName === 'IMG' || node.querySelector) {
              const allNewImages = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
              allNewImages.forEach(img => {
                if (img.complete) {
                  if (!isProfilePicture(img) && isMessageImage(img)) {
                    console.log('[SafeGuard Kids] ✓ Fallback new image:', img.src.substring(0, 50));
                    this.handleImage(img);
                  }
                } else {
                  img.addEventListener('load', () => {
                    if (!isProfilePicture(img) && isMessageImage(img)) {
                      console.log('[SafeGuard Kids] ✓ Fallback new image (after load):', img.src.substring(0, 50));
                      this.handleImage(img);
                    }
                  }, { once: true });
                }
              });
            }
          }
        });
      });
    });

    // Observe message containers only
    const containerSelectors = this.platform.selectors.messageContainer;
    containerSelectors.forEach(selector => {
      const containers = document.querySelectorAll(selector);
      console.log(`[SafeGuard Kids] Observing ${containers.length} containers with selector: ${selector}`);
      containers.forEach(container => {
        observer.observe(container, {
          childList: true,
          subtree: true
        });
      });
    });

    // Also observe body for dynamic containers
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[SafeGuard Kids] Image monitoring active');
  }

  handleInput(inputElement) {
    const text = inputElement.textContent || inputElement.value;

    if (text && text.length > 10) {
      // Debounce analysis while typing
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        this.analyzeText(text, 'sent', inputElement);
      }, 1000);
    }
  }

  handleMessageSent(inputElement) {
    const text = inputElement.textContent || inputElement.value;

    if (text && text.trim()) {
      // Service worker will store this in conversation memory
      this.analyzeText(text, 'sent');
    }
  }

  handleNewMessage(messageElement) {
    const messageId = this.getMessageId(messageElement);

    if (this.lastAnalyzedMessages.has(messageId)) {
      return;
    }

    this.lastAnalyzedMessages.add(messageId);

    const text = messageElement.textContent || messageElement.innerText;

    if (text && text.trim()) {
      // Service worker will store this in conversation memory
      this.analyzeText(text, 'received', messageElement);
    }
  }

  handleImage(imageElement) {
    // Get image source
    const src = imageElement.src;

    // Skip icons, SVGs, and tiny images (likely UI elements)
    if (!src ||
        src.startsWith('data:image/svg') ||
        imageElement.width < 50 ||
        imageElement.height < 50) {
      return;
    }

    // Create unique ID to avoid re-analyzing same image
    const imageId = src.slice(0, 100) + '_' + imageElement.width + 'x' + imageElement.height;

    if (this.analyzedImages && this.analyzedImages.has(imageId)) {
      return;
    }

    if (!this.analyzedImages) {
      this.analyzedImages = new Set();
    }

    this.analyzedImages.add(imageId);

    // Determine if this is a sent or received image
    // Check if the image is in a sent message container or received message container
    let imageType = 'received'; // Default to received

    const sentSelectors = this.platform.selectors.sentMessage || [];
    const receivedSelectors = this.platform.selectors.receivedMessage || [];

    // Check parent elements to determine if sent or received
    let element = imageElement.parentElement;
    let depth = 0;
    while (element && depth < 10) {
      // Check if any sent message selector matches
      for (const selector of sentSelectors) {
        if (element.matches && element.matches(selector)) {
          imageType = 'sent';
          break;
        }
      }

      if (imageType === 'sent') break;

      element = element.parentElement;
      depth++;
    }

    console.log(`[SafeGuard Kids] Analyzing ${imageType} image:`, src.slice(0, 60));

    // Analyze image for inappropriate content
    this.analyzeImage(imageElement, imageType);
  }

  getMessageId(element) {
    // Create unique ID for message to avoid duplicate analysis
    return element.textContent?.slice(0, 50) + '_' + element.offsetTop;
  }

  async analyzeText(text, type, element = null) {
    // EXACT same logging format as test chatbot (chat-simulator.js lines 59-96)
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    if (type === 'sent') {
      console.log('📤 SENT MESSAGE');
    } else {
      console.log('📥 RECEIVED MESSAGE');
    }
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Message:', text);
    console.log('Timestamp:', timestamp);
    console.log('Type:', type);
    console.log('───────────────────────────────────────────────────────────────────');

    // Run TensorFlow analysis in content script with bundled TensorFlow
    let tensorflowResult = null;
    try {
      tensorflowResult = await tensorflowAnalyzer.analyzeText(text);
    } catch (error) {
      console.warn('[SafeGuard Kids] TensorFlow analysis failed:', error.message);
      // Continue without TensorFlow if it fails - other analyzers will still work
    }

    // Send to background script for AI analysis (Agent architecture)
    // Note: Conversation history is now managed in service worker's ConversationMemory
    const messageTypeLabel = type === 'sent' ? 'SENT' : 'RECEIVED';
    console.log(`📨 Sending ${messageTypeLabel} message to SafeGuard for analysis...`);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeText',
        data: {
          text: text,
          type: type,
          platform: this.platform.name,
          timestamp: Date.now(),
          tensorflowResult: tensorflowResult // Include TensorFlow analysis from content script
        }
      });

      // Log analysis results EXACTLY like test chatbot (lines 106-108)
      console.log(`✅ SafeGuard Analysis Results for ${messageTypeLabel} MESSAGE:`, response);
      console.log('   Text analyzed:', text);
      console.log('   Threat level:', response.threat ? response.threat.level : 0);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

      if (response && response.threat) {
        this.handleThreat(response.threat, text, type, element);
      }
    } catch (error) {
      console.error('❌ SafeGuard Analysis Error:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
    }
  }

  async analyzeImage(imageElement, imageType) {
    // EXACT same logging format as test chatbot (chat-simulator.js lines 117-159)
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    if (imageType === 'sent') {
      console.log('📤 SENT IMAGE');
    } else {
      console.log('📥 RECEIVED IMAGE');
    }
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Image URL:', imageElement.src);
    console.log('Image dimensions:', imageElement.width + 'x' + imageElement.height);
    console.log('Timestamp:', timestamp);
    console.log('───────────────────────────────────────────────────────────────────');

    // Send to background script for multimodal AI analysis
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeImage',
        data: {
          imageSrc: imageElement.src,
          imageType: imageType, // 'sent' or 'received'
          imageWidth: imageElement.width,
          imageHeight: imageElement.height,
          platform: this.platform.name,
          timestamp: Date.now()
        }
      });

      console.log('SafeGuard Image Analysis Results:', response);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

      if (response && response.threat) {
        const threatDescription = imageType === 'sent'
          ? `Child sent inappropriate image`
          : `Child received inappropriate image`;

        this.handleThreat(response.threat, threatDescription, 'image', imageElement);
      }
    } catch (error) {
      console.error('❌ SafeGuard Image Analysis Error:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
    }
  }

  // NOTE: Conversation history is managed by service worker (max 20 messages, FIFO)
  // Content scripts should NOT manage conversation history

  handleThreat(threat, content, type, element) {
    // Log the threat
    this.logThreat(threat, content, type);

    // Active mode or Both mode: Show warning to child
    if ((this.mode === 'active' || this.mode === 'both') && threat.level >= 7) {
      this.showWarningPopup(threat);
    }

    // Passive mode or Both mode: Notify parent for critical threats
    if ((this.mode === 'passive' || this.mode === 'both') && (threat.level >= 9 || threat.critical)) {
      chrome.runtime.sendMessage({
        action: 'notifyParent',
        data: {
          threat: threat,
          content: content,
          type: type,
          // NOTE: Service worker has conversation memory
          platform: this.platform.name
        }
      });
    }

    // In "both" mode, also notify parent for high-level threats (7-8)
    if (this.mode === 'both' && threat.level >= 7 && threat.level < 9) {
      chrome.runtime.sendMessage({
        action: 'notifyParent',
        data: {
          threat: threat,
          content: content,
          type: type,
          // NOTE: Service worker has conversation memory
          platform: this.platform.name
        }
      });
    }
  }

  logThreat(threat, content, type) {
    chrome.storage.local.get(['threats'], (result) => {
      const threats = result.threats || [];

      threats.push({
        threat: threat,
        content: content,
        type: type,
        platform: this.platform.name,
        timestamp: Date.now(),
        url: window.location.href
      });

      chrome.storage.local.set({ threats: threats });
    });
  }

  showWarningPopup(threat) {
    // Create warning overlay
    const overlay = document.createElement('div');
    overlay.id = 'safeguard-warning-overlay';
    overlay.innerHTML = `
      <div class="safeguard-warning-modal">
        <div class="safeguard-warning-icon">⚠️</div>
        <h2>Safety Warning</h2>
        <p class="safeguard-warning-message">
          ${this.getWarningMessage(threat)}
        </p>
        <div class="safeguard-warning-actions">
          <button id="safeguard-talk-to-parent" class="safeguard-btn-primary">
            Talk to My Parent
          </button>
          <button id="safeguard-understand" class="safeguard-btn-secondary">
            I Understand
          </button>
        </div>
        <p class="safeguard-help-text">
          If someone is making you feel uncomfortable, tell a trusted adult immediately.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('safeguard-talk-to-parent').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'childRequestedHelp',
        data: { threat: threat }
      });
      overlay.remove();
    });

    document.getElementById('safeguard-understand').addEventListener('click', () => {
      overlay.remove();
    });
  }

  getWarningMessage(threat) {
    // Build explanation message
    let explanation = '';

    if (threat.explanation) {
      // Extract key reason from AI explanation
      explanation = `<p style="margin: 12px 0; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <strong>Why this is concerning:</strong> ${threat.explanation}
      </p>`;
    }

    if (threat.level >= 9) {
      return `
        <strong style="color: #dc2626; font-size: 18px;">⚠️ DANGER</strong>
        <p style="margin: 12px 0;">This conversation contains very concerning content that could be harmful to you.</p>
        ${explanation}
        <p style="margin: 12px 0; font-weight: 600;">
          This is inappropriate because it may be someone trying to manipulate or harm you.
          <strong>Please stop this conversation immediately and talk to your parent for further guidance.</strong>
        </p>
      `;
    } else if (threat.level >= 7) {
      return `
        <strong style="color: #ea580c; font-size: 16px;">⚠️ Warning</strong>
        <p style="margin: 12px 0;">This conversation may not be safe for you.</p>
        ${explanation}
        <p style="margin: 12px 0;">
          This is inappropriate because the person you're talking to might not be who they say they are,
          or they may be asking questions that adults shouldn't ask children.
          <strong>Please talk to your parent about this conversation to get further guidance.</strong>
        </p>
      `;
    } else {
      return `
        <strong style="color: #f59e0b;">Notice</strong>
        <p style="margin: 12px 0;">We noticed something unusual in your conversation.</p>
        ${explanation}
        <p style="margin: 12px 0;">
          Remember: Never share personal information (like your address, school, or phone number) with strangers online.
          If you're unsure, please talk to your parent for guidance.
        </p>
      `;
    }
  }

  // DISABLED: Child should NOT know they are being monitored
  // showMonitoringIndicator() {
  //   const indicator = document.createElement('div');
  //   indicator.id = 'safeguard-indicator';
  //
  //   let modeText = 'SafeGuard Active';
  //   if (this.mode === 'both') {
  //     modeText = 'SafeGuard Active (Full Protection)';
  //   }
  //
  //   indicator.innerHTML = `
  //     <div class="safeguard-indicator-content">
  //       <span class="safeguard-shield">🛡️</span>
  //       <span class="safeguard-text">${modeText}</span>
  //     </div>
  //   `;
  //   document.body.appendChild(indicator);
  // }
}

// Initialize monitor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ConversationMonitor();
  });
} else {
  new ConversationMonitor();
}
