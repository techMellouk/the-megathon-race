"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ModelScene from "./model-scene";
import { GeneratingLoader } from "./generating-loader";
import { LinkedInButton } from "./linkedin-button";
import { PaymentOffer } from "./payment-offer";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { getErrorMessage } from "@/lib/utils";
import { fadeBlurIn, fadeIn, scaleBlurIn } from "@/lib/motion";

type GenerationStatus = "idle" | "generating" | "ready" | "error";

type GenerateResponse = {
  modelUrl?: string;
  sourceUrl?: string;
  error?: string;
};

// The ai-prompt-box wraps messages like "[Search: ...]" when a mode toggle is
// active. Strip that wrapper so the 3D prompt stays clean.
export function cleanMessage(message: string) {
  const wrapped = message.match(/^\[(?:Search|Think|Canvas):\s*([\s\S]*)\]$/);
  return (wrapped ? wrapped[1] : message).trim();
}

export default function ModelStudio() {
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGeneration(rawMessage: string) {
    if (rawMessage.startsWith("[Voice message")) return;
    const prompt = cleanMessage(rawMessage);
    if (!prompt || status === "generating") return;

    setSubmittedPrompt(prompt);
    setStatus("generating");
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        body: JSON.stringify({ prompt }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      let data: GenerateResponse;
      try {
        data = (await response.json()) as GenerateResponse;
      } catch {
        throw new Error(`Server error (${response.status})`);
      }

      if (!response.ok || !data.modelUrl) {
        throw new Error(data.error || "Generation failed.");
      }

      setModelUrl(data.modelUrl);
      setStatus("ready");
    } catch (generationError) {
      setError(getErrorMessage(generationError, "Generation failed."));
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setModelUrl(null);
    setError(null);
    setSubmittedPrompt("");
  }

  const showHero = status === "idle" || (status === "error" && !modelUrl);
  const showLoading = status === "generating" && !modelUrl;
  const showScene = Boolean(modelUrl) || status === "ready";
  const refining = status === "generating" && Boolean(modelUrl);

  return (
    <main className="studio-shell">
      <AnimatePresence mode="wait">
        {showHero && (
          <motion.section
            key="hero"
            className="prompt-screen gradient-bg"
            aria-label="3D model prompt"
            {...fadeBlurIn}
          >
            <div className="prompt-stack">
              <div className="hero-heading">
                <LinkedInButton />
                <h1 className="hero-title">THE MEGATHON RACE</h1>
                <p className="hero-subtitle">
                  Generate the car that lets you win the race. Describe your dream
                  racer, we build it in 3D, then you take it to the track.
                </p>
              </div>

              <PromptInputBox
                onSend={runGeneration}
                placeholder="A low, aggressive neon street racer with a carbon wing…"
              />

              {status === "error" && error ? (
                <motion.div
                  className="error-banner"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              ) : null}
            </div>
          </motion.section>
        )}

        {showLoading && (
          <motion.section
            key="loading"
            className="loading-screen gradient-bg"
            aria-label="Generating model"
            {...fadeIn}
          >
            <GeneratingLoader prompt={submittedPrompt} />
          </motion.section>
        )}

        {showScene && (
          <motion.section
            key="scene"
            className="canvas-screen"
            aria-label="Generated 3D model"
            {...scaleBlurIn}
          >
            <ModelScene
              modelUrl={modelUrl}
              status={
                status === "ready"
                  ? "ready"
                  : status === "error"
                    ? "error"
                    : "generating"
              }
            />

            <div className="canvas-toolbar">
              <div className="status-pill" data-status={status}>
                <Sparkles size={15} />
                <span>
                  {refining
                    ? "Refining"
                    : status === "ready"
                      ? "Ready"
                      : status === "error"
                        ? "Stopped"
                        : "Generating"}
                </span>
              </div>
              <button className="reset-button" onClick={reset} type="button" aria-label="New model">
                <RotateCcw size={17} />
              </button>
            </div>

            <AnimatePresence>
              {refining && (
                <motion.div
                  className="refine-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GeneratingLoader prompt={submittedPrompt} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="canvas-dock">
              {status === "error" && error ? (
                <div className="error-banner dock">{error}</div>
              ) : null}
              <PromptInputBox
                onSend={runGeneration}
                isLoading={refining}
                placeholder={
                  submittedPrompt
                    ? `Refine: ${submittedPrompt}`
                    : "Tweak your race car or describe a new one…"
                }
              />
            </div>

            {status === "ready" && modelUrl ? (
              <PaymentOffer modelUrl={modelUrl} prompt={submittedPrompt} />
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
