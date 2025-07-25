let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

export function initAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.connect(audioContext.destination);
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }
}

export async function playTTS(text: string) {
  // isTtsActive는 main-ui.ts (이제 app-main.ts)에서 관리되므로, 인자로 받거나 전역 변수로 접근해야 합니다.
  // 여기서는 일단 전역 변수 (window.isTtsActive)로 접근한다고 가정합니다.
  if (!text || !audioContext || !(window as any).isTtsActive || !masterGainNode) return;
  if (currentAudioSource) currentAudioSource.stop();
  try {
    const response = await fetch('http://localhost:8000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
      body: JSON.stringify({ text, engine: 'google' }),
    });
    if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
    const audioData = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(masterGainNode);
    source.start(0);
    currentAudioSource = source;
    source.onended = () => { currentAudioSource = null; };
  } catch (error) {
    if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
      console.error("TTS playback error:", error);
    }
  }
}

export function toggleTts(enable: boolean) {
  (window as any).isTtsActive = enable; // 전역 변수 업데이트
  console.log(`TTS is now ${(window as any).isTtsActive ? 'enabled' : 'disabled'}.`);
}

export function setMasterVolume(volume: number) {
  if (masterGainNode) {
    masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    console.log(`Master volume set to: ${masterGainNode.gain.value}`);
  }
}
