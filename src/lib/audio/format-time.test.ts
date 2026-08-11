import { describe, expect, it } from "vitest";

import { formatPlaybackTime } from "./format-time";

describe("formatPlaybackTime", () => {
  it.each([
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
    [-1, "0:00"],
    [0, "0:00"],
    [5.9, "0:05"],
    [65, "1:05"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3661, "1:01:01"],
  ])("formats %s as %s", (seconds, expected) => {
    expect(formatPlaybackTime(seconds)).toBe(expected);
  });
});
