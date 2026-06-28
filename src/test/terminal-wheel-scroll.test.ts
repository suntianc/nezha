import { describe, expect, test, vi } from "vitest";
import { attachWindowsCodexWheelScrollFix } from "../components/terminalShared";

type WheelHandler = (event: WheelEvent) => boolean;

interface WheelTestTerminal {
  buffer: { active: { type: "normal" | "alternate" } };
  attachCustomWheelEventHandler: (handler: WheelHandler) => void;
  scrollLines: (amount: number) => void;
}

function createTerminal(bufferType: "normal" | "alternate" = "normal") {
  let handler: WheelHandler | null = null;
  const term: WheelTestTerminal = {
    buffer: { active: { type: bufferType } },
    attachCustomWheelEventHandler: vi.fn((next: WheelHandler) => {
      handler = next;
    }),
    scrollLines: vi.fn(),
  };
  return {
    term,
    wheel(deltaY: number) {
      if (!handler) throw new Error("wheel handler was not attached");
      return handler(new WheelEvent("wheel", { deltaY }));
    },
  };
}

describe("Windows Codex terminal wheel scrolling", () => {
  test("scrolls Host Scrollback and suppresses xterm handling in the normal buffer", () => {
    const { term, wheel } = createTerminal("normal");

    attachWindowsCodexWheelScrollFix({
      term,
      agent: "codex",
      platform: "windows",
      onInput: vi.fn(),
    });

    expect(wheel(120)).toBe(false);
    const amount = vi.mocked(term.scrollLines).mock.calls[0]?.[0];
    expect(amount).toBeGreaterThan(0);
  });

  test("does not attach outside Windows Codex Agent Task Terminals", () => {
    for (const [platform, agent] of [
      ["macos", "codex"],
      ["other", "codex"],
      ["windows", "claude"],
    ] as const) {
      const { term } = createTerminal("normal");

      attachWindowsCodexWheelScrollFix({
        term,
        platform,
        agent,
        onInput: vi.fn(),
      });

      expect(term.attachCustomWheelEventHandler).not.toHaveBeenCalled();
    }
  });

  test("restores xterm wheel handling on dispose", () => {
    const { term, wheel } = createTerminal("normal");

    const dispose = attachWindowsCodexWheelScrollFix({
      term,
      agent: "codex",
      platform: "windows",
      onInput: vi.fn(),
    });
    dispose();

    expect(wheel(120)).toBe(true);
  });

  test("translates alternate-buffer wheel input into arrow keys for the Hosted Agent TUI", () => {
    const { wheel, term } = createTerminal("alternate");
    const onInput = vi.fn();

    attachWindowsCodexWheelScrollFix({
      term,
      agent: "codex",
      platform: "windows",
      onInput,
    });

    expect(wheel(-120)).toBe(false);
    expect(onInput).toHaveBeenCalledWith("\x1b[A");
    expect(wheel(120)).toBe(false);
    expect(onInput).toHaveBeenCalledWith("\x1b[B");
    expect(term.scrollLines).not.toHaveBeenCalled();
  });
});
