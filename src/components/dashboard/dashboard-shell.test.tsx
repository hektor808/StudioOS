import { act, render, screen, within } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetAudioStore, useAudioStore } from "@/lib/store/useAudioStore";

import { DashboardShell } from "./dashboard-shell";

vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

const media = {
  play: vi.spyOn(HTMLMediaElement.prototype, "play"),
  pause: vi.spyOn(HTMLMediaElement.prototype, "pause"),
  load: vi.spyOn(HTMLMediaElement.prototype, "load"),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetAudioStore();
  media.play.mockResolvedValue(undefined);
  media.pause.mockImplementation(() => undefined);
  media.load.mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("DashboardShell", () => {
  it("composes one main landmark and one player after route content", () => {
    const { container } = render(
      <DashboardShell>
        <section>Route child</section>
      </DashboardShell>,
    );

    expect(container.querySelectorAll("main")).toHaveLength(1);
    const aside = screen.getByRole("complementary");
    const header = screen.getByRole("banner");
    expect(aside).toHaveClass("hidden", "lg:flex");
    expect(header).toHaveClass("lg:hidden");
    expect(within(aside).getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Toggle theme" })).toHaveLength(2);

    const main = screen.getByTestId("dashboard-route-content");
    const player = screen.getByRole("region", { name: "Global audio player" });
    expect(main).toHaveClass("dashboard-shell-main");
    expect(screen.getAllByRole("region", { name: "Global audio player" })).toHaveLength(1);
    expect(main.contains(player)).toBe(false);
    expect(
      main.compareDocumentPosition(player) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("preserves the player element and store state across child rerenders", () => {
    const view = render(
      <DashboardShell>
        <section>First route</section>
      </DashboardShell>,
    );

    act(() => {
      useAudioStore.getState().selectSource({
        sourceId: "version-a",
        trackId: "track-a",
        title: "Signal One",
        playbackUrl: "/audio/signal-one.mp3",
      });
    });

    act(() => {
      useAudioStore.getState().reportDuration(120);
      useAudioStore.getState().reportCurrentTime(18);
      useAudioStore.getState().reportPlaying(true);
    });

    const audio = screen.getByTestId("global-audio-element");
    view.rerender(
      <DashboardShell>
        <section>Second route</section>
      </DashboardShell>,
    );

    expect(screen.getByText("Second route")).toBeInTheDocument();
    expect(screen.getByTestId("global-audio-element")).toBe(audio);
    expect(useAudioStore.getState()).toMatchObject({
      source: expect.objectContaining({ sourceId: "version-a" }),
      currentTime: 18,
      duration: 120,
      isPlaying: true,
    });
  });
});
