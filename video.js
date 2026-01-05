

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("camPreview");
  const playback = document.getElementById("recPlayback");
  const startCamBtn = document.getElementById("cam-start");
  const stopCamBtn = document.getElementById("cam-stop");
  const recStartBtn = document.getElementById("rec-start");
  const recStopBtn = document.getElementById("rec-stop");
  const statusEl = document.getElementById("rec-status");
  const downloadLink = document.getElementById("rec-download");

  if (!preview || !startCamBtn) return;

  let stream = null;
  let recorder = null;
  let chunks = [];
  let recordedBlob = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setDownloadEnabled(enabled) {
    if (!downloadLink) return;
    downloadLink.style.pointerEvents = enabled ? "auto" : "none";
    downloadLink.style.opacity = enabled ? "1" : ".6";
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      preview.srcObject = stream;

      startCamBtn.disabled = true;
      stopCamBtn.disabled = false;
      recStartBtn.disabled = false;
      recStopBtn.disabled = true;

      setStatus("Camera: ON");
    } catch (err) {
      console.error(err);
      setStatus("Camera error: permission denied or unsupported.");
    }
  }

  function stopCamera() {
    if (recorder && recorder.state === "recording") {
      stopRecording();
    }

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }

    preview.srcObject = null;

    startCamBtn.disabled = false;
    stopCamBtn.disabled = true;
    recStartBtn.disabled = true;
    recStopBtn.disabled = true;

    setStatus("Camera: OFF");
  }

  function pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return candidates.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  }

  function startRecording() {
    if (!stream) return;

    chunks = [];
    recordedBlob = null;
    setDownloadEnabled(false);

    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstart = () => {
      setStatus("Recording: ON 🔴");
      recStartBtn.disabled = true;
      recStopBtn.disabled = false;
    };

    recorder.onstop = () => {
      recordedBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(recordedBlob);

      playback.src = url;
      playback.load();

      if (downloadLink) {
        downloadLink.href = url;
        downloadLink.download = "recording.webm";
      }
      setDownloadEnabled(true);

      setStatus("Recording: saved ✅");
      recStartBtn.disabled = false;
      recStopBtn.disabled = true;
    };

    recorder.onerror = (e) => {
      console.error("Recorder error:", e);
      setStatus("Recording error.");
      recStartBtn.disabled = false;
      recStopBtn.disabled = true;
    };

    recorder.start();
  }

  function stopRecording() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  startCamBtn.addEventListener("click", startCamera);
  stopCamBtn.addEventListener("click", stopCamera);
  recStartBtn.addEventListener("click", startRecording);
  recStopBtn.addEventListener("click", stopRecording);


  window.addEventListener("beforeunload", stopCamera);
});

