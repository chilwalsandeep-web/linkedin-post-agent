import { Fragment } from "react";

export const STEPS = [
  { key: "topic", label: "Topic" },
  { key: "angle", label: "Angle" },
  { key: "image", label: "Image" },
  { key: "review", label: "Review" },
  { key: "done", label: "Live" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Progress rail across the five stages of a post. */
export default function Steps({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
        return (
          <Fragment key={step.key}>
            {i > 0 && <li className="step-line" aria-hidden="true" />}
            <li className="step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span className="step-dot" aria-hidden="true">
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className="step-label">{step.label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
