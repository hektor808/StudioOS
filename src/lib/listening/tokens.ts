import "server-only";

import { createHash, randomBytes } from "node:crypto";

const LISTENING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function normalizeListeningToken(value: string): string | null {
  if (typeof value !== "string" || !LISTENING_TOKEN_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function digestListeningToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createListeningToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: digestListeningToken(rawToken) };
}

function containsControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint !== undefined &&
      (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159))
    );
  });
}

export function isPrivateObjectKey(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    !value.includes("://") &&
    !containsControlCharacters(value)
  );
}
