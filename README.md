# TaiwaneseTranslate

一個行動版優先的台語工具：
- 台語語音 → 中文文字（`MediaTek-Research/Breeze-ASR-26`）
- 中文文字 → 台語語音（`MediaTek-Research/BreezyVoice`）

## 架構建議（免費為主）

### 1) 前端：GitHub Pages（免費）
GitHub Pages 非常適合靜態網站（本專案 `index.html + app.js + styles.css`）。

### 2) API Proxy：Cloudflare Workers（免費額度大、部署簡單）
因為 Hugging Face Token 不應放在前端，所以建議把 Token 放在 Worker Secret。

> 結論：**可以用 GitHub 當前端伺服器**，但 ASR/TTS 推論仍需要一個後端代理。最推薦是 **Cloudflare Workers**，次選是 Hugging Face Spaces（Gradio）或 Render free tier。

---

## 本機執行前端

```bash
python -m http.server 8080
# 然後開啟 http://localhost:8080
```

## 部署前端到 GitHub Pages

1. 將本 repo push 到 GitHub。
2. 到 repo 的 **Settings → Pages**。
3. Source 選擇 `Deploy from a branch`，branch 選 `main`（或你的發布分支）。
4. 儲存後會取得 `https://<username>.github.io/<repo>/`。

## 部署 Cloudflare Worker（API Proxy）

### 先決條件
- Cloudflare 帳號
- Node.js 18+
- Hugging Face Access Token（`hf_...`）

### 指令

```bash
cd server
npm install -g wrangler
wrangler login
wrangler secret put HF_TOKEN
wrangler deploy
```

部署完成後會得到像：
`https://taiwanese-translate-proxy.<subdomain>.workers.dev`

把這個 URL 填到網頁中的 **Proxy API Base URL**。

---

## API 規格（前端呼叫 Worker）

### `POST /api/asr`
```json
{
  "audio": "<base64-audio>",
  "mimeType": "audio/webm"
}
```
Response:
```json
{
  "text": "轉錄結果"
}
```

### `POST /api/tts`
```json
{
  "text": "今天天氣真好"
}
```
Response: `audio/wav` 二進位音檔

---

## 設計說明（mobile-first）

本版面採用：
- 單欄卡片式流程（先 ASR，再 TTS，再設定）
- 大按鈕、清楚狀態文字、輸入欄位高可讀
- 以手機優先排版，平板以上僅放大留白與字級

參考了 design systems 常見建議（層級、可讀性、觸控友善間距、狀態回饋）。

---

## 如果你想「全免費」又更省維運

1. **GitHub Pages + Cloudflare Workers（推薦）**
   - 幾乎零成本
   - 部署快
2. **Hugging Face Spaces（Gradio 一體化）**
   - 前後端放一起，簡單
   - 但 UI 自由度較小
3. **Render Free Web Service**
   - 可跑 Node/Express
   - 可能有冷啟動、免費額度限制

