const STORAGE_KEY = "tw-voice-config";
const DEFAULT_CONFIG = {
  apiBase: "",
  hfToken: "",
};

const ui = {
  startRecord: document.getElementById("startRecord"),
  stopRecord: document.getElementById("stopRecord"),
  recordingState: document.getElementById("recordingState"),
  asrResult: document.getElementById("asrResult"),
  audioUpload: document.getElementById("audioUpload"),
  ttsInput: document.getElementById("ttsInput"),
  synthesize: document.getElementById("synthesize"),
  ttsPlayer: document.getElementById("ttsPlayer"),
  apiBase: document.getElementById("apiBase"),
  hfToken: document.getElementById("hfToken"),
  saveConfig: document.getElementById("saveConfig"),
  message: document.getElementById("message"),
};

let mediaRecorder;
let recordedChunks = [];

function loadConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
}

function saveConfig() {
  const config = {
    apiBase: ui.apiBase.value.trim().replace(/\/$/, ""),
    hfToken: ui.hfToken.value.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  showMessage("設定已儲存");
  return config;
}

function getConfig() {
  return {
    apiBase: ui.apiBase.value.trim().replace(/\/$/, ""),
    hfToken: ui.hfToken.value.trim(),
  };
}

function showMessage(msg, isError = false) {
  ui.message.textContent = msg;
  ui.message.style.color = isError ? "#b91c1c" : "#0f766e";
}

async function callApi(path, payload, expected = "json") {
  const { apiBase, hfToken } = getConfig();
  if (!apiBase) {
    throw new Error("請先輸入 Proxy API Base URL");
  }

  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API 失敗 (${res.status}): ${text}`);
  }

  if (expected === "blob") {
    return res.blob();
  }
  return res.json();
}

async function audioFileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  new Uint8Array(buffer).forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function transcribeFile(file) {
  showMessage("轉錄中，請稍候...");
  const base64Audio = await audioFileToBase64(file);
  const data = await callApi("/api/asr", {
    audio: base64Audio,
    mimeType: file.type || "audio/webm",
  });
  ui.asrResult.value = data.text || "";
  showMessage("轉錄完成");
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });
    const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
    await transcribeFile(file);
  };

  mediaRecorder.start();
  ui.startRecord.disabled = true;
  ui.stopRecord.disabled = false;
  ui.recordingState.textContent = "錄音中...";
}

function stopRecording() {
  mediaRecorder?.stop();
  ui.startRecord.disabled = false;
  ui.stopRecord.disabled = true;
  ui.recordingState.textContent = "待機中";
}

async function synthesize() {
  const text = ui.ttsInput.value.trim();
  if (!text) {
    throw new Error("請輸入要轉換的中文文字");
  }

  showMessage("語音生成中，請稍候...");
  const audioBlob = await callApi(
    "/api/tts",
    {
      text,
      format: "wav",
    },
    "blob",
  );

  const url = URL.createObjectURL(audioBlob);
  ui.ttsPlayer.src = url;
  ui.ttsPlayer.play();
  showMessage("台語語音生成完成");
}

function init() {
  const config = loadConfig();
  ui.apiBase.value = config.apiBase;
  ui.hfToken.value = config.hfToken;

  ui.saveConfig.addEventListener("click", saveConfig);

  ui.startRecord.addEventListener("click", async () => {
    try {
      await startRecording();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  ui.stopRecord.addEventListener("click", () => {
    try {
      stopRecording();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  ui.audioUpload.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    try {
      await transcribeFile(file);
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  ui.synthesize.addEventListener("click", async () => {
    try {
      await synthesize();
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

init();
