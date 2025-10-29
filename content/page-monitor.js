/**
 * SafeGuard Kids - Web Page Monitor
 * Detects pornographic content on all web pages
 */

class PageMonitor {
  constructor() {
    this.enabled = false;
    this.mode = 'active';
    this.analyzed = false;
    this.init();
  }

  async init() {
    console.log('[SafeGuard Page] Initializing page monitor...');

    try {
      // CRITICAL: Clean up immediately and aggressively
      // This ensures old blur effects from previous pages are removed
      this.cleanupBlurEffects();

      // Get settings
      const settings = await this.getSettings();
      this.enabled = settings.enabled !== false;
      this.mode = settings.mode || 'active';

      if (!this.enabled) {
        console.log('[SafeGuard Page] Page monitoring disabled');
        return;
      }

      console.log(`[SafeGuard Page] Page monitor active in ${this.mode} mode`);

      // Analyze page after brief delay (service worker now uses STRICT domain checking only)
      // This won't cause false positives because service worker only flags known porn domains
      setTimeout(() => {
        this.analyzePage();
      }, 1000);

      // Listen for page unload to clean up
      window.addEventListener('beforeunload', () => {
        this.cleanupBlurEffects();
      });

      // Also clean up when page becomes visible (in case of tab switching)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Double-check cleanup when tab becomes visible
          this.cleanupBlurEffects();
        }
      });

    } catch (error) {
      console.error('[SafeGuard Page] Error initializing:', error);
    }
  }

  cleanupBlurEffects() {
    console.log('[SafeGuard Page] Cleaning up blur effects...');

    // Remove blur class from body
    if (document.body) {
      document.body.classList.remove('safeguard-page-blurred');

      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.filter = '';
      document.body.style.pointerEvents = '';
      document.body.style.userSelect = '';
      document.body.style.marginTop = '';
    }

    // Remove any existing overlays
    const existingOverlays = document.querySelectorAll('.safeguard-blur-overlay');
    existingOverlays.forEach(overlay => overlay.remove());

    // Remove any warning banners
    const existingBanners = document.querySelectorAll('.safeguard-warning-banner');
    existingBanners.forEach(banner => banner.remove());

    // Remove injected styles
    const injectedStyles = document.getElementById('safeguard-blur-styles');
    if (injectedStyles) {
      injectedStyles.remove();
    }
  }

  injectBlurStyles() {
    // Check if styles already injected
    if (document.getElementById('safeguard-blur-styles')) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'safeguard-blur-styles';
    styleElement.textContent = `
      .safeguard-blur-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.95) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(20px) !important;
        animation: safeguard-fade-in 0.3s ease-out !important;
      }

      @keyframes safeguard-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .safeguard-blur-content {
        background: white !important;
        padding: 40px !important;
        border-radius: 20px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        max-width: 500px !important;
        text-align: center !important;
        animation: safeguard-slide-up 0.4s ease-out !important;
      }

      @keyframes safeguard-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .safeguard-blur-icon {
        font-size: 64px !important;
        margin-bottom: 20px !important;
        animation: safeguard-pulse 2s infinite !important;
      }

      @keyframes safeguard-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .safeguard-blur-title {
        font-size: 24px !important;
        font-weight: 700 !important;
        color: #dc2626 !important;
        margin: 0 0 16px 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      .safeguard-blur-message {
        font-size: 16px !important;
        color: #666 !important;
        line-height: 1.6 !important;
        margin: 0 0 24px 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      .safeguard-blur-info {
        font-size: 14px !important;
        color: #999 !important;
        font-style: italic !important;
        margin: 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      body.safeguard-page-blurred {
        filter: blur(30px) !important;
        pointer-events: none !important;
        user-select: none !important;
        overflow: hidden !important;
      }

      .safeguard-warning-banner {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
        color: white !important;
        padding: 16px 20px !important;
        z-index: 2147483646 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
        animation: safeguard-slide-down 0.3s ease-out !important;
      }

      @keyframes safeguard-slide-down {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }

      .safeguard-warning-content {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .safeguard-warning-icon {
        font-size: 24px !important;
      }

      .safeguard-warning-text {
        font-size: 14px !important;
        font-weight: 600 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      .safeguard-warning-details {
        font-size: 12px !important;
        opacity: 0.9 !important;
        margin-top: 4px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      img.safeguard-blurred-image {
        filter: blur(30px) !important;
        pointer-events: none !important;
        user-select: none !important;
        position: relative !important;
      }

      img.safeguard-blurred-image::after {
        content: '🛡️ Inappropriate Content' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: rgba(220, 38, 38, 0.9) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        z-index: 1000 !important;
      }
    `;

    document.head.appendChild(styleElement);
  }

  async getSettings() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['mode', 'enabled'], (result) => {
            resolve(result);
          });
        } else {
          resolve({ mode: 'active', enabled: true });
        }
      } catch (error) {
        resolve({ mode: 'active', enabled: true });
      }
    });
  }

  analyzePage() {
    if (this.analyzed) return;
    this.analyzed = true;

    console.log('[SafeGuard Page] Analyzing page content...');

    // Collect page content
    const pageContent = this.collectPageContent();

    // Send to background for analysis
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'analyzePageContent',
          data: {
            url: window.location.href,
            title: document.title,
            text: pageContent.text,
            images: pageContent.images,
            keywords: pageContent.keywords,
            timestamp: Date.now()
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[SafeGuard Page] Chrome runtime error:', chrome.runtime.lastError);
          } else if (response && response.blurImages) {
            console.warn('[SafeGuard Page] ⚠️ Inappropriate images detected!', response.blurImages.length, 'images');
            this.blurInappropriateImages(response.blurImages);
          } else if (response && response.threat) {
            console.warn('[SafeGuard Page] ⚠️ Pornographic content detected!', response.threat);
            this.handlePornDetection(response.threat);
          } else {
            console.log('[SafeGuard Page] Page analyzed - safe');
          }
        });
      }
    } catch (error) {
      console.error('[SafeGuard Page] Error analyzing page:', error);
    }
  }

  collectPageContent() {
    const content = {
      text: '',
      images: [],
      keywords: []
    };

    // Collect visible text (limit to first 5000 characters for performance)
    const bodyText = document.body.innerText || document.body.textContent || '';
    content.text = bodyText.substring(0, 5000);

    // Collect meta keywords and description
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      content.keywords.push(...metaKeywords.content.split(',').map(k => k.trim()));
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      content.text += ' ' + metaDescription.content;
    }

    // Collect page title
    content.text = document.title + ' ' + content.text;

    // Collect visible images (limit to first 10 for performance)
    const images = document.querySelectorAll('img');
    let imageCount = 0;
    images.forEach(img => {
      if (imageCount >= 10) return;

      // Skip tiny images (icons, etc)
      if (img.width >= 100 && img.height >= 100 && img.src) {
        content.images.push({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height
        });
        imageCount++;
      }
    });

    return content;
  }

  handlePornDetection(threat) {
    console.warn('[SafeGuard Page] Handling pornographic content detection...');

    // Notify parent (in all modes)
    this.notifyParent(threat);

    // Apply blur effect if in active or both mode
    if (this.mode === 'active' || this.mode === 'both') {
      this.blurPage(threat);
    }
  }

  notifyParent(threat) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'notifyParentPorn',
          data: {
            url: window.location.href,
            title: document.title,
            threat: threat,
            timestamp: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('[SafeGuard Page] Error notifying parent:', error);
    }
  }

  blurPage(threat) {
    console.log('[SafeGuard Page] Applying blur overlay...');

    // Inject CSS styles (only when needed)
    this.injectBlurStyles();

    // Blur the body
    document.body.classList.add('safeguard-page-blurred');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'safeguard-blur-overlay';
    overlay.innerHTML = `
      <div class="safeguard-blur-content">
        <div class="safeguard-blur-icon">🛡️</div>
        <div class="safeguard-blur-title">⚠️ Inappropriate Content Blocked</div>
        <div class="safeguard-blur-message">
          SafeGuard has detected potentially harmful content on this page.
          <br><br>
          <strong>This page has been blocked and your parent has been notified.</strong>
        </div>
        <div class="safeguard-blur-info">
          Threat Level: ${threat.level}/10 | Category: ${threat.category}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
  }

  showWarningBanner(threat) {
    console.log('[SafeGuard Page] Showing warning banner...');

    const banner = document.createElement('div');
    banner.className = 'safeguard-warning-banner';
    banner.innerHTML = `
      <div class="safeguard-warning-content">
        <div class="safeguard-warning-icon">⚠️</div>
        <div>
          <div class="safeguard-warning-text">Potentially Inappropriate Content Detected</div>
          <div class="safeguard-warning-details">Your parent has been notified about this page.</div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Push body content down to avoid covering it
    if (document.body.style.marginTop) {
      document.body.style.marginTop = '60px';
    }
  }

  blurInappropriateImages(imageSources) {
    console.log('[SafeGuard Page] Blurring', imageSources.length, 'inappropriate images...');

    // Inject blur styles if not already present
    this.injectBlurStyles();

    // Find and blur each inappropriate image
    imageSources.forEach(src => {
      // Find all images with this src
      const images = document.querySelectorAll(`img[src="${src}"]`);

      images.forEach(img => {
        // Add blur class
        img.classList.add('safeguard-blurred-image');

        // Wrap image in container with warning overlay
        if (!img.parentElement.classList.contains('safeguard-image-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'safeguard-image-wrapper';
          wrapper.style.cssText = 'position: relative; display: inline-block;';

          const overlay = document.createElement('div');
          overlay.className = 'safeguard-image-overlay';
          overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            z-index: 1000;
            pointer-events: none;
          `;
          overlay.innerHTML = '🛡️<br>Inappropriate<br>Content';

          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
          wrapper.appendChild(overlay);
        }

        console.log('[SafeGuard Page] ✓ Blurred image:', src.substring(0, 50) + '...');
      });
    });

    // Notify parent about inappropriate images
    this.notifyParentAboutImages(imageSources);
  }

  notifyParentAboutImages(imageSources) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'notifyParentPorn',
          data: {
            url: window.location.href,
            title: document.title,
            threat: {
              level: 8,
              category: 'Inappropriate Images',
              details: `${imageSources.length} inappropriate image(s) detected and blurred`
            },
            timestamp: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('[SafeGuard Page] Error notifying parent about images:', error);
    }
  }
}

// Initialize page monitor (only once per page)
if (!window.safeguardPageMonitorInitialized) {
  window.safeguardPageMonitorInitialized = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new PageMonitor();
    });
  } else {
    new PageMonitor();
  }
}
