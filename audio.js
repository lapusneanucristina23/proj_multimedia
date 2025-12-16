
(() => {

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


  let audioCtx = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function chime() {
    try {
      const ctx = ensureAudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.value = 880; // A5-ish
      g.gain.value = 0.0001;

      o.connect(g);
      g.connect(ctx.destination);

      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      o.start(t);
      o.stop(t + 0.2);
    } catch {
      // Silent fail if WebAudio not available
    }
  }


  const synth = window.speechSynthesis;
  let voices = [];
  let currentUtterance = null;

  const voiceSelect = $("#voice");
  const rateSlider = $("#rate");

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];

 
    if (!voiceSelect) return;

    voiceSelect.innerHTML = "";
    voices.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `${v.name} (${v.lang})${v.default ? " • default" : ""}`;
      // Prefer Romanian/English voices if available
      if (v.lang?.toLowerCase().startsWith("ro")) opt.dataset.prefer = "1";
      if (v.lang?.toLowerCase().startsWith("en")) opt.dataset.prefer = opt.dataset.prefer || "2";
      voiceSelect.appendChild(opt);
    });


    const preferred =
      $$("option", voiceSelect).find(o => o.dataset.prefer === "1") ||
      $$("option", voiceSelect).find(o => o.dataset.prefer === "2") ||
      voiceSelect.options[0];

    if (preferred) voiceSelect.value = preferred.value;
  }

  function stopSpeech() {
    if (!synth) return;
    synth.cancel();
    currentUtterance = null;
  }

  function speakText(text) {
    if (!synth) {
      console.warn("SpeechSynthesis not supported in this browser.");
      return;
    }
    if (!text || !text.trim()) return;


    stopSpeech();

 
    chime();

    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;
    if (voiceSelect && voices.length) {
      const idx = Number(voiceSelect.value);
      if (!Number.isNaN(idx) && voices[idx]) u.voice = voices[idx];
    }


    if (rateSlider) {
      const rate = Number(rateSlider.value);
      if (!Number.isNaN(rate)) u.rate = rate;
    }


    u.pitch = 1.0;
    u.volume = 1.0;

    u.onend = () => {
      currentUtterance = null;
    };
    u.onerror = () => {
      currentUtterance = null;
    };

    synth.speak(u);
  }

  function cardToNarration(cardEl) {
   
    const duration = $("strong", cardEl)?.textContent?.trim() || "Route";
    const transfers = $(".card-row .muted", cardEl)?.textContent?.trim() || "";
    const steps = $$(".steps li", cardEl).map(li => li.textContent.trim());


    const sanitize = (s) =>
      s.replace(/[🚶🚌🚋🚇•]+/g, "").replace(/\s+/g, " ").trim();

    const parts = [
      `Selected route: ${sanitize(duration)}.`,
      transfers ? sanitize(transfers) + "." : "",
      "Steps:",
      ...steps.map((s, i) => `Step ${i + 1}. ${sanitize(s)}.`)
    ].filter(Boolean);

    return parts.join(" ");
  }


  function wireRouteStartButtons() {
    // The "Start" buttons are currently: <button class="btn btn-primary">Start</button> :contentReference[oaicite:2]{index=2}
    $$(".card").forEach(card => {
      const startBtn = $$(".btn", card).find(b => b.textContent.trim().toLowerCase() === "start");
      if (!startBtn) return;

      startBtn.addEventListener("click", () => {
        const narration = cardToNarration(card);
        speakText(narration);
      });
    });
  }


  function wireGlobalControls() {
    const pauseBtn = $("#audio-pause");
    const resumeBtn = $("#audio-resume");
    const stopBtn = $("#audio-stop");

    pauseBtn?.addEventListener("click", () => {
      if (!synth) return;
      if (synth.speaking && !synth.paused) synth.pause();
    });

    resumeBtn?.addEventListener("click", () => {
      if (!synth) return;
      if (synth.paused) synth.resume();
    });

    stopBtn?.addEventListener("click", () => stopSpeech());
  }


  function wireDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // If buttons exist, disable them with a tooltip
      $("#dictate-from")?.setAttribute("disabled", "disabled");
      $("#dictate-to")?.setAttribute("disabled", "disabled");
      $("#dictate-from")?.setAttribute("title", "Dictation not supported in this browser");
      $("#dictate-to")?.setAttribute("title", "Dictation not supported in this browser");
      return;
    }

    const fromInput = $("#from");
    const toInput = $("#to");
    const btnFrom = $("#dictate-from");
    const btnTo = $("#dictate-to");

    const startDictation = (targetInput) => {
      if (!targetInput) return;

      // User gesture -> also resume audio ctx (nice UX)
      ensureAudioContext();
      chime();

      const rec = new SpeechRecognition();
      rec.lang = "ro-RO"; // change to "en-US" if you want
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) targetInput.value = transcript.trim();
      };

      rec.onerror = (e) => {
        console.warn("SpeechRecognition error:", e?.error);
      };

      rec.start();
    };

    btnFrom?.addEventListener("click", () => startDictation(fromInput));
    btnTo?.addEventListener("click", () => startDictation(toInput));
  }


  function init() {
  
    if (synth) {
      loadVoices();
      // Some browsers fire voiceschanged when voices are ready
      synth.addEventListener?.("voiceschanged", loadVoices);
    }

    wireRouteStartButtons();
    wireGlobalControls();
    wireDictation();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
