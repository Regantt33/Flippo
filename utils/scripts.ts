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

    // Fills a generic form with Item Data and Images
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
    }) => `
    (async function() {
      try {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // "Smart Heuristic" Engine: No AI, just fuzzy logic matching
        function findBestInput(keywords, type = 'input') {
            const candidates = Array.from(document.querySelectorAll(type));
            let bestMatch = null;
            let maxScore = 0;

            candidates.forEach(el => {
                if (el.offsetParent === null) return; // Skip hidden
                if (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'submit') return;

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

        function scrubPrice(val) {
            if (!val) return '';
            // Remove Euro symbol or other currency if present to avoid doubling
            return val.replace(/[^0-9.,]/g, '').trim();
        }

        async function fill(el, value) {
            if (!el) return;
            
            // Focus and click to trigger any activation handlers
            el.focus();
            el.click();
            await sleep(50);

            // Set value using property descriptor to bypass some React internal interceptions
            try {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                    'value'
                ).set;
                nativeInputValueSetter.call(el, value);
            } catch (e) {
                el.value = value;
            }

            // Dispatch events to notify the framework (React/Vue/etc)
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Extra events for some libraries
            el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            
            await sleep(50);
            el.blur();
        }

        async function fillCategory(category) {
            if (!category) return;
            console.log('Filling category:', category);
            
            // Vinted: Extreme Category Handling
            if (window.location.host.includes('vinted')) {
                try {
                    const selectors = ['[name="catalog_id"]', '.catalog-select', '[aria-label*="categoria"]', '.v-select__selection'];
                    let btn = null;
                    for (const s of selectors) {
                        btn = document.querySelector(s);
                        if (btn) break;
                    }
                    if (btn) {
                        btn.click();
                        await sleep(600);
                        // Vinted often has search in the dropdown
                        const searchInput = document.querySelector('input[placeholder*="cerca"], input[placeholder*="search"], .v-input__field');
                        if (searchInput) {
                            await fill(searchInput, category);
                            await sleep(800);
                            // Find best match in suggestions
                            const suggestions = Array.from(document.querySelectorAll('li, .v-list-item, .v-select__option'));
                            const best = suggestions.find(s => s.innerText.toLowerCase().includes(category.toLowerCase()));
                            if (best) {
                                best.click();
                                await sleep(400);
                                // Sometimes it's a 2-level menu
                                const secondary = Array.from(document.querySelectorAll('li, .v-list-item')).find(s => s.innerText.toLowerCase().includes(category.toLowerCase()));
                                if (secondary) secondary.click();
                            }
                        }
                    }
                } catch (e) { console.log('Vinted category error', e); }
            }
            
            // eBay: Category suggestion
            if (window.location.host.includes('ebay')) {
                try {
                    const searchBox = document.querySelector('#category-search-box, [aria-label*="category"], input[name*="category"]');
                    if (searchBox) {
                        await fill(searchBox, category);
                        await sleep(1000);
                        const suggest = document.querySelector('.category-suggestion, .suggest-item, .category-search-results li');
                        if (suggest) suggest.click();
                    }
                } catch (e) {}
            }

            // Subito: Category tree
            if (window.location.host.includes('subito')) {
                try {
                    // Category Selection on Subito can be a large list or a series of cards
                    const catItems = Array.from(document.querySelectorAll('.category-item, [class*="CategoryItem"], .tag, li, button'));
                    const bestCat = catItems.find(el => el.innerText.toLowerCase().includes(category.toLowerCase()));
                    if (bestCat) {
                        bestCat.click();
                        await sleep(800);
                        // Sometimes there is a 'Confirm' or 'Next' button after category
                        const nextBtn = document.querySelector('button[type="submit"], .next-button, [class*="Button-primary"]');
                        if (nextBtn && nextBtn.innerText.toLowerCase().includes('continua')) nextBtn.click();
                    }

                    // Field Selectors for Subito Listing Page
                    await fillField(['title', 'subject', 'nome oggetto'], ${JSON.stringify(item.title)});
                    await fillField(['description', 'testo dell', 'corpo'], ${JSON.stringify(item.description)}, 'textarea');
                    await fillField(['price', 'prezzo'], scrubPrice(${JSON.stringify(item.price)}));
                } catch (e) { console.log('Subito error', e); }
            }
        }

        async function fillField(keywords, value, type = 'input') {
            if (!value) return;
            console.log('Filling field:', keywords[0], 'with', value);
            const input = findBestInput(keywords, type);
            if (input) await fill(input, value);
        }

        async function fillAllText() {
            console.log('Filling text fields...');
            
            // 0. Category & Title (Critical)
            await fillCategory(${JSON.stringify(item.category)});
            await sleep(300);
            
            await fillField(['title', 'titolo', 'subject', 'nome', 'name', 'what'], ${JSON.stringify(item.title)});
            await sleep(200);

            // 1. Price (Robust)
            const cleanPrice = scrubPrice(${JSON.stringify(item.price)});
            if (cleanPrice) {
                console.log('Attempting to fill price:', cleanPrice);
                await fillField(['price', 'prezzo', 'euro', 'amount', 'cifra', 'value', 'totale'], cleanPrice);
                
                // Backup Specific Selector for Vinted/eBay/Subito
                const extraSelectors = [
                    'input[name="price"]', 'input[id="price"]', 
                    'input[aria-label*="Prezzo"]', 'input[aria-label*="Price"]', 
                    'input[placeholder*="€"]', 'input[placeholder*="0,00"]',
                    '[data-testid*="price"]', '.v-input__field--price'
                ];
                for (const sel of extraSelectors) {
                    const el = document.querySelector(sel);
                    if (el && !el.value) await fill(el, cleanPrice);
                }
            }
            
            // 2. Brand & Size
            await fillField(['brand', 'marca', 'designer'], ${JSON.stringify(item.brand)});
            await fillField(['size', 'taglia', 'misura', 'dimensione'], ${JSON.stringify(item.size)});
            
            // 3. Condition & Color
            await fillField(['condition', 'stato', 'condizione'], ${JSON.stringify(item.condition)});
            await fillField(['color', 'colore', 'tinta'], ${JSON.stringify(item.color)});

            // 4. Description (Last to avoid reset)
            await fillField(['desc', 'body', 'testo', 'info', 'text'], ${JSON.stringify(item.description)}, 'textarea');
        }

        console.log('Starting Flippo Persistent Auto-Fill...');

        // FIRST PASS: Fill text immediately
        await fillAllText();

        await sleep(500);

        // IMAGE PASS: Inject images
        const images = ${JSON.stringify(item.images || [])};
        if (images && images.length > 0) {
            try {
                const dropZoneSelectors = [
                    '.drag-drop__input', 'input[type="file"]', '.upload-zone', 
                    '.uploader', '.image-upload-container', '[aria-label*="upload"]',
                    '[aria-label*="carica"]', '#photos-upload', '[data-testid="file-input"]'
                ];
                
                let target = null;
                for (const sel of dropZoneSelectors) {
                    target = document.querySelector(sel);
                    if (target) break;
                }

                if (target) {
                    const files = await Promise.all(images.map(async (b64, i) => {
                        try {
                            const parts = b64.split(';base64,');
                            const contentType = parts[0].split(':')[1];
                            const raw = window.atob(parts[1]);
                            const rawLength = raw.length;
                            const uInt8Array = new Uint8Array(rawLength);
                            for (let j = 0; j < rawLength; ++j) {
                                uInt8Array[j] = raw.charCodeAt(j);
                            }
                            const blob = new Blob([uInt8Array], { type: contentType });
                            return new File([blob], 'image_' + i + '.jpg', { type: contentType });
                        } catch (e) { 
                            console.error('Image processing error', e);
                            return null; 
                        }
                    }));

                    const validFiles = files.filter(f => f !== null);
                    const dataTransfer = new DataTransfer();
                    validFiles.forEach(file => dataTransfer.items.add(file));

                    const dropEvent = new DragEvent('drop', {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: dataTransfer
                    });
                    
                    if (target.tagName === 'INPUT' && target.type === 'file') {
                        Object.defineProperty(target, 'files', { value: dataTransfer.files, writable: false });
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        target.dispatchEvent(dropEvent);
                    }
                    console.log('Images injected');
                }
            } catch (e) { console.error('Image injection error', e); }
        }

        // WAIT AND RE-FILL: Some SPAs reset forms when images are added
        // We wait for the potential state reset to happen, then fill again.
        await sleep(2000); 
        console.log('Second pass to persist text...');
        await fillAllText();

        const msg = '✅ Auto-Fill Persistent Completed';
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg }));
        }
        alert(msg);
      } catch (globalError) {
        console.error('Global injection error:', globalError);
        alert('Injection Error: ' + globalError.message);
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

