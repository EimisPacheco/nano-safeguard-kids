console.log('Chat Simulator script starting');

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const typingIndicator = document.getElementById('typingIndicator');

// Warning modal elements
const warningModal = document.getElementById('warningModal');
const warningIcon = document.getElementById('warningIcon');
const warningTitle = document.getElementById('warningTitle');
const warningMessage = document.getElementById('warningMessage');
const warningDetails = document.getElementById('warningDetails');
const warningOkBtn = document.getElementById('warningOkBtn');
const warningTalkBtn = document.getElementById('warningTalkBtn');

console.log('Elements found:', {
  chatMessages: !!chatMessages,
  messageInput: !!messageInput,
  sendBtn: !!sendBtn,
  imageBtn: !!imageBtn,
  imageInput: !!imageInput,
  warningModal: !!warningModal
});

let messageCount = 0;

// Modal button handlers
if (warningOkBtn) {
  warningOkBtn.addEventListener('click', () => {
    warningModal.style.display = 'none';
  });
}

if (warningTalkBtn) {
  warningTalkBtn.addEventListener('click', () => {
    alert('In a real scenario, this would notify your parent immediately.');
    warningModal.style.display = 'none';
  });
}

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim()) {
    sendMessage();
  }
});

// Send button click
sendBtn.addEventListener('click', (e) => {
  e.preventDefault();
  sendMessage();
});

// Image button click
imageBtn.addEventListener('click', (e) => {
  e.preventDefault();
  imageInput.click();
});

// Image upload
imageInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    sendImage(e.target.files[0]);
  }
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Add sent message to chat
  addMessageToChat('sent', text, timestamp);

  // Clear input
  messageInput.value = '';

  // Log to console
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📤 SENT MESSAGE');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Message:', text);
  console.log('Timestamp:', timestamp);
  console.log('Type: sent');
  console.log('───────────────────────────────────────────────────────────────────');

  // Send to SafeGuard for analysis
  console.log('📨 Sending SENT message to SafeGuard for analysis...');
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeText',
      data: {
        text: text,
        type: 'sent',
        platform: 'demo-chat',
        timestamp: Date.now(),
        tensorflowResult: null
      }
    });

    console.log('✅ SafeGuard Analysis Results for SENT MESSAGE:', response);
    console.log('   Text analyzed:', text);
    console.log('   Threat level:', response.threat ? response.threat.level : 0);

    // Add threat indicator
    if (response.threat) {
      addThreatIndicator('sent', response.threat.level, response.threat.severity);

      // Show warning modal if threat level is 7 or higher
      if (response.threat.level >= 7) {
        showWarningModal(response.threat);
      }
    } else if (response.safe) {
      addThreatIndicator('sent', 0, 'SAFE');
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('❌ SafeGuard Analysis Error:', error);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
  }

  // Simulate response after delay
  setTimeout(() => {
    simulateResponse();
  }, 1500);
}

async function sendImage(file) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Read image as data URL
  const reader = new FileReader();
  reader.onload = async function(e) {
    const imageSrc = e.target.result;

    // Add sent image to chat
    addImageToChat('sent', imageSrc, timestamp);

    // Log to console
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📤 SENT IMAGE');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Image size:', file.size, 'bytes');
    console.log('Image type:', file.type);
    console.log('Timestamp:', timestamp);
    console.log('───────────────────────────────────────────────────────────────────');

    // Send to SafeGuard for analysis
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeImage',
        data: {
          imageSrc: imageSrc,
          imageType: 'sent',
          platform: 'demo-chat',
          timestamp: Date.now()
        }
      });

      console.log('SafeGuard Image Analysis Results:', response);

      // Add threat indicator
      if (response.threat) {
        addThreatIndicator('sent', response.threat.level, response.threat.severity);

        // Blur image if threat level is high (7+)
        if (response.threat.level >= 7) {
          blurInappropriateImage('sent', response.threat);

          // Show warning modal for inappropriate images
          showWarningModal(response.threat);
        }
      } else if (response.safe) {
        addThreatIndicator('sent', 0, 'SAFE');
      }

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

    } catch (error) {
      console.error('❌ SafeGuard Image Analysis Error:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
    }
  };
  reader.readAsDataURL(file);

  // Clear file input
  imageInput.value = '';
}

function simulateResponse() {
  const responses = [
    "Cool!",
    "That's interesting",
    "Tell me more",
    "Nice!",
    "I see",
    "Okay",
    "Got it"
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Show typing indicator
  typingIndicator.classList.add('active');
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setTimeout(async () => {
    // Hide typing indicator
    typingIndicator.classList.remove('active');

    // Add received message
    addMessageToChat('received', randomResponse, timestamp);

    // Log to console
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📥 RECEIVED MESSAGE');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Message:', randomResponse);
    console.log('Timestamp:', timestamp);
    console.log('Type: received');
    console.log('───────────────────────────────────────────────────────────────────');

    // Send to SafeGuard for analysis
    console.log('📨 Sending RECEIVED message to SafeGuard for analysis...');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeText',
        data: {
          text: randomResponse,
          type: 'received',
          platform: 'demo-chat',
          timestamp: Date.now(),
          tensorflowResult: null
        }
      });

      console.log('✅ SafeGuard Analysis Results for RECEIVED MESSAGE:', response);
      console.log('   Text analyzed:', randomResponse);
      console.log('   Threat level:', response.threat ? response.threat.level : 0);

      // Add threat indicator
      if (response.threat) {
        addThreatIndicator('received', response.threat.level, response.threat.severity);

        // Show warning modal if threat level is 7 or higher
        if (response.threat.level >= 7) {
          showWarningModal(response.threat);
        }
      } else if (response.safe) {
        addThreatIndicator('received', 0, 'SAFE');
      }

      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');

    } catch (error) {
      console.error('❌ SafeGuard Analysis Error:', error);
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('');
    }
  }, 1000);
}

function addMessageToChat(type, text, timestamp) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${type}`;
  wrapper.dataset.messageId = messageCount++;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = timestamp;

  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  chatMessages.appendChild(wrapper);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addImageToChat(type, imageSrc, timestamp) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${type}`;
  wrapper.dataset.messageId = messageCount++;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'image-wrapper';

  const img = document.createElement('img');
  img.className = 'message-image';
  img.src = imageSrc;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = timestamp;

  imageWrapper.appendChild(img);
  wrapper.appendChild(imageWrapper);
  wrapper.appendChild(time);
  chatMessages.appendChild(wrapper);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addThreatIndicator(type, level, severity) {
  // Find the last message of this type
  const messages = document.querySelectorAll(`.message-wrapper.${type}`);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) return;

  // Don't add duplicate indicators
  if (lastMessage.querySelector('.threat-indicator')) return;

  const indicator = document.createElement('div');
  indicator.className = 'threat-indicator';

  let emoji = '✅';
  let bgColor = '#10b981';

  if (level >= 9) {
    emoji = '⚠️';
    bgColor = '#fbbf24';
  } else if (level >= 7) {
    emoji = '⚠️';
    bgColor = '#f59e0b';
  } else if (level >= 4) {
    emoji = '⚡';
    bgColor = '#fbbf24';
  } else if (level >= 1) {
    emoji = '👀';
    bgColor = '#fbbf24';
  }

  indicator.style.background = bgColor;
  indicator.innerHTML = `${emoji} THREAT: ${level}/10`;

  // Append indicator to the message wrapper (not inside the bubble)
  lastMessage.appendChild(indicator);
}

function blurInappropriateImage(type, threat) {
  // Find the last image of this type
  const messages = document.querySelectorAll(`.message-wrapper.${type}`);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) return;

  const imageWrapper = lastMessage.querySelector('.image-wrapper');
  if (!imageWrapper) return;

  // Add blur class
  imageWrapper.classList.add('blurred');

  // Create warning overlay
  const overlay = document.createElement('div');
  overlay.className = 'image-warning-overlay';
  overlay.innerHTML = `
    <h4>⚠️ Inappropriate Content Detected</h4>
    <p>This image has been flagged as inappropriate (Threat Level: ${threat.level}/10)</p>
    <p>${threat.childWarning || 'This content may not be safe for you to view.'}</p>
    <button onclick="this.parentElement.parentElement.classList.remove('blurred')">Show Image (Parent Override)</button>
  `;

  imageWrapper.appendChild(overlay);

  console.log(`🔒 Image blurred due to threat level ${threat.level}/10`);
}

// Show warning modal to child
function showWarningModal(threat) {
  console.log('🚨 Showing warning modal to child');

  // Set icon based on severity
  if (threat.severity === 'CRITICAL') {
    warningIcon.textContent = '🛑';
    warningIcon.style.color = '#d32f2f';
    warningTitle.textContent = 'CRITICAL Safety Warning';
    warningTitle.style.color = '#d32f2f';
  } else if (threat.severity === 'HIGH') {
    warningIcon.textContent = '⚠️';
    warningIcon.style.color = '#f57c00';
    warningTitle.textContent = 'Important Safety Warning';
    warningTitle.style.color = '#f57c00';
  } else {
    warningIcon.textContent = '⚠️';
    warningIcon.style.color = '#ffa726';
    warningTitle.textContent = 'Safety Notice';
    warningTitle.style.color = '#ffa726';
  }

  // Set message based on category
  let message = '';
  let details = '';

  if (threat.category === 'grooming' || threat.primaryThreat === 'grooming') {
    message = 'This conversation shows warning signs of grooming behavior. This person may not have good intentions.';
    details = '<strong>Warning signs detected:</strong><br>' +
              '• Flattery or special treatment<br>' +
              '• Requests for secrecy<br>' +
              '• Isolation from family<br>' +
              '• Meeting requests<br><br>' +
              '<strong>What to do:</strong><br>' +
              'Stop responding immediately and talk to a trusted adult.';
  } else if (threat.category === 'sexual_content' || threat.primaryThreat === 'sexual_content') {
    message = 'This message contains inappropriate sexual content. This is not safe or appropriate.';
    details = '<strong>This is dangerous because:</strong><br>' +
              '• Sexual content shared with minors is illegal<br>' +
              '• This person may be trying to harm you<br><br>' +
              '<strong>What to do:</strong><br>' +
              'Stop all contact immediately and tell a parent or trusted adult right away.';
  } else if (threat.category === 'personal_info_request' || threat.primaryThreat === 'personal_info_request') {
    message = 'Someone is asking for your personal information. Never share this with strangers online.';
    details = '<strong>Don\'t share:</strong><br>' +
              '• Your full name, age, or birthday<br>' +
              '• Where you live or go to school<br>' +
              '• Phone number or email<br>' +
              '• Photos of yourself<br><br>' +
              '<strong>What to do:</strong><br>' +
              'Don\'t answer these questions. Tell a parent or guardian.';
  } else if (threat.category === 'meeting_request' || threat.primaryThreat === 'meeting_request') {
    message = 'Someone wants to meet you in person. Never meet someone from online without a parent present.';
    details = '<strong>This is dangerous because:</strong><br>' +
              '• You don\'t really know who this person is<br>' +
              '• They could be lying about their identity<br>' +
              '• Meeting strangers can be very dangerous<br><br>' +
              '<strong>What to do:</strong><br>' +
              'Say no and tell your parent immediately.';
  } else {
    message = 'This message may not be safe. Please be careful and talk to a trusted adult if you feel uncomfortable.';
    details = '<strong>Safety reminder:</strong><br>' +
              '• Trust your instincts<br>' +
              '• Talk to parents about online interactions<br>' +
              '• Never share personal information<br>' +
              '• Block and report suspicious people';
  }

  warningMessage.textContent = message;
  warningDetails.innerHTML = details;

  // Show modal
  warningModal.style.display = 'flex';
}

// Initial console message
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('🧪 SAFEGUARD KIDS - CHAT SIMULATOR');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('This is a test chat interface for SafeGuard Kids.');
console.log('');
console.log('Features:');
console.log('  • Type messages to test text analysis');
console.log('  • Upload images to test image analysis');
console.log('  • Real-time threat scoring');
console.log('  • Detailed console logging');
console.log('  • Child warning modals for threats (7+)');
console.log('');
console.log('Each message you send will be analyzed by SafeGuard\'s AI agents.');
console.log('Check this console for detailed analysis results!');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
