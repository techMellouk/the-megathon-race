"use client";

import { useEffect, useState } from "react";

const BUILD_STEPS = [
  "Sketching the chassis",
  "Shaping the bodywork",
  "Sculpting the wheels",
  "Laying down the paint",
  "Polishing the details",
];

export function GeneratingLoader({ prompt }: { prompt?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % BUILD_STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="generating-stage" role="status" aria-live="polite">
      <div className="build-stage">
        <div className="build-floor" aria-hidden="true" />
        <div className="build-turntable" aria-hidden="true">
          <svg
            className="build-car"
            viewBox="0 0 260 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="car-line car-body"
              d="M18 86 C22 64 44 56 70 54 C86 40 108 32 138 32 C168 32 190 42 206 56 C226 58 242 66 246 86"
            />
            <path
              className="car-line car-cabin"
              d="M84 52 C96 40 116 36 136 36 C158 36 176 42 192 54"
            />
            <line className="car-line car-pillar" x1="118" y1="34" x2="116" y2="52" />
            <line className="car-line car-pillar" x1="160" y1="36" x2="166" y2="54" />
            <line className="car-line car-sill" x1="40" y1="86" x2="226" y2="86" />
            <circle className="car-line car-wheel" cx="78" cy="88" r="18" />
            <circle className="car-line car-wheel" cx="192" cy="88" r="18" />
            <circle className="car-line car-hub" cx="78" cy="88" r="6" />
            <circle className="car-line car-hub" cx="192" cy="88" r="6" />
          </svg>
          <div className="build-scan" />
        </div>
        <div className="build-ring build-ring-a" aria-hidden="true" />
        <div className="build-ring build-ring-b" aria-hidden="true" />

        <div className="build-status">
          <div className="build-step">
            <span className="build-step-label">{BUILD_STEPS[step]}</span>
            <span className="build-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="build-progress" aria-hidden="true">
            <span className="build-progress-bar" />
          </div>
          {prompt ? <p className="generating-caption">{prompt}</p> : null}
        </div>
      </div>
    </div>
  );
}
