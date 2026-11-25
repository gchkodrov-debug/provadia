// vad-bridge.js — LAZY chunk (loads only when the visitor presses Speak).
// Silero VAD via @ricky0123/vad-web UMD bundle + onnxruntime-web, all self-hosted
// under /solnik/vad/. No microphone audio ever leaves the device from this chunk:
// it only reports speech start/end + the utterance samples for brain-side STT.
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src));
    document.head.appendChild(s);
  });
}
export async function startVAD(assetBase, cbs) {
  if (!window.ort) await loadScript(assetBase + 'ort.min.js');
  if (!window.vad) await loadScript(assetBase + 'bundle.min.js');
  const myvad = await window.vad.MicVAD.new({
    baseAssetPath: assetBase,
    onnxWASMBasePath: assetBase,
    model: 'v5',
    positiveSpeechThreshold: 0.55,
    negativeSpeechThreshold: 0.35,
    redemptionMs: 700,
    minSpeechMs: 120,
    onSpeechStart: () => cbs.onSpeechStart && cbs.onSpeechStart(),
    onSpeechEnd: (audio) => cbs.onSpeechEnd && cbs.onSpeechEnd(audio),
    onVADMisfire: () => {},
  });
  myvad.start();
  return { pause: () => myvad.pause(), resume: () => myvad.start() };
}
