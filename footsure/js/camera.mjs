// Footsure: camera + pose loop. Video frames go straight from the camera into the on-device model;
// they are never recorded, stored or sent anywhere. Only landmark points leave this module (to the counters).
import { createPoseTracker, wholeBodyVisible } from './pose.mjs';

export function cameraSupported() {
  return !!(globalThis.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && globalThis.isSecureContext !== false;
}

export function createCamera({ video, canvas, onFrame = () => {}, mpBase, modelUrl } = {}) {
  let stream = null, tracker = null, raf = 0, lastVideoTime = -1, facing = 'environment', running = false;
  const ctx = canvas.getContext('2d');

  async function openStream() {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
    });
    video.srcObject = stream;
    video.muted = true; video.playsInline = true;
    await video.play();
  }

  function draw(lm) {
    const w = video.videoWidth || 640, h = video.videoHeight || 480;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!lm || !tracker) return;
    const ok = wholeBodyVisible(lm).ok;
    ctx.lineWidth = Math.max(3, w / 160); ctx.lineCap = 'round';
    ctx.strokeStyle = ok ? '#4fd1a5' : '#c9d1cd';
    for (const c of tracker.connections || []) {
      const a = lm[c.start], b = lm[c.end];
      if (!a || !b || (a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
      ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    for (const p of lm) if ((p.visibility ?? 1) >= 0.5) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, ctx.lineWidth, 0, 7); ctx.fill(); }
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;
    const t = performance.now();
    let lm = null;
    try { lm = tracker.detect(video, t); } catch (e) { lm = null; }
    draw(lm);
    onFrame({ t, lm });
  }

  return {
    get running() { return running; },
    async start() {
      if (!cameraSupported()) throw new Error('This browser has no camera access here.');
      await openStream();
      tracker = await createPoseTracker({ base: mpBase, modelUrl });
      running = true; loop();
    },
    async flip() {
      facing = facing === 'environment' ? 'user' : 'environment';
      if (stream) stream.getTracks().forEach((t) => t.stop());
      await openStream();
      video.classList.toggle('mirror', facing === 'user');
      canvas.classList.toggle('mirror', facing === 'user');
    },
    stop() {
      running = false; cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null; video.srcObject = null;
      if (tracker) tracker.close();
      tracker = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
