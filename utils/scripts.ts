/**
 * Automation Scripts for Flippo
 * These scripts are injected into the WebView to interact with marketplace pages.
 */

export const SCRIPTS = {
  // Scrapes notification badge count from a generic site structure
  SCRAPE_NOTIFICATIONS: `
    (function() {
      // Simulation: Try to find common badge elements
      const badge = document.querySelector('.badge-count, .notification-bubble, [aria-label*="notif"]');
      const count = badge ? parseInt(badge.innerText, 10) : 0;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NOTIFICATION_UPDATE', count: count || 0 }));
    })();
  `,

  // Fills a generic form with Item Data
  AUTO_COMPILE: (item: { title: string; price: string; description: string }) => `
    (function() {
      // "Smart Heuristic" Engine: No AI, just fuzzy logic matching
      function findBestInput(keywords, type = 'input') {
          const candidates = Array.from(document.querySelectorAll(type));
          let bestMatch = null;
          let maxScore = 0;

          candidates.forEach(el => {
              if (el.offsetParent === null) return; // Skip hidden
              if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') return;

              let score = 0;
              const attr = (el.id + ' ' + el.name + ' ' + el.placeholder + ' ' + (el.getAttribute('aria-label')||'')).toLowerCase();
              
              keywords.forEach(kw => {
                  if (attr.includes(kw)) score += 5;
                  if (attr === kw) score += 10;
              });

              // Bonus for standard attributes
              if (type === 'textarea' && attr.includes('desc')) score += 5;
              if (type === 'input' && attr.includes('price')) score += 5;

              if (score > maxScore) {
                  maxScore = score;
                  bestMatch = el;
              }
          });
          return bestMatch;
      }

      function fill(el, value) {
          if (!el) return;
          el.focus();
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.blur();
      }

      // 1. Find Title
      const titleKw = ['title', 'titolo', 'subject', 'nome', 'name', 'what', 'cosa', 'vendo', 'oggetto'];
      const titleInput = findBestInput(titleKw, 'input');
      if (titleInput) fill(titleInput, '${item.title}');

      // 2. Find Price
      // Often numeric input, or text with currency placeholder
      const priceKw = ['price', 'prezzo', 'euro', 'amount', 'cifra'];
      const priceInput = findBestInput(priceKw, 'input');
      if (priceInput) fill(priceInput, '${item.price}');

      // 3. Find Description
      const descKw = ['desc', 'body', 'testo', 'info', 'text', 'storia'];
      const descInput = findBestInput(descKw, 'textarea'); 
      // Fallback to div[contenteditable] if complex editor (future upgrade)
      if (descInput) fill(descInput, '${item.description.replace(/\n/g, '\\n')}');

      const msg = titleInput ? '✅ Auto-Filled via Smart Logic' : '⚠️ Could not auto-detect fields';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg }));
      alert(msg);
    })();
  `,

  // Anti-Bot: Advanced Hardening for Vinted/Cloudflare
  ANTI_BOT_SCRIPT: `
    (function() {
      try {
        // 1. Mask WebDriver & Automation properties
        const newProto = navigator.__proto__;
        delete newProto.webdriver;
        navigator.__proto__ = newProto;
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
        
        // 2. Mock Plugins (iOS typically has 0, but preventing empty array checks sometimes helps)
        // Actually for iOS Safari, plugins is usually empty length 0 but defined.
        Object.defineProperty(navigator, 'plugins', { get: () => [], enumerable: true });
        Object.defineProperty(navigator, 'mimeTypes', { get: () => [], enumerable: true });

        // 3. Mock Languages - Italian
        Object.defineProperty(navigator, 'languages', { get: () => ['it-IT', 'it', 'en-US', 'en'], enumerable: true });
        Object.defineProperty(navigator, 'language', { get: () => 'it-IT', enumerable: true });

        // 4. Hardware Concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 6, enumerable: true });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, enumerable: true });

        // 5. Mask Automation Variables (Selenium, etc)
        const keywords = [
          'cdc_adoQpoasnfa76pfcZLmcfl_Array', 
          'cdc_adoQpoasnfa76pfcZLmcfl_Promise', 
          'cdc_adoQpoasnfa76pfcZLmcfl_Symbol',
          '$chrome_asyncScriptInfo',
          '__webdriver_evaluate',
          '__selenium_evaluate',
          '__webdriver_script_function',
          '__webdriver_script_func',
          '__webdriver_script_fn',
          '__fxdriver_evaluate',
          '__driver_evaluate',
          'webdriver-evaluate',
          'selenium-evaluate',
          'webdriverCommand',
          'webdriver-evaluate-response',
          '__webdriverFunc',
          '__$webdriverAsyncExecutor',
          '__lastWatirAlert',
          '__lastWatirConfirm',
          '__lastWatirPrompt',
          '$chrome_asyncScriptInfo',
          '$cdc_asdjflasutopfhvcZLmcfl_'
        ];
        
        keywords.forEach(k => {
            try { 
                delete window[k]; 
                Object.defineProperty(window, k, { get: () => undefined });
            } catch(e) {}
        });

        // 6. Override Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // 7. Touch Support (Essential for mobile detection)
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, enumerable: true });
        
        // 8. Visual Viewport & Screen
        // Ensure screen dimensions match a typical mobile device (e.g. 390x844 for iPhone 13/14)
        // This is skipped if window.top matches, but for iframe/webview it helps consistency
        if (!window.visualViewport) {
             window.visualViewport = { width: window.innerWidth, height: window.innerHeight };
        }

      } catch (e) {
          // Silent fail
      }
    })();
  `
};

