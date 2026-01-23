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
  `,

    // Intelligent Auto-Fill using Window AI (Gemini Nano)
    AUTO_FILL_SMART: (item: any) => `
    (async function() {
        const LOG_PREFIX = '[Selly AI]';
        console.log(\`\${LOG_PREFIX} Initializing Smart Autofill v2 (Optimized)...\`);

        // --- UTILS ---
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        function isVisible(elem) {
            // Optimization: check cheap properties first
            if (!elem) return false;
            if (elem.type === 'hidden') return false; 
            
            // Layout Thrashing protection: only compute style if necessary
            // We assume if it has no offset dimensions, it's not visible
            if (elem.offsetWidth === 0 && elem.offsetHeight === 0) return false;

            const style = window.getComputedStyle(elem);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            return true;
        }

        async function fillInputResilient(el, value) {
            if (!el) return;
            // console.log(\`\${LOG_PREFIX} Filling \${el.id || el.name}\`); // Reduce verbose logging for perf
            
            // Only scroll if needed (check visibility in viewport)
            const rect = el.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                 el.scrollIntoView({ behavior: 'auto', block: 'center' }); // 'auto' is faster than 'smooth'
                 await sleep(50);
            }

            el.focus();
            // await sleep(10); // Reduce sleeps
            
            // React/Vue setter hack
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
            el.blur();
        }

        // --- DOM ANALYSIS ---
        function scanPageContext() {
            // Optimization: Limit the query to avoid checking thousands of nodes
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, select'));
            
            // Batch visibility checks? 
            // Currently sequential, but filtered by offset dimensions first in isVisible
            const candidates = [];
            for (let i = 0; i < inputs.length; i++) {
                const el = inputs[i];
                if (isVisible(el)) {
                     // Extraction Logic
                     let labelText = '';
                     if (el.id) {
                        const labelEl = document.querySelector(\`label[for="\${el.id}"]\`);
                        if (labelEl) labelText = labelEl.innerText;
                     }
                     if (!labelText) {
                        const parentLabel = el.closest('label');
                        if (parentLabel) labelText = parentLabel.innerText;
                     }
                     if (!labelText) labelText = el.getAttribute('aria-label') || '';
                     if (!labelText) labelText = el.placeholder || '';
                     
                     if (labelText) {
                         labelText = labelText.replace(/\\n/g, ' ').trim();
                         if (labelText.length > 50) labelText = labelText.substring(0, 50); // Truncate long labels
                     }

                     candidates.push({
                        tempId: \`field_\${i}\`,
                        element: el,
                        descReference: {
                            id: el.id,
                            name: el.name,
                            type: el.type || el.tagName.toLowerCase(),
                            label: labelText,
                            placeholder: el.placeholder
                        }
                     });
                }
            }
            return candidates;
        }

        // --- HEURISTIC MATCHING ---
        function runHeuristicMatching(itemData, candidates) {
             const mapping = {};
             // Optimized keywords (IT, EN, FR, DE, ES)
             const targets = [
                 { key: 'title', keywords: ['titolo', 'nome', 'oggetto', 'title', 'name', 'titre', 'nom', 'titel', 'nombre', 'titulo'] },
                 { key: 'description', keywords: ['descrizione', 'dettagli', 'description', 'info', 'beschreibung', 'details', 'descripcion'] },
                 { key: 'price', keywords: ['prezzo', 'euro', 'price', 'prix', 'preis', 'precio', 'importo', 'amount'] },
                 { key: 'category', keywords: ['categoria', 'category', 'settore', 'categorie', 'kategorie', 'clase'] },
                 { key: 'brand', keywords: ['brand', 'marca', 'produttore', 'marque', 'marke'] },
                 { key: 'condition', keywords: ['condizione', 'stato', 'condition', 'etat', 'zustand', 'estado', 'condiciones'] }
             ];

             const usedIds = new Set();

             // Limit candidates for Heuristics to avoid N*M complexity on large forms
             const limitCandidates = candidates.slice(0, 30); 

             targets.forEach(target => {
                 let bestScore = 0;
                 let bestCandidateId = null;

                 limitCandidates.forEach(c => {
                     if (usedIds.has(c.tempId)) return;
                     const textToScan = (c.descReference.label + ' ' + c.descReference.placeholder + ' ' + c.descReference.name + ' ' + c.descReference.id).toLowerCase();
                     
                     let score = 0;
                     target.keywords.forEach(kw => {
                         if (textToScan.includes(kw)) score += 10;
                     });
                     
                     if (score > 0) {
                         if (target.key === 'description' && c.descReference.type === 'textarea') score += 15;
                         if (target.key === 'title' && c.descReference.type === 'text') score += 5;
                         if (target.key === 'price' && (c.descReference.type === 'number' || c.descReference.type === 'tel')) score += 10;
                     }

                     if (score > bestScore) {
                         bestScore = score;
                         bestCandidateId = c.tempId;
                     }
                 });

                 if (bestCandidateId) {
                     let value = itemData[target.key] || (itemData.details ? itemData.details[target.key] : '');
                     if (value) {
                         if (target.key === 'price') value = value.replace(/[^0-9.,]/g, '').trim();
                         mapping[bestCandidateId] = value;
                         usedIds.add(bestCandidateId);
                     }
                 }
             });

             return mapping;
        }

        // --- AI EXECUTION ---
        async function runAIMatching(itemData, candidates) {
            if (!window.ai) return runHeuristicMatching(itemData, candidates);
            
            // Limit payload size for AI
            const safeCandidates = candidates.slice(0, 15); // Only send top 15 visible fields to AI

            const itemContext = JSON.stringify({
                title: itemData.title,
                price: itemData.price,
                description: itemData.description,
                category: itemData.category, // e.g., "Fashion"
                condition: itemData.condition
            });

            const fieldsContext = JSON.stringify(safeCandidates.map(c => ({
                tempId: c.tempId,
                ...c.descReference
            })));

            const prompt = \`Match Item to Fields.
Item: \${itemContext}
Fields: \${fieldsContext}

Rules:
1. Return JSON { "tempId": "value" }.
2. TRANSLATE values to the language of the Fields if necessary (e.g. if field is "Kategorie" (DE) and value is "Fashion", fill "Mode" or "Kleidung").
3. For Category/Brand, assume the best matching text.
\`;


            try {
                const session = await window.ai.languageModel.create();
                const response = await session.prompt(prompt);
                const cleanJson = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                return JSON.parse(cleanJson);
            } catch (e) {
                return runHeuristicMatching(itemData, candidates);
            }
        }

        // --- IMAGE INJECTION ---
        async function handleImageInjection(images) {
             if (!images || images.length === 0) return;
             // Quick check for existing file input
             let fileInput = document.querySelector('input[type="file"]');
             if (!fileInput) {
                  // Only search deeper if explicit not found
                  const allFiles = document.querySelectorAll('input[type="file"]');
                  if (allFiles.length > 0) fileInput = allFiles[0]; 
             }
             if (!fileInput) return;

             // Check if already injected to avoid loops
             if (fileInput.dataset.sellyInjected) return;

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
                
                Object.defineProperty(fileInput, 'files', { value: dataTransfer.files, writable: false });
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Mark as injected
                fileInput.dataset.sellyInjected = 'true';
                console.log(\`\${LOG_PREFIX} Images injected.\`);
             } catch (e) {}
        }

        // --- ORCHESTRATOR ---
        const itemInfo = ${JSON.stringify(item)};
        let isRunning = false;

        async function executeSmartFill() {
            if (isRunning) return;
            isRunning = true;
            
            // Temporary disconnect observer
            if (window.sellyObserver) window.sellyObserver.disconnect();

            try {
                const candidates = scanPageContext();
                if (candidates.length > 0) {
                    const mapping = await runAIMatching(itemInfo, candidates);
                    if (mapping) {
                        for (const [tempId, value] of Object.entries(mapping)) {
                            const candidate = candidates.find(c => c.tempId === tempId);
                            // Only fill if empty to avoid fighting user
                            if (candidate && candidate.element && !candidate.element.value) {
                                await fillInputResilient(candidate.element, value);
                            }
                        }
                    }
                }
                
                if (itemInfo.images && itemInfo.images.length > 0) {
                    await handleImageInjection(itemInfo.images);
                }

            } catch(e) { console.error(e); }
            
            isRunning = false;
            // Re-connect observer
            if (window.sellyObserver) window.sellyObserver.observe(document.body, { childList: true, subtree: true });
        }

        // Initial Run
        await executeSmartFill();

        // Optimized Mutation Observer
        let observerTimeout;
        window.sellyObserver = new MutationObserver((mutations) => {
            // Check if mutations are relevant (ignore style changes, look for addedNodes)
            let relevant = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    relevant = true; 
                    break;
                }
            }
            if (!relevant) return;

            clearTimeout(observerTimeout);
            // Increased debounce to 3000ms to allow UI animations to settle
            observerTimeout = setTimeout(() => {
                console.log(\`\${LOG_PREFIX} Relevant mutation, re-running...\`);
                executeSmartFill();
            }, 3000);
        });

        window.sellyObserver.observe(document.body, { childList: true, subtree: true });
        console.log(\`\${LOG_PREFIX} Observer active.\`);
        
    })();
    `
};

