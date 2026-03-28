import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FrameCalcApp } from "@/components/frame-calc-app";
import {
  HISTORY_STORAGE_KEY,
  parseHistoryEntries,
  serializeHistoryEntries,
} from "@/lib/history";

describe("FrameCalcApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("auto-saves a valid calculation after the debounce delay", async () => {
    vi.useFakeTimers();
    render(<FrameCalcApp />);

    fireEvent.change(screen.getByLabelText("난간 전체 길이"), {
      target: { value: "3.6" },
    });
    fireEvent.change(screen.getByLabelText("난간살 사이의 개수"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("난간 두께"), {
      target: { value: "38" },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const savedEntries = parseHistoryEntries(
      window.localStorage.getItem(HISTORY_STORAGE_KEY),
    );

    expect(savedEntries).toHaveLength(1);
    expect(screen.getByText("전체 3.6m · 간격 5개 · 두께 38mm")).toBeInTheDocument();
  });

  it("loads saved history entries and restores them when selected", async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      serializeHistoryEntries([
        {
          id: "history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3.6",
            gapCountInput: "5",
            thicknessInput: "38",
          },
        },
      ]),
    );

    const user = userEvent.setup();
    render(<FrameCalcApp />);

    const historyButton = await screen.findByRole("button", {
      name: /전체 3\.6m · 간격 5개 · 두께 38mm/,
    });

    await user.click(historyButton);

    expect(screen.getByLabelText("난간 전체 길이")).toHaveValue("3.6");
    expect(screen.getByLabelText("난간살 사이의 개수")).toHaveValue("5");
    expect(screen.getByLabelText("난간 두께")).toHaveValue("38");
  });

  it("ignores legacy v1 history entries stored under the old key", () => {
    window.localStorage.setItem(
      "framecalc-history-v1",
      serializeHistoryEntries([
        {
          id: "legacy-history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3.6",
            gapCountInput: "5",
            thicknessInput: "0.038",
          },
        },
      ]),
    );

    render(<FrameCalcApp />);

    expect(screen.getByText("저장된 계산 기록이 없습니다.")).toBeInTheDocument();
  });
});
