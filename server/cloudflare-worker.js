/**
 * Cloudflare Worker proxy for:
 * - MediaTek-Research/Breeze-ASR-26
 * - MediaTek-Research/BreezyVoice
 *
 * Set secret: HF_TOKEN
 */

const ASR_MODEL = "MediaTek-Research/Breeze-ASR-26";
const TTS_MODEL = "MediaTek-Research/BreezyVoice";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function inferenceJson(model, token, payload) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text}`);
  }

  return response.json();
}

async function inferenceBinary(model, token, payload) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Only POST is supported." }, 405);
    }

    const token = env.HF_TOKEN;
    if (!token) {
      return json({ error: "Missing HF_TOKEN secret in worker." }, 500);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/asr") {
        const { audio, mimeType } = await request.json();
        if (!audio) return json({ error: "audio is required" }, 400);

        const result = await inferenceJson(ASR_MODEL, token, {
          inputs: audio,
          parameters: {
            return_timestamps: false,
            mime_type: mimeType || "audio/webm",
          },
        });

        return new Response(JSON.stringify({ text: result.text || "" }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      if (url.pathname === "/api/tts") {
        const { text } = await request.json();
        if (!text) return json({ error: "text is required" }, 400);

        return inferenceBinary(TTS_MODEL, token, {
          inputs: text,
        });
      }

      return json({ error: "Not Found" }, 404);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Inference failed",
          detail: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },
};
