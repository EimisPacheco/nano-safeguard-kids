function triggerBlur() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔞 PAGE BLUR TEST TRIGGERED');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Simulating detection of inappropriate content...');

  // Apply blur effect to main content
  const mainContent = document.getElementById('mainContent');
  mainContent.classList.add('blur-effect');

  // Show warning overlay
  const overlay = document.getElementById('warningOverlay');
  overlay.classList.add('active');

  // Show status
  const status = document.getElementById('status1');
  status.classList.add('show');

  console.log('✓ Page blurred');
  console.log('✓ Warning overlay shown');
  console.log('✓ User cannot interact with blurred content');
  console.log('');
  console.log('This is what happens when page-monitor.js detects:');
  console.log('- Inappropriate URL patterns (porn, xxx, adult, etc.)');
  console.log('- Known adult website domains');
  console.log('- NSFW keywords in page title or meta tags');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // Send notification to service worker
  chrome.runtime.sendMessage({
    action: 'logPageBlock',
    data: {
      url: window.location.href,
      reason: 'Test: Simulated inappropriate content detection',
      timestamp: Date.now()
    }
  }).catch(err => console.log('Note: Service worker logging skipped in test mode'));
}

function leavePage() {
  console.log('User clicked: Leave This Page');
  alert('In a real scenario, this would navigate back or close the tab.\n\nFor this test, we\'ll just hide the warning.');

  // Remove blur and hide overlay
  document.getElementById('mainContent').classList.remove('blur-effect');
  document.getElementById('warningOverlay').classList.remove('active');

  console.log('Test completed. In production, the child would be taken away from the inappropriate page.');
}

function requestHelp() {
  console.log('User clicked: Get Parent Help');
  alert('In a real scenario, this would:\n1. Send an immediate notification to parent\n2. Log as a "child help request" incident\n3. Optionally send email/SMS to parent\n\nFor this test, check your parent dashboard for logged incidents.');

  // Send help request to service worker
  chrome.runtime.sendMessage({
    action: 'childHelpRequest',
    data: {
      url: window.location.href,
      reason: 'Child requested help from inappropriate page',
      timestamp: Date.now()
    }
  }).catch(err => console.log('Note: Help request logged locally in test mode'));

  console.log('✓ Help request sent to parent');
}

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const triggerBtn = document.getElementById('triggerBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const helpBtn = document.getElementById('helpBtn');

  if (triggerBtn) {
    triggerBtn.addEventListener('click', triggerBlur);
  }
  if (leaveBtn) {
    leaveBtn.addEventListener('click', leavePage);
  }
  if (helpBtn) {
    helpBtn.addEventListener('click', requestHelp);
  }

  console.log('🔞 Page Blur Test loaded');
  console.log('Click the "Simulate Inappropriate Page Detection" button to test the blur feature');
});
