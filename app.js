/* ============================================
   J.A.R.V.I.S. MARK V — HOLOGRAPHIC AI ENGINE
   (OPERA GX + CHROME + EDGE COMPATIBLE VOICE)
   ============================================ */

(function () {
    'use strict';

    /* ==================
       DOM REFERENCES
       ================== */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        timeDisplay:        $('#timeDisplay'),
        dateDisplay:        $('#dateDisplay'),
        chatMessages:       $('#chatMessages'),
        chatContainer:      $('#chatContainer'),
        textInput:          $('#textInput'),
        sendBtn:            $('#sendBtn'),
        micBtn:             $('#micBtn'),
        micLabel:           $('#micLabel'),
        micRing:            $('#micRing'),
        clearBtn:           $('#clearBtn'),
        voiceStatusDot:     $('#voiceStatusDot'),
        voiceStatusLabel:   $('#voiceStatusLabel'),
        geminiStatusDot:    $('#geminiStatusDot'),
        geminiStatusLabel:  $('#geminiStatusLabel'),
        aiCoreCanvas:       $('#aiCoreCanvas'),
        aiCoreLabel:        $('#aiCoreLabel'),
        heroCoreTrigger:    $('#heroCoreTrigger'),
        waveformCanvas:     $('#waveformCanvas'),
        activityLog:        $('#activityLog'),
        protocolWarning:    $('#protocolWarning'),
        dismissWarningBtn:  $('#dismissWarningBtn'),
        // System stats
        cpuBar: $('#cpuBar'), cpuValue: $('#cpuValue'),
        memBar: $('#memBar'), memValue: $('#memValue'),
        netBar: $('#netBar'), netValue: $('#netValue'),
        storBar: $('#storBar'), storValue: $('#storValue'),
        // Weather
        weatherTemp: $('#weatherTemp'),
        weatherDesc: $('#weatherDesc'),
        weatherHumidity: $('#weatherHumidity'),
        weatherWind: $('#weatherWind'),
        weatherUV: $('#weatherUV'),
        // Modal / Config
        openSettingsBtn:    $('#openSettingsBtn'),
        closeSettingsBtn:   $('#closeSettingsBtn'),
        settingsModal:      $('#settingsModal'),
        apiKeyInput:        $('#apiKeyInput'),
        toggleKeyVisibility:$('#toggleKeyVisibility'),
        modelSelect:        $('#modelSelect'),
        userNameInput:      $('#userNameInput'),
        configStatusText:   $('#configStatusText'),
        saveKeyBtn:         $('#saveKeyBtn'),
        clearKeyBtn:        $('#clearKeyBtn'),
        testVoiceBtn:       $('#testVoiceBtn'),
        testMicBtn:         $('#testMicBtn'),
    };

    /* ==================
       STATE & CONFIG
       ================== */
    const config = {
        apiKey: localStorage.getItem('jarvis_gemini_key') || '',
        model: 'gemini-3.5-flash',
        userName: localStorage.getItem('jarvis_user_name') || 'sir',
    };

    const state = {
        isListening: false,
        isSpeaking: false,
        recognition: null,
        mediaRecorder: null,
        audioChunks: [],
        recordedMimeType: 'audio/webm',
        audioContext: null,
        analyser: null,
        microphone: null,
        mediaStream: null,
        coreAnimId: null,
        waveAnimId: null,
        chatHistory: [], // Multi-turn memory for Gemini
        speechKeepAliveTimer: null,
        isOperaGX: navigator.userAgent.includes('OPR') || navigator.userAgent.includes('Opera'),
    };

    /* ==================
       AUDIO SYNTHESIZER (SCI-FI SOUND FX)
       ================== */
    function playSciFiChime(type) {
        try {
            const ctx = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'activate') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'deactivate') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'process') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(660, now);
                osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
        } catch (e) {}
    }

    /* ==================
       INITIALIZATION
       ================== */
    function init() {
        checkProtocol();
        setupClock();
        setupAICore();
        setupWaveform();
        setupSpeechSynthesisKeepAlive();
        setupEventListeners();
        simulateSystemStats();
        simulateWeather();
        updateGeminiStatus();

        if (state.isOperaGX) {
            logActivity('Opera GX detected: Direct Neural Audio streaming activated.');
        }

        // Sync config UI
        els.apiKeyInput.value = config.apiKey;
        els.modelSelect.value = config.model;
        els.userNameInput.value = config.userName === 'sir' ? '' : config.userName;

        // Startup greeting
        setTimeout(() => {
            const hour = new Date().getHours();
            let timeGreeting = 'Good evening';
            if (hour < 12) timeGreeting = 'Good morning';
            else if (hour < 17) timeGreeting = 'Good afternoon';

            const userTitle = config.userName || 'sir';

            if (config.apiKey) {
                const welcome = `${timeGreeting}, ${userTitle}. JARVIS is online and calibrated to Gemini 3.5 Flash. All holographic matrices active.`;
                addMessage('ai', welcome);
                speak(welcome);
                logActivity('Gemini 3.5 Flash Core engaged');
            } else {
                const welcome = `${timeGreeting}, ${userTitle}. Voice systems are standing by. Please add your free Gemini API key in CONFIG for unrestricted intelligence.`;
                addMessage('ai', welcome);
                speak(welcome);
                logActivity('Voice active. Gemini Key needed.');
            }
        }, 600);
    }

    /* ==================
       PROTOCOL CHECK
       ================== */
    function checkProtocol() {
        if (window.location.protocol === 'file:') {
            if (els.protocolWarning) els.protocolWarning.style.display = 'flex';
            logActivity('Notice: Opening via file:// blocks mic. Use http://localhost:8080.');
        }
        if (els.dismissWarningBtn) {
            els.dismissWarningBtn.addEventListener('click', () => {
                if (els.protocolWarning) els.protocolWarning.style.display = 'none';
            });
        }
    }

    /* ==================
       GEMINI STATUS
       ================== */
    function updateGeminiStatus() {
        if (config.apiKey && config.apiKey.trim().length > 10) {
            els.geminiStatusDot.className = 'status-dot status-dot--active';
            els.geminiStatusLabel.textContent = 'GEMINI 3.5 ACTIVE';
            els.configStatusText.textContent = `● Connected via Gemini 3.5 Flash`;
            els.configStatusText.style.color = 'var(--green)';
            els.netBar.style.width = '100%';
            els.netValue.textContent = 'ONLINE';
        } else {
            els.geminiStatusDot.className = 'status-dot';
            els.geminiStatusLabel.textContent = 'OFFLINE CORE';
            els.configStatusText.textContent = '○ Offline mode. Add your free Gemini API key above for unrestricted knowledge.';
            els.configStatusText.style.color = 'var(--text-secondary)';
            els.netBar.style.width = '0%';
            els.netValue.textContent = 'OFFLINE';
        }
    }

    /* ==================
       CLOCK
       ================== */
    function setupClock() {
        function update() {
            const now = new Date();
            els.timeDisplay.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            els.dateDisplay.textContent = now.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            }).toUpperCase();
        }
        update();
        setInterval(update, 1000);
    }

    /* ==================
       MASSIVE HOLOGRAPHIC ARC REACTOR CORE CANVAS (AAA DETAIL)
       ================== */
    function setupAICore() {
        const canvas = els.aiCoreCanvas;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        function resize() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        }
        resize();
        window.addEventListener('resize', resize);

        let t = 0;
        function draw() {
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            const cx = w / 2;
            const cy = h / 2;
            const maxR = Math.min(w, h) / 2 - 12;

            ctx.clearRect(0, 0, w, h);
            t += state.isSpeaking ? 0.03 : (state.isListening ? 0.024 : 0.012);

            const activeColor = state.isListening 
                ? '#00f0ff' 
                : (state.isSpeaking ? '#0088ff' : '#00f0ff');

            // 1. Outer Holographic Calibrated Dial (72 Ticks + Cardinal Points)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(t * 0.2);
            const numTicks = 72;
            for (let i = 0; i < numTicks; i++) {
                const angle = (i * Math.PI * 2) / numTicks;
                const isMajor = i % 6 === 0;
                const isQuarter = i % 18 === 0;
                const r1 = maxR - (isQuarter ? 12 : (isMajor ? 8 : 4));
                const r2 = maxR;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
                ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
                ctx.strokeStyle = isQuarter ? activeColor : (isMajor ? 'rgba(0, 240, 255, 0.45)' : 'rgba(0, 240, 255, 0.15)');
                ctx.lineWidth = isQuarter ? 2 : (isMajor ? 1.2 : 0.8);
                ctx.stroke();
            }
            ctx.restore();

            // 2. Segmented Arc Shields (4 Heavy Shields)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-t * 0.5);
            for (let i = 0; i < 4; i++) {
                const startAngle = (i * Math.PI / 2) + 0.12;
                const endAngle = startAngle + (Math.PI / 2) - 0.24;
                ctx.beginPath();
                ctx.arc(0, 0, maxR - 18, startAngle, endAngle);
                ctx.strokeStyle = activeColor;
                ctx.lineWidth = 3;
                ctx.shadowColor = activeColor;
                ctx.shadowBlur = state.isListening || state.isSpeaking ? 12 : 6;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.restore();

            // 3. Counter-Rotating Turbine Track & Chevrons
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(t * 0.7);
            ctx.beginPath();
            ctx.arc(0, 0, maxR - 36, 0, Math.PI * 1.8);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 4 Chevrons
            for (let i = 0; i < 4; i++) {
                const ang = (i * Math.PI / 2);
                const rx = Math.cos(ang) * (maxR - 36);
                const ry = Math.sin(ang) * (maxR - 36);
                ctx.beginPath();
                ctx.arc(rx, ry, 4, 0, Math.PI * 2);
                ctx.fillStyle = activeColor;
                ctx.fill();
            }
            ctx.restore();

            // 4. Hexagonal Quantum Core Lattice
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-t * 1.1);
            const sides = 6;
            const hexR = maxR - 60;
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const ang = (i * Math.PI * 2) / sides;
                const x = Math.cos(ang) * hexR;
                const y = Math.sin(ang) * hexR;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            for (let i = 0; i < sides; i++) {
                const ang = (i * Math.PI * 2) / sides;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ang) * hexR, Math.sin(ang) * hexR);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.restore();

            // 5. Plasma Core Glow with Volumetric Pulse
            const pulseAmp = state.isListening ? 0.22 : (state.isSpeaking ? 0.18 : 0.08);
            const pulse = 1 + Math.sin(t * 4.5) * pulseAmp;
            const coreR = (maxR * 0.44) * pulse;

            const radialGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
            radialGlow.addColorStop(0, state.isListening ? 'rgba(0, 240, 255, 0.95)' : (state.isSpeaking ? 'rgba(0, 136, 255, 0.9)' : 'rgba(0, 240, 255, 0.6)'));
            radialGlow.addColorStop(0.4, 'rgba(0, 240, 255, 0.2)');
            radialGlow.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
            ctx.fillStyle = radialGlow;
            ctx.fill();

            // Central Emissive Arc Reactor Core Circle
            ctx.beginPath();
            ctx.arc(cx, cy, 11 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = config.apiKey ? '#ffffff' : '#ff9f43';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 25;
            ctx.fill();
            ctx.shadowBlur = 0;

            // 6. 8 Fast Orbiting Quantum Photon Nodes
            for (let i = 0; i < 8; i++) {
                const nodeAngle = t * (1.3 + i * 0.2) + (i * Math.PI / 4);
                const nodeDist = maxR - 80 + (i % 4) * 14;
                const nx = cx + Math.cos(nodeAngle) * nodeDist;
                const ny = cy + Math.sin(nodeAngle) * nodeDist;
                ctx.beginPath();
                ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + Math.sin(t * 3 + i) * 0.45})`;
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            state.coreAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    /* ==================
       WAVEFORM SPECTRUM CANVAS
       ================== */
    function setupWaveform() {
        const canvas = els.waveformCanvas;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        function resize() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        }
        resize();
        window.addEventListener('resize', resize);

        let t = 0;
        function draw() {
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            ctx.clearRect(0, 0, w, h);
            t += 0.03;

            const midY = h / 2;
            const bars = 80;
            const barW = w / bars;

            let freqData = null;
            if (state.analyser && state.isListening) {
                freqData = new Uint8Array(state.analyser.frequencyBinCount);
                state.analyser.getByteFrequencyData(freqData);
            }

            for (let i = 0; i < bars; i++) {
                let amplitude;
                if (freqData && state.isListening) {
                    const idx = Math.floor((i / bars) * freqData.length);
                    amplitude = (freqData[idx] / 255) * (h * 0.88);
                } else if (state.isSpeaking) {
                    amplitude = Math.abs(Math.sin(t * 4 + i * 0.15) * Math.sin(t * 2.5 + i * 0.08)) * h * 0.6;
                    amplitude += Math.random() * 3;
                } else {
                    amplitude = Math.abs(Math.sin(t + i * 0.1)) * 3.5 + 1;
                }

                const barH = Math.max(amplitude, 1.5);
                const x = i * barW + barW * 0.15;
                const bw = barW * 0.65;

                const alpha = state.isListening || state.isSpeaking ? 0.85 : 0.2;
                const color = state.isListening
                    ? `rgba(0, 240, 255, ${alpha})`
                    : state.isSpeaking
                        ? `rgba(0, 136, 255, ${alpha})`
                        : `rgba(0, 240, 255, ${alpha})`;

                ctx.fillStyle = color;
                ctx.fillRect(x, midY - barH / 2, bw, barH);
            }

            state.waveAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    /* ==================
       UNIVERSAL VOICE ENGINE (OPERA GX + CHROME + EDGE)
       ================== */
    async function startListening() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        state.isSpeaking = false;

        try {
            // 1. Acquire microphone stream (works 100% in Opera GX, Chrome, Edge)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaStream = stream;

            // Connect visualizer AudioContext
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 256;
            state.microphone = state.audioContext.createMediaStreamSource(stream);
            state.microphone.connect(state.analyser);

            // 2. Set up MediaRecorder
            const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
            let mimeType = 'audio/webm';
            for (const t of supportedTypes) {
                if (MediaRecorder.isTypeSupported(t)) {
                    mimeType = t;
                    break;
                }
            }
            state.recordedMimeType = mimeType;
            state.audioChunks = [];

            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    state.audioChunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(state.audioChunks, { type: state.recordedMimeType });
                if (audioBlob.size > 1000) {
                    processAudioInput(audioBlob);
                }
            };

            recorder.start(100);
            state.mediaRecorder = recorder;

            // 3. Optional: Try WebSpeech in parallel if supported (Chrome/Edge)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition && !state.isOperaGX) {
                try {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    recognition.lang = 'en-US';
                    recognition.onresult = (event) => {
                        if (event.results && event.results[0] && event.results[0][0]) {
                            const transcript = event.results[0][0].transcript.trim();
                            if (transcript) {
                                state.webSpeechTranscript = transcript;
                            }
                        }
                    };
                    recognition.start();
                    state.recognition = recognition;
                } catch (e) {}
            }

            state.isListening = true;
            els.micBtn.classList.add('listening');
            els.micLabel.textContent = 'TRANSMIT';
            els.voiceStatusDot.className = 'status-dot status-dot--listening';
            els.voiceStatusLabel.textContent = 'RECORDING';
            els.aiCoreLabel.textContent = 'SPEAK NOW (CLICK TO SEND)';
            logActivity('Microphone recording active. Speak now...');
            playSciFiChime('activate');

        } catch (err) {
            console.error('Microphone error:', err);
            alert(`Microphone could not be accessed: ${err.message}. Please click the lock/tune icon in your address bar and ensure Microphone is set to "Allow".`);
            logActivity(`Mic Error: ${err.message}`);
            stopListening();
        }
    }

    function stopListening() {
        if (!state.isListening) return;

        state.isListening = false;
        els.micBtn.classList.remove('listening');
        els.micLabel.textContent = 'ACTIVATE';
        els.voiceStatusDot.className = 'status-dot';
        els.voiceStatusLabel.textContent = 'VOICE OFF';
        if (!state.isSpeaking) els.aiCoreLabel.textContent = 'PROCESSING AUDIO...';
        playSciFiChime('deactivate');

        // Stop MediaRecorder (triggers onstop)
        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            try { state.mediaRecorder.stop(); } catch(e) {}
        }

        // Stop WebSpeech if running
        if (state.recognition) {
            try { state.recognition.stop(); } catch(e) {}
        }

        // Stop microphone stream tracks
        if (state.mediaStream) {
            state.mediaStream.getTracks().forEach(track => track.stop());
            state.mediaStream = null;
        }
    }

    /* ==================
       PROCESS AUDIO BLOB (GEMINI MULTIMODAL DIRECT AUDIO)
       ================== */
    async function processAudioInput(audioBlob) {
        els.aiCoreLabel.textContent = 'PROCESSING';
        addTypingIndicator();
        playSciFiChime('process');

        const startTime = Date.now();

        try {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Data = reader.result.split(',')[1];
                const cleanMime = state.recordedMimeType.split(';')[0];

                logActivity(`Audio captured (${(audioBlob.size / 1024).toFixed(1)} KB). Transmitting...`);

                if (config.apiKey && config.apiKey.trim().length > 10) {
                    try {
                        const responseText = await callGeminiAudioAPI(base64Data, cleanMime);
                        const latency = Date.now() - startTime;
                        els.storValue.textContent = `${latency}ms`;

                        removeTypingIndicator();
                        
                        // Check if the interpreted transcript was a local app launch request
                        const executedAppResponse = await checkAndExecuteLocalApp(responseText);
                        if (executedAppResponse) {
                            addMessage('ai', executedAppResponse);
                            speak(executedAppResponse);
                            logActivity('Local system command executed');
                        } else {
                            addMessage('ai', responseText);
                            speak(responseText);
                            logActivity('JARVIS audio response synthesized');
                        }
                    } catch (err) {
                        handleAudioError(err);
                    }
                } else {
                    await new Promise(r => setTimeout(r, 600));
                    removeTypingIndicator();
                    const offlineMsg = generateOfflineResponse("voice input");
                    addMessage('ai', offlineMsg);
                    speak(offlineMsg);
                }
            };
        } catch (err) {
            handleAudioError(err);
        }
    }

    function handleAudioError(err) {
        console.error('Audio Processing Error:', err);
        removeTypingIndicator();
        const errMsg = `I encountered an anomaly analyzing the audio stream: ${err.message}. Reverting to auxiliary protocols.`;
        addMessage('ai', errMsg);
        speak(errMsg);
        logActivity(`Neural Error: ${err.message}`);
    }

    /* ==================
       GEMINI MULTIMODAL AUDIO API CALL
       ================== */
    async function callGeminiAudioAPI(base64Audio, mimeType) {
        const userTitle = config.userName || 'sir';

        const systemPrompt = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the ultra-advanced AI assistant created by Tony Stark, now assisting ${userTitle}.
Personality traits:
- Sophisticated, polite, intelligent, witty British persona.
- Always address the user politely as "${userTitle}".
- Spoken responses should be concise, articulate, and natural (1 to 3 crisp paragraphs max unless detailed code or deep explanation is requested).
- You have complete mastery across engineering, software development, science, mathematics, and tactical analysis.
- First line of your response should echo what you heard the user say in brackets like: [You: "what the user asked"]
- Then on a new line, provide your J.A.R.V.I.S. response.`;

        const userContentPart = {
            role: 'user',
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                    }
                },
                {
                    text: `Listen to this spoken audio command from ${userTitle}. Follow your system persona strictly.`
                }
            ]
        };

        const candidateModels = [
            'gemini-3.5-flash',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash'
        ];

        const apiVersions = ['v1beta', 'v1'];
        let lastError = null;

        for (const apiVer of apiVersions) {
            for (const modelName of candidateModels) {
                try {
                    const cleanModel = modelName.replace(/^models\//, '');
                    const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${cleanModel}:generateContent?key=${config.apiKey.trim()}`;

                    const payload = {
                        contents: [...state.chatHistory, userContentPart],
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1000
                        }
                    };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const msg = errData?.error?.message || `HTTP ${response.status}`;
                        lastError = new Error(msg);
                        continue;
                    }

                    const data = await response.json();
                    const candidate = data.candidates?.[0];
                    const aiText = candidate?.content?.parts?.[0]?.text;

                    if (!aiText) continue;

                    // Extract user transcript if returned in brackets
                    const match = aiText.match(/^\[You:\s*["']?([^\]"']+)["']?\]\s*/i);
                    if (match && match[1]) {
                        addMessage('user', match[1]);
                    } else {
                        addMessage('user', '🎙️ [Spoken Voice Command]');
                    }

                    const cleanAiResponse = aiText.replace(/^\[You:[^\]]+\]\s*/i, '').trim();

                    // Save dialogue turn in memory
                    state.chatHistory.push({
                        role: 'user',
                        parts: [{ text: match ? match[1] : 'Spoken voice command' }]
                    });
                    state.chatHistory.push({
                        role: 'model',
                        parts: [{ text: cleanAiResponse }]
                    });

                    if (state.chatHistory.length > 14) {
                        state.chatHistory = state.chatHistory.slice(-14);
                    }

                    return cleanAiResponse;
                } catch (err) {
                    lastError = err;
                }
            }
        }

        throw lastError || new Error('Could not analyze voice audio via Gemini.');
    }

    /* ==================
       SPEECH SYNTHESIS (KEEP-ALIVE & ROBUST CHROME/OPERA HANDLING)
       ================== */
    function setupSpeechSynthesisKeepAlive() {
        if (state.speechKeepAliveTimer) clearInterval(state.speechKeepAliveTimer);
        state.speechKeepAliveTimer = setInterval(() => {
            if (state.isSpeaking && window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);
    }

    function speak(text) {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/```[\s\S]*?```/g, 'Code block outputted to display.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[*#_~]/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/https?:\/\/\S+/g, 'link')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.5;
        utterance.pitch = 1.00;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
            v.name.includes('Google UK English Male') ||
            v.name.includes('Daniel') ||
            v.name.includes('George') ||
            v.name.includes('Microsoft David') ||
            v.name.includes('Male')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => {
            state.isSpeaking = true;
            els.aiCoreLabel.textContent = 'SPEAKING';
        };

        utterance.onend = () => {
            state.isSpeaking = false;
            els.aiCoreLabel.textContent = 'TAP TO SPEAK';
        };

        utterance.onerror = () => {
            state.isSpeaking = false;
            els.aiCoreLabel.textContent = 'TAP TO SPEAK';
        };

        window.speechSynthesis.speak(utterance);
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }

    /* ==================
       CHAT UI HELPERS
       ================== */
    function addMessage(role, text) {
        const msgEl = document.createElement('div');
        msgEl.className = `msg msg--${role}`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const formatted = formatMarkdown(text);

        msgEl.innerHTML = `
            <div class="msg__avatar">${role === 'ai' ? 'J' : 'U'}</div>
            <div>
                <div class="msg__bubble">${formatted}</div>
                <div class="msg__time">${timeStr}</div>
            </div>
        `;

        els.chatMessages.appendChild(msgEl);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    function formatMarkdown(text) {
        let escaped = escapeHtml(text);
        escaped = escaped.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    function addTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'msg msg--ai';
        el.id = 'typingIndicator';
        el.innerHTML = `
            <div class="msg__avatar">J</div>
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        `;
        els.chatMessages.appendChild(el);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ==================
       LOCAL APPLICATION LAUNCH / CLOSE BRIDGE
       ================== */
    async function checkAndExecuteLocalApp(text) {
        const lower = text.toLowerCase();
        let appName = null;
        const userTitle = config.userName || 'sir';

        // Match target application keywords
        if (lower.includes('chrome')) appName = 'chrome';
        else if (lower.includes('opera')) appName = 'opera';
        else if (lower.includes('spotify')) appName = 'spotify';
        else if (lower.includes('discord')) appName = 'discord';
        else if (lower.includes('notepad')) appName = 'notepad';
        else if (lower.includes('calculator')) appName = 'calculator';
        else if (lower.includes('steam')) appName = 'steam';
        else if (lower.includes('code') || lower.includes('vscode')) appName = 'vscode';
        else if (lower.includes('explorer') || lower.includes('files')) appName = 'explorer';
        else if (lower.includes('cmd') || lower.includes('terminal')) appName = 'cmd';

        const isLaunchRequest = lower.includes('open') || lower.includes('launch') || lower.includes('start') || lower.includes('run');
        const isCloseRequest = lower.includes('close') || lower.includes('exit') || lower.includes('terminate') || lower.includes('kill') || lower.includes('quit') || lower.includes('shut down');

        if (appName) {
            // Handle CLOSE Request
            if (isCloseRequest) {
                try {
                    const response = await fetch('http://localhost:3000/api/close', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appName })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        return `I was unable to close ${appName}, ${userTitle}. It may not currently be running.`;
                    }

                    return `Terminating process. ${appName} has been closed, ${userTitle}.`;
                } catch (e) {
                    return `System bridge offline, ${userTitle}. Ensure server.js is active on port 3000.`;
                }
            }

            // Handle LAUNCH Request
            if (isLaunchRequest) {
                try {
                    const response = await fetch('http://localhost:3000/api/launch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appName })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        return `I encountered an issue launching ${appName}, ${userTitle}. ${data.error || ''}`;
                    }

                    return `Accessing local system registry. Launching ${appName} now, ${userTitle}.`;
                } catch (e) {
                    return `System bridge offline, ${userTitle}. Ensure server.js is active on port 3000.`;
                }
            }
        }

        return null;
    }

    /* ==================
       USER TEXT DISPATCHER
       ================== */
    async function handleUserInput(text) {
        addMessage('user', text);
        logActivity(`Directive: "${text.substring(0, 26)}${text.length > 26 ? '...' : ''}"`);

        els.aiCoreLabel.textContent = 'PROCESSING';
        addTypingIndicator();
        playSciFiChime('process');

        const startTime = Date.now();

        try {
            // 1. Intercept for local application execution request
            const localAppResponse = await checkAndExecuteLocalApp(text);

            if (localAppResponse) {
                const latency = Date.now() - startTime;
                els.storValue.textContent = `${latency}ms`;

                removeTypingIndicator();
                addMessage('ai', localAppResponse);
                speak(localAppResponse);
                logActivity('Local command bridge executed');
                return;
            }

            // 2. Delegate to Gemini AI Network Engine
            let responseText = '';

            if (config.apiKey && config.apiKey.trim().length > 10) {
                responseText = await callGeminiTextAPI(text);
            } else {
                await new Promise(r => setTimeout(r, 600));
                responseText = generateOfflineResponse(text);
            }

            const latency = Date.now() - startTime;
            els.storValue.textContent = `${latency}ms`;

            removeTypingIndicator();
            addMessage('ai', responseText);
            speak(responseText);
            logActivity('Response transmission complete');

        } catch (err) {
            console.error('AI Error:', err);
            removeTypingIndicator();

            let errMsg = `I encountered an anomaly accessing neural systems: ${err.message}. Reverting to auxiliary protocols.`;
            if (err.message.includes('API_KEY_INVALID') || err.message.includes('key')) {
                errMsg = "Your Gemini API key appears invalid. Please check CONFIG in the top bar to update it.";
            }

            addMessage('ai', errMsg);
            speak(errMsg);
            logActivity(`Neural Error: ${err.message}`);
        }
    }

    /* ==================
       GEMINI TEXT API CALL
       ================== */
    async function callGeminiTextAPI(userPrompt) {
        const userTitle = config.userName || 'sir';

        const systemPrompt = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the ultra-advanced AI assistant created by Tony Stark, now assisting ${userTitle}.
Personality traits:
- Sophisticated, polite, intelligent, witty British persona.
- Always address the user politely as "${userTitle}".
- Spoken responses should be concise, articulate, and natural (1 to 3 crisp paragraphs max unless detailed code or deep explanation is requested).
- You have complete mastery across engineering, software development, science, mathematics, and tactical analysis.
- Format code blocks cleanly with syntax highlighting when asked for code.`;

        state.chatHistory.push({
            role: 'user',
            parts: [{ text: userPrompt }]
        });

        if (state.chatHistory.length > 14) {
            state.chatHistory = state.chatHistory.slice(-14);
        }

        const candidateModels = [
            'gemini-3.5-flash',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-pro'
        ];

        const apiVersions = ['v1beta', 'v1'];
        let lastError = null;

        for (const apiVer of apiVersions) {
            for (const modelName of candidateModels) {
                try {
                    const cleanModel = modelName.replace(/^models\//, '');
                    const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${cleanModel}:generateContent?key=${config.apiKey.trim()}`;

                    const payload = {
                        contents: state.chatHistory,
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1000
                        }
                    };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const msg = errData?.error?.message || `HTTP ${response.status}`;
                        lastError = new Error(msg);
                        continue;
                    }

                    const data = await response.json();
                    const candidate = data.candidates?.[0];
                    const aiText = candidate?.content?.parts?.[0]?.text;

                    if (!aiText) continue;

                    state.chatHistory.push({
                        role: 'model',
                        parts: [{ text: aiText }]
                    });

                    return aiText;
                } catch (err) {
                    lastError = err;
                }
            }
        }

        throw lastError || new Error('Could not reach a compatible Gemini neural endpoint.');
    }

    /* ==================
       OFFLINE FALLBACK ENGINE
       ================== */
    function generateOfflineResponse(input) {
        const lower = input.toLowerCase().trim();
        const userTitle = config.userName || 'sir';

        if (/^(hi|hello|hey|greetings)/i.test(lower)) {
            return `Hello, ${userTitle}. All local voice matrices are operational. Configure your free Gemini key in CONFIG for unrestricted knowledge.`;
        }
        if (/time/i.test(lower)) {
            const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            return `The current time is ${time}, ${userTitle}.`;
        }
        if (/date/i.test(lower)) {
            const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            return `Today is ${date}.`;
        }
        if (/weather/i.test(lower)) {
            return `Atmospheric sensors indicate 27°C with clear skies and 62% humidity, ${userTitle}.`;
        }
        if (/joke/i.test(lower)) {
            return `Why do programmers prefer dark mode? Because light attracts bugs, ${userTitle}.`;
        }
        if (/diagnos/i.test(lower)) {
            return `Diagnostics report: Speech recognition operational. Audio synthesizer active. Gemini link awaiting API key in CONFIG.`;
        }
        return `I am currently in local offline mode, ${userTitle}. To unlock advanced reasoning and code generation, click CONFIG in the top bar and enter your free Gemini API key.`;
    }

    /* ==================
       ACTIVITY LOG
       ================== */
    function logActivity(msg) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        const li = document.createElement('li');
        li.className = 'activity-log__item';
        li.innerHTML = `
            <span class="activity-log__time">${time}</span>
            <span class="activity-log__msg">${escapeHtml(msg)}</span>
        `;

        const list = els.activityLog;
        list.insertBefore(li, list.firstChild);

        while (list.children.length > 20) {
            list.removeChild(list.lastChild);
        }
    }

    /* ==================
       SYSTEM STATS SIMULATION
       ================== */
    function simulateSystemStats() {
        function update() {
            const cpu = 18 + Math.random() * 30;
            const mem = 40 + Math.random() * 30;

            els.cpuBar.style.width = Math.round(cpu) + '%';
            els.cpuValue.textContent = Math.round(cpu) + '%';

            els.memBar.style.width = Math.round(mem) + '%';
            els.memValue.textContent = Math.round(mem) + '%';
        }
        update();
        setInterval(update, 3000);
    }

    /* ==================
       WEATHER SIMULATION
       ================== */
    function simulateWeather() {
        const conditions = [
            { temp: '27°C', desc: 'Clear Atmosphere', hum: '62%', wind: '12 km/h', uv: '0.04 µSv' },
            { temp: '25°C', desc: 'Optimal Atmosphere', hum: '58%', wind: '10 km/h', uv: '0.03 µSv' },
            { temp: '28°C', desc: 'Solar Peak Flux', hum: '50%', wind: '14 km/h', uv: '0.05 µSv' }
        ];

        function update() {
            const c = conditions[Math.floor(Math.random() * conditions.length)];
            els.weatherTemp.textContent = c.temp;
            els.weatherDesc.textContent = c.desc;
            els.weatherHumidity.textContent = c.hum;
            els.weatherWind.textContent = c.wind;
            els.weatherUV.textContent = c.uv;
        }
        setInterval(update, 30000);
    }

    /* ==================
       EVENT LISTENERS
       ================== */
    function setupEventListeners() {
        const toggleVoice = () => {
            if (state.isListening) {
                stopListening();
            } else {
                startListening();
            }
        };

        els.micBtn.addEventListener('click', toggleVoice);
        if (els.heroCoreTrigger) {
            els.heroCoreTrigger.addEventListener('click', toggleVoice);
        }

        // Send text
        els.sendBtn.addEventListener('click', sendTextInput);

        // Enter key
        els.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendTextInput();
            }
        });

        // Spacebar shortcut for Mic
        document.addEventListener('keydown', (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            if (e.code === 'Space' && !isTyping) {
                e.preventDefault();
                toggleVoice();
            }
        });

        // Clear chat
        els.clearBtn.addEventListener('click', () => {
            els.chatMessages.innerHTML = '';
            state.chatHistory = [];
            addMessage('ai', `Holographic transcript flushed, ${config.userName || 'sir'}. Ready for directives.`);
            logActivity('Memory cache flushed');
        });

        // Quick directives
        $$('.qcmd-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                if (cmd) handleUserInput(cmd);
            });
        });

        // Settings Modal Open/Close
        els.openSettingsBtn.addEventListener('click', () => {
            els.settingsModal.classList.add('active');
        });

        els.closeSettingsBtn.addEventListener('click', () => {
            els.settingsModal.classList.remove('active');
        });

        els.settingsModal.addEventListener('click', (e) => {
            if (e.target === els.settingsModal) {
                els.settingsModal.classList.remove('active');
            }
        });

        // Toggle API Key visibility
        els.toggleKeyVisibility.addEventListener('click', () => {
            if (els.apiKeyInput.type === 'password') {
                els.apiKeyInput.type = 'text';
                els.toggleKeyVisibility.textContent = 'HIDE';
            } else {
                els.apiKeyInput.type = 'password';
                els.toggleKeyVisibility.textContent = 'SHOW';
            }
        });

        // Test Voice Button
        if (els.testVoiceBtn) {
            els.testVoiceBtn.addEventListener('click', () => {
                const phrase = `Holographic voice matrix is nominal, ${config.userName || 'sir'}. Audio drivers verified.`;
                addMessage('ai', phrase);
                speak(phrase);
            });
        }

        // Test Mic Button
        if (els.testMicBtn) {
            els.testMicBtn.addEventListener('click', () => {
                els.settingsModal.classList.remove('active');
                startListening();
            });
        }

        // Save Config
        els.saveKeyBtn.addEventListener('click', () => {
            const key = els.apiKeyInput.value.trim();
            const name = els.userNameInput.value.trim() || 'sir';

            config.apiKey = key;
            config.userName = name;

            localStorage.setItem('jarvis_gemini_key', key);
            localStorage.setItem('jarvis_gemini_model', 'gemini-3.5-flash');
            localStorage.setItem('jarvis_user_name', name);

            updateGeminiStatus();
            els.settingsModal.classList.remove('active');

            if (key) {
                const msg = `Gemini 3.5 Flash core activated. Welcome back, ${name}.`;
                addMessage('ai', msg);
                speak(msg);
                logActivity(`Gemini 3.5 Key saved`);
            } else {
                addMessage('ai', 'Offline mode activated.');
            }
        });

        // Clear Key
        els.clearKeyBtn.addEventListener('click', () => {
            localStorage.removeItem('jarvis_gemini_key');
            config.apiKey = '';
            els.apiKeyInput.value = '';
            updateGeminiStatus();
            logActivity('Gemini Key removed');
        });
    }

    function sendTextInput() {
        const text = els.textInput.value.trim();
        if (!text) return;
        els.textInput.value = '';
        handleUserInput(text);
    }

    /* ==================
       LAUNCH
       ================== */
    document.addEventListener('DOMContentLoaded', init);
})();