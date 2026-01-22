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
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NOTIFICATION_UPDATE', count: count || 0 }));
      }
    })();
  `,

    // Generic Configurable Auto-Fill
    AUTO_COMPILE: (item: {
        title: string;
        price: string;
        description: string;
        category?: string;
        brand?: string;
        size?: string;
        condition?: string;
        color?: string;
        material?: string;
        images?: string[]
    }, selectors: any) => `
    (async function() {
      try {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const config = ${JSON.stringify(selectors || {})};
        
        console.log('✅ Injected Auto-Fill with config:', config);

        // Helper to find element by multiple selectors
        function findElement(selConfig) {
            if (!selConfig) return null;
            let el = null;
            
            // Try Main Selector
            if (selConfig.main) {
                el = document.querySelector(selConfig.main);
            }
            // Try Backup Selector
            if (!el && selConfig.backup) {
                el = document.querySelector(selConfig.backup);
            }
            return el;
        }

        async function fillInput(el, value) {
            if (!el) return;
            el.focus();
            el.click();
            await sleep(50);
            
            try {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                    'value'
                ).set;
                nativeInputValueSetter.call(el, value);
            } catch (e) {
                el.value = value;
            }
            
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(100);
            el.blur();
        }

        async function handleAction(key, value) {
             const fieldConfig = config[key];
             if (!fieldConfig || !value) return;

             const el = findElement(fieldConfig);
             if (!el) {
                 console.log('Element not found for:', key);
                 return;
             }
             
             console.log('Processing:', key, fieldConfig.type, value);

             switch (fieldConfig.type) {
                 case 'text':
                 case 'number': // Treat number as text input
                     await fillInput(el, value);
                     break;
                 
                 case 'dropdown_click':
                 case 'click':
                     // Just click the element (usually opens a dropdown)
                     // Logic for selecting the specific item inside would be complex to genericize perfectly without more config
                     // For now simple click to open
                     el.click();
                     break;

                 case 'search_select':
                     // Type and then click result? (Simplified for now)
                     await fillInput(el, value);
                     // Simulate Enter?
                     el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                     break;
                 
                 case 'visual_click':
                    // Click a visual element (like package size)
                     el.click();
                     break;
             }
        }

        // --- EXECUTION LOOP ---
        
        // 1. Text Fields
        await handleAction('titolo', ${JSON.stringify(item.title)});
        await sleep(200);
        await handleAction('descrizione', ${JSON.stringify(item.description)});
        await sleep(200);
        
        // Scrub price before sending
        const cleanPrice = ${JSON.stringify(item.price)}.replace(/[^0-9.,]/g, '').trim();
        await handleAction('prezzo', cleanPrice);
        await sleep(200);

        // 2. Dropdowns (Best Effort)
        // Note: The mapping keys here must match the keys in the JSON keys
        await handleAction('categoria', ${JSON.stringify(item.category)});
        await handleAction('brand', ${JSON.stringify(item.brand)});
        await handleAction('condizione', ${JSON.stringify(item.condition)});
        await handleAction('colore', ${JSON.stringify(item.color)});
        
        // Special case: Package size (usually logic based, here hardcoded default or just click configured)
        await handleAction('dimensione_pacco', 'default'); 

        // 3. Images
        const images = ${JSON.stringify(item.images || [])};
        const photoConfig = config['foto_input'];
        
        if (images.length > 0 && photoConfig) {
             const fileInput = findElement(photoConfig);
             if (fileInput) {
                 try {
                    const files = await Promise.all(images.map(async (b64, i) => {
                        const parts = b64.split(';base64,');
                        const contentType = parts[0].split(':')[1];
                        const raw = window.atob(parts[1]);
                        const uInt8Array = new Uint8Array(raw.length);
                        for (let j = 0; j < raw.length; ++j) {
                            uInt8Array[j] = raw.charCodeAt(j);
                        }
                        return new File([new Blob([uInt8Array], { type: contentType })], 'img_'+i+'.jpg', { type: contentType });
                    }));

                    const dataTransfer = new DataTransfer();
                    files.forEach(f => dataTransfer.items.add(f));
                    
                    if (fileInput.tagName === 'INPUT' && fileInput.type === 'file') {
                        Object.defineProperty(fileInput, 'files', { value: dataTransfer.files, writable: false });
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                         // Drag Drop simulation if configured? (out of scope for now)
                    }
                    console.log('Images injected');
                 } catch (e) {
                     console.error('Image Error', e);
                 }
             }
        }

        const msg = '✅ Auto-Fill Dynamic Completed';
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg }));
        }
      } catch (e) {
        console.error('Script Error', e);
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.message }));
      }
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

