// src/components/journal/useDictation.ts
"use client";

// Voice journaling via the browser's built-in speech recognition (Chrome, Edge,
// Safari). Audio is handled by the browser; Kaizen never receives or stores it.
import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(onFinalText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onText = useRef(onFinalText);
  onText.current = onFinalText;

  useEffect(() => setSupported(Boolean(getCtor())), []);
  useEffect(() => () => rec.current?.abort(), []);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onText.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser's site settings."
          : e.error === "no-speech"
            ? "Didn't catch anything — try again a little closer to the mic."
            : "Voice input stopped unexpectedly."
      );
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Couldn't start voice input.");
    }
  }, []);

  return { supported, listening, interim, error, start, stop };
}
