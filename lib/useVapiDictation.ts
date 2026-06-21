"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Hold-to-talk dictation powered by Vapi. We spin up an ephemeral, voiceless
// assistant whose only job is to stream the user's speech back as transcript
// events, then stop the call on release — it behaves like pure dictation.
//
// Vapi (via Daily) always applies Krisp noise-cancellation on start(); that
// loads a WASM worker asynchronously. If we tear the call down before the
// worker is ready we get "WASM_OR_WORKER_NOT_READY" / mic-processor errors.
// To avoid that we (a) never stop before the call is actually live, and
// (b) drop the noise processor cleanly once the pipeline reports "listening".

type TranscriptMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  transcriptType?: "partial" | "final" | string;
};

type DailyCallLike = { updateInputSettings: (settings: unknown) => unknown };

type VapiClient = {
  on: (event: string, handler: (payload: unknown) => void) => void;
  start: (assistant: unknown) => Promise<unknown>;
  stop: () => void;
  getDailyCallObject?: () => DailyCallLike | null;
};

type Options = {
  onText: (text: string) => void;
};

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

// Krisp/Daily audio-processor hiccups are noisy but non-fatal — transcription
// continues on the raw mic — so we keep them out of the user-facing error slot.
const NON_FATAL = /krisp|processor|wasm|worker_not_ready/i;

export function useVapiDictation({ onText }: Options) {
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<VapiClient | null>(null);
  const startedRef = useRef(false); // call is live (pipeline "listening")
  const pendingStopRef = useRef(false); // released before it finished connecting
  const baseRef = useRef(""); // text already in the box when dictation started
  const finalsRef = useRef(""); // finalized speech for this session
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const emit = useCallback((partial: string) => {
    const text = [baseRef.current, finalsRef.current, partial]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trimStart();
    onTextRef.current(text);
  }, []);

  const dropNoiseProcessor = useCallback(() => {
    try {
      clientRef.current
        ?.getDailyCallObject?.()
        ?.updateInputSettings({ audio: { processor: { type: "none" } } });
    } catch {
      // non-fatal
    }
  }, []);

  const ensureClient = useCallback(async (): Promise<VapiClient | null> => {
    if (clientRef.current) return clientRef.current;
    if (!PUBLIC_KEY) return null;

    const mod = await import("@vapi-ai/web");
    const Vapi = mod.default as unknown as new (key: string) => VapiClient;
    const client = new Vapi(PUBLIC_KEY);

    client.on("message", (payload: unknown) => {
      const m = payload as TranscriptMessage;
      if (m?.type !== "transcript" || m.role !== "user") return;
      const text = (m.transcript ?? "").trim();
      if (!text) return;
      if (m.transcriptType === "final") {
        finalsRef.current = `${finalsRef.current} ${text}`.trim();
        emit("");
      } else {
        emit(text);
      }
    });
    client.on("error", (payload: unknown) => {
      const e = payload as { message?: string; errorMsg?: string } | undefined;
      const msg = e?.message ?? e?.errorMsg ?? "";
      if (!msg || NON_FATAL.test(msg)) return;
      setError(msg);
    });
    client.on("call-start", () => {
      startedRef.current = true;
      setConnecting(false);
      setListening(true);
      dropNoiseProcessor(); // krisp is ready now -> remove it cleanly
      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        try {
          client.stop();
        } catch {
          // ignore
        }
      }
    });
    client.on("call-end", () => {
      startedRef.current = false;
      pendingStopRef.current = false;
      setConnecting(false);
      setListening(false);
    });

    clientRef.current = client;
    return client;
  }, [emit, dropNoiseProcessor]);

  const start = useCallback(
    async (currentText: string) => {
      if (!PUBLIC_KEY) {
        setError("Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to enable voice");
        return;
      }
      setError(null);
      baseRef.current = currentText.trim();
      finalsRef.current = "";
      startedRef.current = false;
      pendingStopRef.current = false;
      setConnecting(true);
      setListening(false);
      try {
        const client = await ensureClient();
        if (!client) return;
        await client.start({
          firstMessage: "",
          firstMessageMode: "assistant-waits-for-user",
          transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a silent dictation transcriber. Never speak or respond.",
              },
            ],
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not start voice";
        if (!NON_FATAL.test(msg)) {
          setConnecting(false);
          setListening(false);
          setError(msg);
        }
      }
    },
    [ensureClient],
  );

  const stop = useCallback(() => {
    const client = clientRef.current;
    if (!client) {
      setConnecting(false);
      setListening(false);
      return;
    }
    if (startedRef.current) {
      try {
        client.stop();
      } catch {
        // ignore
      }
      setListening(false);
    } else {
      // Released before the call finished connecting: stop as soon as it's live
      // so we never tear Krisp down mid-initialization.
      pendingStopRef.current = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        clientRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return { listening, connecting, available: Boolean(PUBLIC_KEY), error, start, stop };
}
