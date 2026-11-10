import { HandLandmarker, FilesetResolver } from '../assets/vendor/mediapipe/vision_bundle.mjs';

export class VoiceAgent {
  constructor({ onCommand, onStatus, onTranscript }) {
    this.onCommand = onCommand;
    this.onStatus = onStatus;
    this.onTranscript = onTranscript;
    this.Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = Boolean(this.Recognition);
    this.listening = false;
    this.recognition = null;
    this.lang = 'en-US';
    this.speakEnabled = true;
  }

  start() {
    if (!this.supported) {
      this.onStatus?.('unsupported', 'Speech recognition is not available in this browser. Type commands below instead.');
      return false;
    }
    if (this.listening) return true;
    const rec = new this.Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.maxAlternatives = 1;
    let finalBuffer = '';
    rec.onstart = () => {
      this.listening = true;
      this.onStatus?.('listening', 'Listening… say a lab command');
    };
    rec.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          finalBuffer = text;
          this.onTranscript?.(text, 'user');
          this.onCommand?.(text);
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) this.onStatus?.('listening', `Hearing: ${interim}`);
    };
    rec.onerror = event => {
      const messages = {
        'not-allowed': 'Microphone permission denied. Allow microphone access or type commands.',
        'no-speech': 'No speech detected. Still listening…',
        'audio-capture': 'No microphone found. Connect a microphone or type commands.',
        network: 'Speech service network error. Text commands still work.',
        aborted: 'Listening stopped.'
      };
      this.onStatus?.('error', messages[event.error] || `Speech error: ${event.error}`);
      if (event.error === 'not-allowed' || event.error === 'audio-capture') this.stop();
    };
    rec.onend = () => {
      this.listening = false;
      if (this._autoRestart) {
        try { rec.start(); } catch { this._autoRestart = false; this.onStatus?.('idle', 'Ready · text or voice'); }
      } else {
        this.onStatus?.('idle', 'Ready · text or voice');
      }
    };
    this.recognition = rec;
    this._autoRestart = true;
    try {
      rec.start();
      return true;
    } catch {
      this.onStatus?.('error', 'Could not start speech recognition. Try again or type a command.');
      return false;
    }
  }

  stop() {
    this._autoRestart = false;
    this.listening = false;
    try { this.recognition?.stop(); } catch { /* already stopped */ }
    this.onStatus?.('idle', 'Ready · text or voice');
  }

  toggle() { return this.listening ? (this.stop(), false) : this.start(); }

  speak(text) {
    if (!this.speakEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = 1.04;
    utterance.pitch = 1.0;
    utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

export class HandController {
  constructor({ video, canvas, onGesture, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onGesture = onGesture;
    this.onStatus = onStatus;
    this.running = false;
    this.landmarker = null;
    this.stream = null;
    this.lastVideoTime = -1;
    this.lastFrame = 0;
    this.lastGesture = '';
    this.lastDiscrete = 0;
    this.prevCenter = null;
    this.sensitivity = 0.55;
    this.mirror = true;
  }

  async start() {
    if (this.running) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.onStatus?.('error', 'Camera API unavailable. Use HTTPS or localhost, or control the lab with mouse/voice.');
      return false;
    }
    this.onStatus?.('loading', 'Requesting camera…');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.canvas.width = this.video.videoWidth || 640;
      this.canvas.height = this.video.videoHeight || 480;
      this.onStatus?.('loading', 'Loading hand landmark model…');
      const wasmBase = new URL(/* @vite-ignore */ '../assets/vendor/mediapipe/wasm', import.meta.url).href;
      const modelPath = new URL(/* @vite-ignore */ '../assets/models/hand_landmarker.task', import.meta.url).href;
      const fileset = await FilesetResolver.forVisionTasks(wasmBase);
      const options = {
        baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: this.sensitivity,
        minHandPresenceConfidence: this.sensitivity,
        minTrackingConfidence: this.sensitivity
      };
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      } catch {
        options.baseOptions.delegate = 'CPU';
        this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      }
      this.running = true;
      this.onStatus?.('active', 'Hand tracking active');
      this._loop();
      return true;
    } catch (err) {
      this.stop();
      const message = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access to use hand control.'
        : `Hand tracking could not start: ${err?.message || err}. Mouse, touch and voice still work.`;
      this.onStatus?.('error', message);
      return false;
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    try { this.landmarker?.close(); } catch { /* already closed */ }
    this.landmarker = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onStatus?.('idle', 'Camera off');
  }

  _loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    if (now - this.lastFrame < 66) return;
    this.lastFrame = now;
    if (this.video.readyState < 2 || this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;
    let result;
    try {
      result = this.landmarker.detectForVideo(this.video, now);
    } catch { return; }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!result.landmarks?.length) {
      this.prevCenter = null;
      this.onStatus?.('active', 'Show your hand to the camera');
      return;
    }
    const landmarks = result.landmarks[0];
    this._draw(landmarks);
    const gesture = this._classify(landmarks);
    this.onStatus?.('active', gesture.label);
    this.onGesture?.(gesture);
  }

  _draw(landmarks) {
    const w = this.canvas.width, h = this.canvas.height;
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(53,230,255,.8)';
    HAND_CONNECTIONS.forEach(([a, b]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
      this.ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      this.ctx.stroke();
    });
    landmarks.forEach((p, i) => {
      this.ctx.beginPath();
      this.ctx.arc(p.x * w, p.y * h, i % 4 === 0 ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = i % 4 === 0 ? '#d96bff' : '#35e6ff';
      this.ctx.fill();
    });
  }

  _dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  }

  _classify(lm) {
    const wrist = lm[0];
    const scale = this._dist(wrist, lm[9]) || 0.1;
    const pinch = this._dist(lm[4], lm[8]) / scale;
    const extended = tip => this._dist(lm[tip], wrist) > this._dist(lm[tip - 2], wrist) * 1.12;
    const index = extended(8), middle = extended(12), ring = extended(16), pinky = extended(20);
    const thumb = this._dist(lm[4], lm[17]) > this._dist(lm[3], lm[17]) * 1.15;
    const centerX = (lm[0].x + lm[9].x) / 2;
    const centerY = (lm[0].y + lm[9].y) / 2;
    let name = 'unknown', label = 'Hand detected';
    if (pinch < 0.38) { name = 'pinch'; label = 'Pinch · zoom'; }
    else if (index && middle && ring && pinky) { name = 'palm'; label = 'Open palm · orbit'; }
    else if (!index && !middle && !ring && !pinky && thumb && lm[4].y < wrist.y - 0.05) { name = 'thumbs-up'; label = 'Thumbs up · field lines'; }
    else if (!index && !middle && !ring && !pinky) { name = 'fist'; label = 'Fist · pause / resume'; }
    else if (index && middle && !ring && !pinky) { name = 'victory'; label = 'Victory · reset view'; }
    else if (index && !middle && !ring && !pinky) { name = 'point'; label = 'Point · next specimen'; }
    const dx = this.prevCenter ? centerX - this.prevCenter.x : 0;
    const dy = this.prevCenter ? centerY - this.prevCenter.y : 0;
    this.prevCenter = { x: centerX, y: centerY };
    const now = performance.now();
    let discrete = false;
    if (['fist', 'victory', 'point', 'thumbs-up'].includes(name)) {
      if (name !== this.lastGesture || now - this.lastDiscrete > 1400) {
        discrete = true;
        this.lastDiscrete = now;
      }
    }
    this.lastGesture = name;
    return { name, label, dx, dy, pinch, discrete, centerX, centerY };
  }
}

export class LabAudio {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.volume = 0.35;
    this.teslaActive = false;
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.humGain = this.ctx.createGain();
      this.humGain.gain.value = 0.012;
      this.humFilter = this.ctx.createBiquadFilter();
      this.humFilter.type = 'lowpass';
      this.humFilter.frequency.value = 220;
      this.hum = this.ctx.createOscillator();
      this.hum.type = 'sine';
      this.hum.frequency.value = 55;
      this.hum2 = this.ctx.createOscillator();
      this.hum2.type = 'triangle';
      this.hum2.frequency.value = 110;
      const hum2Gain = this.ctx.createGain();
      hum2Gain.gain.value = 0.3;
      this.hum.connect(this.humFilter);
      this.hum2.connect(hum2Gain).connect(this.humFilter);
      this.humFilter.connect(this.humGain).connect(this.master);
      this.hum.start();
      this.hum2.start();
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.97 ? 1 : 0.12);
      this.noise = this.ctx.createBufferSource();
      this.noise.buffer = buffer;
      this.noise.loop = true;
      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.value = 2400;
      this.noiseFilter.Q.value = 0.7;
      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = 0;
      this.noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
      this.noise.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(enabled ? this.volume : 0, this.ctx.currentTime + 0.15);
    }
    if (!enabled && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  setVolume(v) {
    this.volume = v;
    if (this.ctx && this.master && this.enabled) this.master.gain.value = v;
  }

  setField(strength) {
    if (!this.ctx) return;
    const s = Math.max(0, Math.min(2, strength / 100));
    this.hum.frequency.setTargetAtTime(50 + s * 12, this.ctx.currentTime, 0.3);
    this.humGain.gain.setTargetAtTime(0.006 + s * 0.01, this.ctx.currentTime, 0.3);
  }

  setTesla(active) {
    this.teslaActive = active;
    if (!this.ctx) return;
    this.noiseGain.gain.setTargetAtTime(active && this.enabled ? 0.02 : 0, this.ctx.currentTime, 0.2);
  }

  click(freq = 880) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  dispose() {
    try { this.hum?.stop(); this.hum2?.stop(); this.noise?.stop(); this.ctx?.close(); } catch { /* already closed */ }
  }
}