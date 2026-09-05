"use server";

/**
 * Edge TTS: free Microsoft neural voices via the Edge Read-Aloud
 * WebSocket endpoint (no API key required).
 *
 * Provides natural-sounding Bengali (bn-BD-NabanitaNeural / PradeepNeural)
 * and English voices for the voice assistant, fixing the poor accent of
 * the browser's built-in speechSynthesis voices.
 *
 * Uses the `msedge-tts` package, which handles the Sec-MS-GEC DRM token.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICE_BN_FEMALE = "bn-BD-NabanitaNeural";
const VOICE_BN_MALE = "bn-BD-PradeepNeural";
const VOICE_EN_FEMALE = "en-US-AriaNeural";

/**
 * Synthesize speech from text using Edge neural TTS.
 * Returns base64-encoded MP3 audio, or null on failure.
 */
export async function synthesizeEdgeSpeech(
  text: string,
  isBn: boolean,
): Promise<string | null> {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const voice = isBn ? VOICE_BN_FEMALE : VOICE_EN_FEMALE;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    const { audioStream } = tts.toStream(clean.slice(0, 2000));

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Edge TTS timeout"));
      }, 15000);
      audioStream.on("data", (c: Buffer) => chunks.push(c));
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve();
      });
      audioStream.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });

    try {
      tts.close();
    } catch {}

    const buf = Buffer.concat(chunks);
    if (buf.length < 100) return null;
    return buf.toString("base64");
  } catch (err) {
    console.warn("[EdgeTTS] Synthesis failed:", err);
    return null;
  }
}
