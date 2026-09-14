"use server";

import {
  createListeningLink,
  revokeListeningLink,
} from "@/lib/listening/service";
import type {
  CreateListeningLinkInput,
  ListeningLinkSummary,
} from "@/lib/listening/types";
import { listeningMessages } from "@/lib/listening/validation";

export type ListeningCreateActionResult =
  | { success: true; link: ListeningLinkSummary; rawToken: string }
  | { success: false; message: string };

export type ListeningRevokeActionResult =
  | { success: true; link: ListeningLinkSummary }
  | { success: false; message: string };

const stableActionMessages = new Set<string>(Object.values(listeningMessages));

function actionMessage(error: unknown): string {
  if (error instanceof Error && stableActionMessages.has(error.message)) {
    return error.message;
  }

  return listeningMessages.linkUnavailable;
}

export async function createListeningLinkAction(
  input: CreateListeningLinkInput,
): Promise<ListeningCreateActionResult> {
  try {
    const result = await createListeningLink(input);
    return { success: true, link: result.link, rawToken: result.rawToken };
  } catch (error) {
    return { success: false, message: actionMessage(error) };
  }
}

export async function revokeListeningLinkAction(input: {
  linkId: string;
}): Promise<ListeningRevokeActionResult> {
  try {
    const link = await revokeListeningLink(input.linkId);
    return { success: true, link };
  } catch (error) {
    return { success: false, message: actionMessage(error) };
  }
}
