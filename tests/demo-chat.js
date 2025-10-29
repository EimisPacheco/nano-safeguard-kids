async function testMessage(button, testId, messageType) {
  const resultDiv = document.getElementById('result-' + testId);
  const message = button.previousElementSibling.textContent.trim();

  // Show loading state
  button.disabled = true;
  button.textContent = 'Analyzing...';
  resultDiv.className = 'result';
  resultDiv.textContent = '🔄 Running AI analysis...';
  resultDiv.classList.add('show');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST MESSAGE SIMULATION');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Test ID:', testId);
  console.log('Message Type:', messageType);
  console.log('Message:', message);
  console.log('───────────────────────────────────────────────────────────────────');

  try {
    // Send message to service worker for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeText',
      data: {
        text: message,
        type: messageType,
        platform: 'test-chat',
        timestamp: Date.now(),
        tensorflowResult: null
      }
    });

    console.log('Analysis Response:', response);

    // Display result
    if (response.threat) {
      const level = response.threat.level;
      const severity = response.threat.severity;
      const warning = response.threat.warning;

      let className = 'safe';
      let emoji = '✅';
      if (level >= 7) {
        className = 'danger';
        emoji = '🚨';
      } else if (level >= 4) {
        className = 'warning';
        emoji = '⚠️';
      }

      resultDiv.className = 'result show ' + className;
      resultDiv.innerHTML = `
        <strong>${emoji} Analysis Complete</strong><br>
        <strong>Threat Level:</strong> ${level}/10 (${severity})<br>
        <strong>Category:</strong> ${response.threat.category || 'N/A'}<br>
        <strong>Warning:</strong> ${warning || 'No warning'}
      `;
    } else if (response.safe) {
      resultDiv.className = 'result show safe';
      resultDiv.innerHTML = `
        <strong>✅ Message is SAFE</strong><br>
        No threats detected. This appears to be a normal, friendly conversation.
      `;
    } else if (response.error) {
      resultDiv.className = 'result show warning';
      resultDiv.innerHTML = `
        <strong>⚠️ Analysis Error</strong><br>
        ${response.error}
      `;
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('Test error:', error);
    resultDiv.className = 'result show warning';
    resultDiv.innerHTML = `
      <strong>❌ Error</strong><br>
      ${error.message || 'Failed to analyze message'}
    `;
  }

  // Reset button
  button.disabled = false;
  button.textContent = `Test This Message (${messageType === 'sent' ? 'Sent by Child' : 'Received'})`;
}

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get all test buttons and attach event listeners
  const buttons = [
    { id: 'grooming-critical', type: 'received' },
    { id: 'pii-request', type: 'received' },
    { id: 'pii-sharing', type: 'sent' },
    { id: 'manipulation', type: 'received' },
    { id: 'sexual-content', type: 'received' },
    { id: 'safe-message', type: 'received' },
    { id: 'secrecy', type: 'received' }
  ];

  buttons.forEach(({ id, type }) => {
    const button = document.getElementById(`btn-${id}`);
    if (button) {
      button.addEventListener('click', function() {
        testMessage(this, id, type);
      });
    }
  });

  console.log('🧪 Test Interface loaded');
  console.log('Click any "Test This Message" button to simulate threat detection');
});
