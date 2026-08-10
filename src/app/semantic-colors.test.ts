import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const globals = readFileSync(
  resolve(projectRoot, "src", "app", "globals.css"),
  "utf8",
);
const tailwind = readFileSync(resolve(projectRoot, "tailwind.config.ts"), "utf8");
const button = readFileSync(
  resolve(projectRoot, "src", "components", "ui", "button.tsx"),
  "utf8",
);
const loginPage = readFileSync(
  resolve(projectRoot, "src", "app", "(auth)", "login", "page.tsx"),
  "utf8",
);
const loginForm = readFileSync(
  resolve(projectRoot, "src", "app", "(auth)", "login", "login-form.tsx"),
  "utf8",
);

function ruleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globals.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  if (!match) {
    throw new Error(`Missing CSS rule for ${selector}`);
  }

  return match[1];
}

function variable(rule: string, name: string) {
  const match = rule.match(new RegExp(`--${name}:\\s*([^;]+);`));

  if (!match) {
    throw new Error(`Missing --${name}`);
  }

  return match[1].trim();
}

function hslToRgb(value: string) {
  const match = value.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);

  if (!match) {
    throw new Error(`Unsupported HSL token: ${value}`);
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, x, 0]
      : segment < 2
        ? [x, chroma, 0]
        : segment < 3
          ? [0, chroma, x]
          : segment < 4
            ? [0, x, chroma]
            : segment < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const offset = lightness - chroma / 2;

  return [red + offset, green + offset, blue + offset];
}

function contrastRatio(first: string, second: string) {
  const luminance = (value: string) => {
    const channels = hslToRgb(value).map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("semantic color roles", () => {
  it("separates readable dark text roles from brand and error containers", () => {
    const dark = ruleBody(".dark");
    const background = variable(dark, "background");
    const primary = variable(dark, "primary");
    const primaryContainer = variable(dark, "primary-container");
    const destructive = variable(dark, "destructive");
    const destructiveContainer = variable(dark, "destructive-container");

    expect(primary).toBe("252 100% 87.25%");
    expect(primaryContainer).toBe("259.86 100% 27.25%");
    expect(destructive).toBe("6.43 100% 83.53%");
    expect(destructiveContainer).toBe("355.92 100% 28.82%");
    expect(primary).not.toBe(primaryContainer);
    expect(destructive).not.toBe(destructiveContainer);
    expect(contrastRatio(primary, background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(destructive, background)).toBeGreaterThanOrEqual(7);
  });

  it("maps container roles through Tailwind semantics", () => {
    expect(tailwind).toContain(
      'container: "hsl(var(--primary-container))"',
    );
    expect(tailwind).toContain(
      '"container-foreground": "hsl(var(--primary-container-foreground))"',
    );
    expect(tailwind).toContain(
      'container: "hsl(var(--destructive-container))"',
    );
  });

  it("uses container tokens for fills while keeping small copy on readable roles", () => {
    expect(button).toContain(
      "bg-primary-container text-primary-container-foreground",
    );
    expect(button).toContain("hover:bg-primary-container/90");
    expect(button).not.toContain("rgba(46,0,139");
    expect(loginPage).toContain("bg-primary-container/15");
    expect(loginPage).toContain("from-primary-container/50");
    expect(loginPage).toContain("text-primary");
    expect(loginForm).toContain("bg-destructive-container/10");
    expect(loginForm).toContain("text-sm text-destructive");
  });
});
