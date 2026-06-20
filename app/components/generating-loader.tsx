"use client";

const WORD = "Generating".split("");

export function GeneratingLoader({ prompt }: { prompt?: string }) {
  return (
    <div className="generating-stage">
      <div className="loader-wrapper" role="status" aria-live="polite">
        {WORD.map((letter, index) => (
          <span
            className="loader-letter"
            key={`${letter}-${index}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {letter}
          </span>
        ))}
        <div className="loader" />
      </div>
      {prompt ? <p className="generating-caption">{prompt}</p> : null}
    </div>
  );
}
