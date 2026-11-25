import { describe, expect, it } from "vitest";
import {
  classifyElementCode,
  formatOutcomeLabel,
} from "@/lib/elementTaxonomy";

describe("classifyElementCode", () => {
  it("classifies single and combination jumps", () => {
    for (const code of ["3Lo", "2A", "3S+3T", "2Lz+2A+2A", "4T", "1Eu"]) {
      expect(classifyElementCode(code)).toBe("jump");
    }
  });

  it("classifies spins", () => {
    for (const code of ["CCoSp4", "FSSp4", "CSp3", "LSp"]) {
      expect(classifyElementCode(code)).toBe("spin");
    }
  });

  it("classifies step/choreo sequences", () => {
    for (const code of ["StSq3", "ChSq1", "chsq", "STSQ2"]) {
      expect(classifyElementCode(code)).toBe("sequence");
    }
  });

  it("falls back to other for empty or unknown codes", () => {
    for (const code of ["", "   ", "XYZ", "???"]) {
      expect(classifyElementCode(code)).toBe("other");
    }
  });
});

describe("formatOutcomeLabel", () => {
  it("maps known execution outcomes to friendly labels", () => {
    expect(formatOutcomeLabel("clean")).toBe("Clean");
    expect(formatOutcomeLabel("step_out")).toBe("Step-Out");
    expect(formatOutcomeLabel("hand_2ft")).toBe("Hand / 2ft");
  });

  it("humanizes unknown outcome codes", () => {
    expect(formatOutcomeLabel("two_foot")).toBe("Two Foot");
    expect(formatOutcomeLabel("")).toBe("");
  });
});
