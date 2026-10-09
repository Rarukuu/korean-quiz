(function () {
  "use strict";

  let requestId = 0;

  function speak(text, options = {}) {
    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      return Promise.reject(new Error("unsupported"));
    }

    const currentRequest = ++requestId;
    synthesis.cancel();
    synthesis.resume();
    const voices = synthesis.getVoices();
    const koreanVoices = voices.filter((voice) => /^ko(?:-|$)/i.test(String(voice.lang || "").replace(/_/g, "-")));
    const femaleVoicePattern = /female|woman|여성|여자|유나|선희|수니|소라|나리|해미|서연|지혜|yuna|sunhi|sora|nari|heami|seoyeon|jihye/i;
    const maleVoicePattern = /male|man|남성|남자|인준|민수|junho|injoon|minsu/i;
    const scoreVoice = (voice) => {
      const name = String(voice.name || "");
      const language = String(voice.lang || "").replace(/_/g, "-").toLowerCase();
      return (femaleVoicePattern.test(name) ? 1000 : 0) -
        (maleVoicePattern.test(name) ? 300 : 0) +
        (language === "ko-kr" ? 100 : 0) +
        (/natural|neural|premium|enhanced/.test(name.toLowerCase()) ? 20 : 0) +
        (/google|microsoft/.test(name.toLowerCase()) ? 10 : 0);
    };
    const preferredVoice = [...koreanVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
    const isKnownFemaleVoice = Boolean(preferredVoice && femaleVoicePattern.test(preferredVoice.name || ""));
    const utterance = new window.SpeechSynthesisUtterance(String(text || ""));
    utterance.lang = "ko-KR";
    utterance.rate = options.rate || 0.86;
    // Keep the known female voice natural; raise pitch slightly only when the
    // browser exposes Korean voices without gender labels.
    utterance.pitch = options.pitch ?? (isKnownFemaleVoice ? 1 : 1.08);
    if (preferredVoice) utterance.voice = preferredVoice;

    return new Promise((resolve, reject) => {
      let settled = false;
      let startTimer;
      let endTimer;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        clearTimeout(endTimer);
        error ? reject(error) : resolve({ voice: utterance.voice || null });
      };
      utterance.onstart = () => {
        clearTimeout(startTimer);
        options.onstart?.({ hasKoreanVoice: koreanVoices.length > 0 });
      };
      utterance.onend = () => {
        if (currentRequest === requestId) options.onend?.();
        finish();
      };
      utterance.onerror = (event) => finish(new Error(event.error || "speech-error"));
      startTimer = setTimeout(() => finish(new Error("start-timeout")), 5000);
      endTimer = setTimeout(() => finish(new Error("playback-timeout")), Math.max(15000, String(text || "").length * 350));

      try {
        // Keep speak() in the original button event so browsers retain user activation.
        synthesis.speak(utterance);
        synthesis.resume();
      } catch (error) {
        finish(error);
      }
    });
  }

  function stop() {
    requestId += 1;
    window.speechSynthesis?.cancel();
  }

  function messageFor(error) {
    const code = error && error.message;
    if (code === "unsupported") return "このブラウザは音声読み上げに対応していません。Chromeでお試しください。";
    if (code === "not-allowed" || code === "service-not-allowed") {
      return "ブラウザが音声再生を止めました。ページを一度タップしてから、もう一度お試しください。";
    }
    if (code === "interrupted" || code === "canceled") return "";
    if (code === "start-timeout") return "音声が始まりませんでした。ブラウザの音声設定を確認して、もう一度お試しください。";
    if (code === "language-unavailable" || code === "voice-unavailable") return "韓国語の音声がこのブラウザにありません。Chromeの韓国語音声設定をご確認ください。";
    return "音声を再生できませんでした。ページを一度タップしてから、もう一度お試しください。";
  }

  window.KoreanAudio = { speak, stop, messageFor };

  // Ask the browser to populate its voice list before the first button press.
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices(), { once: true });
  }
})();
