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
    AUTO_FILL_SMART: (item: any, lang: string = 'it') => `
    (async function() {
        const LOG_PREFIX = '[Selly Engine]';
        const LANG = "${lang}";
        
        const MESSAGES = {
            it: {
                analyzing: 'Selly sta analizzando la pagina...',
                usingAI: 'Utilizzo Intelligenza Artificiale...',
                usingHeuristics: 'Utilizzo Motore Euristico Avanzato...',
                insertingPhotos: 'Inserimento foto...',
                completed: 'Completato con successo!',
                photoError: 'Errore durante l\'inserimento delle foto.'
            },
            en: {
                analyzing: 'Selly is analyzing the page...',
                usingAI: 'Using Artificial Intelligence...',
                usingHeuristics: 'Using Advanced Heuristic Engine...',
                insertingPhotos: 'Inserting photos...',
                completed: 'Completed successfully!',
                photoError: 'Error while inserting photos.'
            },
            fr: {
                analyzing: 'Selly analyse la page...',
                usingAI: 'Utilisation de l\'IA...',
                usingHeuristics: 'Utilisation du moteur heuristique...',
                insertingPhotos: 'Insertion de photos...',
                completed: 'Terminé avec succès!',
                photoError: 'Erreur lors de l\'insertion des photos.'
            },
            es: {
                analyzing: 'Selly está analizando la página...',
                usingAI: 'Usando Inteligencia Artificial...',
                usingHeuristics: 'Usando motor heurístico...',
                insertingPhotos: 'Insertando fotos...',
                completed: '¡Completado con éxito!',
                photoError: 'Error al insertar las fotos.'
            },
            de: {
                analyzing: 'Selly analysiert die Seite...',
                usingAI: 'KI wird verwendet...',
                usingHeuristics: 'Heuristische Engine wird verwendet...',
                insertingPhotos: 'Fotos werden eingefügt...',
                completed: 'Erfolgreich abgeschlossen!',
                photoError: 'Fehler beim Einfügen der Fotos.'
            }
        };

        const msg = MESSAGES[LANG] || MESSAGES.en;

        const DICTIONARY = {
            title: [
                'titolo', 'nome', 'oggetto', 'cosa vendi', 'cosa stai vendendo', 'descrivi il tuo oggetto',
                'title', 'name', 'object', 'what are you selling', 'describe your item',
                'titre', 'nom', 'objet', 'que vendez-vous',
                'nombre', 'titulo', 'articulo', 'qué vendes',
                'bezeichnung', 'articulo', 'titel', 'was verkaufen Sie'
            ],
            description: [
                'descrizione', 'dettagli', 'info', 'raccontaci di più', 'descrivi il prodotto',
                'description', 'details', 'tell us more', 'describe the product',
                'beschreibung', 'detail', 'content', 'corpo',
                'descripcion', 'detalles',
                'état'
            ],
            price: [
                'prezzo', 'euro', '€', 'costo', 'importo', 'valore', 'quanto costa',
                'price', 'amount', 'cost', 'value', 'asking price',
                'prix', 'montant',
                'preis', 'betrag',
                'precio', 'importe'
            ],
            category: [
                'categoria', 'settore', 'reparto', 'genere',
                'category', 'department', 'type', 'genre',
                'categorie', 'rubrique',
                'kategorie', 'bereich',
                'clase', 'rubro'
            ],
            brand: [
                'brand', 'marca', 'produttore', 'griffe', 'stilista',
                'brandname', 'maker', 'designer',
                'marque',
                'marke', 'hersteller'
            ],
            size: [
                'taglia', 'dimensione', 'misura', 'formato',
                'size', 'dimension', 'measurement', 'scale',
                'taille',
                'größe', 'maße',
                'talla', 'medida'
            ],
            condition: [
                'condizione', 'stato', 'usura', 'come nuovo',
                'condition', 'status', 'wear', 'as new',
                'etat',
                'zustand',
                'estado'
            ],
            color: [
                'colore', 'tinta', 'sfumatura',
                'color', 'colour', 'shade', 'hue',
                'couleur',
                'farbe',
                'color'
            ],
            material: [
                'materiale', 'tessuto', 'composizione',
                'material', 'fabric', 'composition',
                'matière', 'tissu',
                'stoff', 'material',
                'tejido', 'material'
            ],
            quantity: [
                'quantità', 'pezzi', 'n.', 'quantity', 'amount', 'stock', 'qty', 'anzahl', 'stücke', 'cantidad'
            ]
        };

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // --- UI HUD ---
        function showHUD(message, isSuccess = false) {
            let hud = document.getElementById('selly-hud');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'selly-hud';
                Object.assign(hud.style, {
                    position: 'fixed', bottom: '20px', left: '20px', right: '20px',
                    backgroundColor: '#1C1C1E', color: '#FFF', padding: '12px 16px',
                    borderRadius: '12px', zIndex: '999999', fontSize: '13px',
                    fontWeight: '700', fontFamily: '-apple-system, system-ui',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex',
                    alignItems: 'center', transition: 'all 0.3s ease',
                    opacity: '0', transform: 'translateY(10px)'
                });
                document.body.appendChild(hud);
                setTimeout(() => { hud.style.opacity = '1'; hud.style.transform = 'translateY(0)'; }, 10);
            }
            hud.innerHTML = \`<span style="color: \${isSuccess ? '#34C759' : '#D66D45'}; margin-right: 8px;">●</span> \${message}\`;
            if (isSuccess) setTimeout(() => { hud.style.opacity = '0'; }, 3000);
        }

        // --- DISCOVERY ENGINE ---
        function findLabelFor(el) {
            // 1. Explicit label
            if (el.id) {
                const explicit = document.querySelector(\`label[for="\${el.id}"]\`);
                if (explicit && explicit.innerText.trim()) return explicit.innerText.trim();
            }
            // 2. Wrap label
            const wrapped = el.closest('label');
            if (wrapped && wrapped.innerText.trim()) return wrapped.innerText.trim();
            
            // 3. Aria-labels & Title
            const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '';
            if (ariaLabel.length > 2) return ariaLabel;

            // 4. Proximity search (search siblings and parent's previous siblings)
            let current = el;
            for (let i = 0; i < 3; i++) {
                if (!current) break;
                // Check siblings
                let prev = current.previousElementSibling;
                while (prev) {
                    const text = prev.innerText || prev.textContent || '';
                    if (text.trim().length > 2) return text.trim();
                    prev = prev.previousElementSibling;
                }
                // Go to parent
                current = current.parentElement;
                if (current) {
                    const header = current.querySelector('h1, h2, h3, h4, h5, span, b, strong, label, p');
                    if (header && header !== el && header.innerText.trim().length > 2) return header.innerText.trim();
                }
            }
            
            // 5. Placeholder
            if (el.placeholder) return el.placeholder;

            return '';
        }

        async function fillInput(el, value) {
            if (!el || value === undefined || value === null) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            await sleep(50);
            try {
                const descriptor = Object.getOwnPropertyDescriptor(
                    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                    'value'
                );
                if (descriptor && descriptor.set) {
                    descriptor.set.call(el, value);
                } else {
                    el.value = value;
                }
            } catch (e) { el.value = value; }
            
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
            
            await sleep(100);
            el.blur();
        }

        // --- MATCHING ---
        function scoreMatch(text, targetKey) {
            if (!text) return 0;
            text = text.toLowerCase().trim();
            let score = 0;
            const keywords = DICTIONARY[targetKey];
            
            keywords.forEach(kw => {
                kw = kw.toLowerCase();
                if (text === kw) score += 50; // Exact match
                else if (text.includes(kw)) score += 20; // Partial match
                
                // Fuzzy check for labels like "Il tuo titolo"
                if (kw.length > 4 && text.length > 4) {
                    if (text.includes(kw.substring(0, kw.length - 1))) score += 5;
                }
            });
            
            return score;
        }

        // --- MAIN ORCHESTRATOR ---
        async function runAutofill() {
            showHUD(msg.analyzing);
            const item = ${JSON.stringify(item)};
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea'));
            
            // 1. Try window.ai first
            let mapping = null;
            if (window.ai && window.ai.languageModel) {
                try {
                    const session = await window.ai.languageModel.create();
                    const context = {
                        title: item.title,
                        description: item.description,
                        price: item.price,
                        category: item.category,
                        brand: item.brand,
                        size: item.size,
                        condition: item.condition,
                        color: item.color,
                        material: item.material
                    };
                    const fields = inputs.slice(0, 15).map((m, i) => ({ id: i, label: findLabelFor(m).substring(0, 50) }));
                    
                    const prompt = \`Role: E-commerce form filler.
Context Data (can be in any language): \${JSON.stringify(context)}
Fields to fill: \${JSON.stringify(fields)}
Action: Map the Context Data to the Fields.
Language: Return values in the language of the Field labels if possible, otherwise use \${LANG}.
Format: Strict JSON object like {"0": "value", "1": "value"}.\`;

                    const res = await session.prompt(prompt);
                    const match = res.match(/{[^]*}/);
                    if (match) {
                        mapping = JSON.parse(match[0]);
                        showHUD(msg.usingAI, true);
                    }
                } catch(e) { console.log(LOG_PREFIX, 'AI Logic Error/Fallback', e); }
            }

            // 2. Super Heuristic Fallback (Robust & Multilingual)
            if (!mapping) {
                showHUD(msg.usingHeuristics);
                mapping = {};
                inputs.forEach((el, index) => {
                    const label = findLabelFor(el);
                    if (!label && !el.placeholder) return;

                    let bestKey = null;
                    let maxScore = 0;

                    Object.keys(DICTIONARY).forEach(key => {
                        const score = Math.max(scoreMatch(label, key), scoreMatch(el.placeholder, key));
                        if (score > maxScore) {
                            maxScore = score;
                            bestKey = key;
                        }
                    });

                    if (maxScore > 15 && bestKey) {
                        mapping[index] = item[bestKey] || (item.details ? item.details[bestKey] : '');
                    }
                });
            }

            // 3. Execution
            let fillCount = 0;
            for (const [id, value] of Object.entries(mapping)) {
                if (!value) continue;
                const el = inputs[id];
                // Only fill if empty or we have high confidence (heuristic)
                if (el && (!el.value || el.value.length < 2)) {
                    await fillInput(el, value);
                    fillCount++;
                    await sleep(150);
                }
            }

            // 4. Image Injection
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput && item.images && item.images.length > 0) {
                showHUD(msg.insertingPhotos);
                try {
                    const dt = new DataTransfer();
                    for (const b64 of item.images) {
                        try {
                            const res = await fetch(b64);
                            const blob = await res.blob();
                            dt.items.add(new File([blob], 'selly_img.jpg', { type: 'image/jpeg' }));
                        } catch(e) { console.error('Blob error', e); }
                    }
                    if (dt.files.length > 0) {
                        fileInput.files = dt.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } catch(e) { showHUD(msg.photoError); }
            }

            if (fillCount > 0) {
                showHUD(msg.completed, true);
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS' }));
            } else {
                showHUD(msg.completed, true);
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: 'No fields were filled' }));
            }
        }

        // Run & Observe
        await runAutofill();
        
        let timeout;
        const observer = new MutationObserver((mutations) => {
            // Only re-run if significant elements added
            const addedInputs = mutations.some(m => Array.from(m.addedNodes).some(n => n.tagName === 'INPUT' || (n.querySelectorAll && n.querySelectorAll('input').length > 0)));
            
            if (addedInputs) {
                clearTimeout(timeout);
                timeout = setTimeout(() => runAutofill(), 2000);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    })();
    `
};

