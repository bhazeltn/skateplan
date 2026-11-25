// Element-aware taxonomy: classifies an element code into a category and exposes
// the category-appropriate execution outcomes and technical "call" tags. Mirrors
// the backend two-tier model (clean = outcome "clean" AND no tags; with-calls =
// outcome "clean" WITH tags). Canonical clean outcome string is lowercase "clean".
export type ElementCategory = "jump" | "spin" | "sequence" | "other";

export interface Option {
  value: string;
  label: string;
}

// A single jump token, e.g. 3Lo, 2A, 4T, 1Eu. Combination codes join tokens with "+".
const JUMP_TOKEN = /^[1-4](A|T|S|Lo|F|Lz|Eu)$/i;

/** Classify an element code. Order matters: sequence -> spin -> jump -> other.
 *  (Step/choreo sequences contain no "sp"; spins do; jump tokens contain no "sp".) */
export function classifyElementCode(code: string): ElementCategory {
  const c = code.trim().toLowerCase();
  if (!c) return "other";
  if (c.includes("stsq") || c.includes("chsq")) return "sequence";
  if (c.includes("sp")) return "spin";
  const isJump = code
    .split("+")
    .some((tok) => JUMP_TOKEN.test(tok.trim()));
  return isJump ? "jump" : "other";
}

export const EXECUTION_OPTIONS_BY_CATEGORY: Record<ElementCategory, Option[]> = {
  jump: [
    { value: "clean", label: "Clean" },
    { value: "step_out", label: "Step-Out" },
    { value: "hand_2ft", label: "Hand / 2ft" },
    { value: "pop", label: "Pop" },
    { value: "fall", label: "Fall" },
    { value: "skipped", label: "Skipped" },
  ],
  spin: [
    { value: "clean", label: "Clean" },
    { value: "error", label: "Error" },
    { value: "fall", label: "Fall" },
    { value: "skipped", label: "Skipped" },
  ],
  sequence: [
    { value: "clean", label: "Clean" },
    { value: "stumble", label: "Stumble" },
    { value: "fall", label: "Fall" },
    { value: "skipped", label: "Skipped" },
  ],
  other: [
    { value: "clean", label: "Clean" },
    { value: "error", label: "Error" },
    { value: "fall", label: "Fall" },
    { value: "skipped", label: "Skipped" },
  ],
};

export const TECH_TAGS_BY_CATEGORY: Record<ElementCategory, string[]> = {
  jump: ["q", "<", "<<", "!", "e", "No Combo"],
  spin: ["Missed Feature", "V", "Travel", "Slow", "Balance", "Invalid (*)"],
  sequence: ["Missed Feature", "Unclean Turn", "Timing", "Invalid (*)"],
  other: ["Missed Feature", "Timing", "Balance"],
};

// Label lookup built once from every execution option across all categories.
const OUTCOME_LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const opts of Object.values(EXECUTION_OPTIONS_BY_CATEGORY)) {
    for (const o of opts) map[o.value] = o.label;
  }
  return map;
})();

function humanize(outcome: string): string {
  return outcome
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Friendly label for an execution outcome; humanizes unknown codes. */
export function formatOutcomeLabel(outcome: string): string {
  if (!outcome) return "";
  return OUTCOME_LABEL_MAP[outcome] ?? humanize(outcome);
}

/** Execution options for the element's category (helper for row/form rendering). */
export function executionOptionsFor(code: string): Option[] {
  return EXECUTION_OPTIONS_BY_CATEGORY[classifyElementCode(code)];
}

/** Technical tags available for the element's category. */
export function techTagsFor(code: string): string[] {
  return TECH_TAGS_BY_CATEGORY[classifyElementCode(code)];
}
