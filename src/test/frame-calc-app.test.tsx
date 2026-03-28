import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FrameCalcApp } from "@/components/frame-calc-app";
import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
  parseHistoryEntries,
  serializeHistoryEntries,
} from "@/lib/history";

describe("FrameCalcApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("saves a valid calculation when an input loses focus", () => {
    render(<FrameCalcApp />);

    fireEvent.change(screen.getByLabelText("난간 전체 길이"), {
      target: { value: "3600" },
    });
    fireEvent.change(screen.getByLabelText("난간살 사이의 개수"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("난간 두께"), {
      target: { value: "38" },
    });

    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();

    fireEvent.blur(screen.getByLabelText("난간 두께"));

    const savedEntries = parseHistoryEntries(
      window.localStorage.getItem(HISTORY_STORAGE_KEY),
    );
    const historySection = getHistorySection();

    expect(savedEntries).toHaveLength(1);
    expect(
      within(historySection).getByRole("button", {
        name: "전체 3600mm · 간격 5개 · 두께 38mm",
      }),
    ).toBeInTheDocument();
    expect(within(historySection).getAllByText("전체(mm)")).toHaveLength(1);
    expect(within(historySection).getAllByText("간격(개)")).toHaveLength(1);
    expect(within(historySection).getAllByText("두께(mm)")).toHaveLength(1);
    expect(within(historySection).getByText("3600")).toBeInTheDocument();
    expect(within(historySection).getByText("5")).toBeInTheDocument();
    expect(within(historySection).getByText("38")).toBeInTheDocument();
    expect(
      within(historySection).queryByText("전체 3600mm · 간격 5개 · 두께 38mm"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/저장 시각/)).not.toBeInTheDocument();
  });

  it("saves on Enter and does not duplicate the same snapshot on the following blur", () => {
    render(<FrameCalcApp />);

    fireEvent.change(screen.getByLabelText("난간 전체 길이"), {
      target: { value: "3600" },
    });
    fireEvent.change(screen.getByLabelText("난간살 사이의 개수"), {
      target: { value: "5" },
    });

    const thicknessInput = screen.getByLabelText("난간 두께");
    fireEvent.change(thicknessInput, {
      target: { value: "38" },
    });
    fireEvent.keyDown(thicknessInput, {
      key: "Enter",
      code: "Enter",
    });
    fireEvent.blur(thicknessInput);

    const savedEntries = parseHistoryEntries(
      window.localStorage.getItem(HISTORY_STORAGE_KEY),
    );

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0]?.snapshot).toEqual({
      totalLengthInput: "3600",
      gapCountInput: "5",
      thicknessInput: "38",
    });
  });

  it("loads saved history entries and restores them when selected", async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      serializeHistoryEntries([
        {
          id: "history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3600",
            gapCountInput: "5",
            thicknessInput: "38",
          },
        },
      ]),
    );

    const user = userEvent.setup();
    render(<FrameCalcApp />);

    const historyButton = await screen.findByRole("button", {
      name: "전체 3600mm · 간격 5개 · 두께 38mm",
    });

    await user.click(historyButton);

    expect(screen.getByLabelText("난간 전체 길이")).toHaveValue("3600");
    expect(screen.getByLabelText("난간살 사이의 개수")).toHaveValue("5");
    expect(screen.getByLabelText("난간 두께")).toHaveValue("38");
  });

  it("does not create a new history entry when an existing one is only restored", async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      serializeHistoryEntries([
        {
          id: "history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3600",
            gapCountInput: "5",
            thicknessInput: "38",
          },
        },
      ]),
    );

    const user = userEvent.setup();
    render(<FrameCalcApp />);

    await user.click(
      await screen.findByRole("button", {
        name: "전체 3600mm · 간격 5개 · 두께 38mm",
      }),
    );

    fireEvent.blur(screen.getByLabelText("난간 두께"));

    const savedEntries = parseHistoryEntries(
      window.localStorage.getItem(HISTORY_STORAGE_KEY),
    );

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0]?.id).toBe("history-1");
  });

  it("does not save when the inputs are incomplete on blur", () => {
    render(<FrameCalcApp />);

    fireEvent.change(screen.getByLabelText("난간 전체 길이"), {
      target: { value: "3600" },
    });
    fireEvent.blur(screen.getByLabelText("난간 전체 길이"));

    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it("migrates legacy v2 history entries stored in meters into millimeters", async () => {
    window.localStorage.setItem(
      "framecalc-history-v2",
      serializeHistoryEntries([
        {
          id: "legacy-history-1",
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
      name: "전체 3600mm · 간격 5개 · 두께 38mm",
    });

    await user.click(historyButton);

    expect(screen.getByLabelText("난간 전체 길이")).toHaveValue("3600");
    expect(screen.getByLabelText("난간 두께")).toHaveValue("38");
  });

  it("ignores legacy v1 history entries stored under the older key", () => {
    window.localStorage.setItem(
      "framecalc-history-v1",
      serializeHistoryEntries([
        {
          id: "legacy-history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3.6",
            gapCountInput: "5",
            thicknessInput: "38",
          },
        },
      ]),
    );

    render(<FrameCalcApp />);

    expect(screen.getByText("저장된 계산 기록이 없습니다.")).toBeInTheDocument();
  });

  it("shows only the 10 most recent history entries in the list", () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      serializeHistoryEntries(
        Array.from({ length: MAX_HISTORY_ENTRIES + 2 }, (_, index) => {
          return {
            id: `history-${index}`,
            savedAtMillis: Date.UTC(2026, 2, 28, 10, index),
            snapshot: {
              totalLengthInput: ((10 + index) * 100).toString(),
              gapCountInput: "5",
              thicknessInput: "38",
            },
          };
        }),
      ),
    );

    render(<FrameCalcApp />);

    const historyButtons = screen.getAllByRole("button", {
      name: /^전체 \d+mm · 간격 5개 · 두께 38mm$/,
    });

    expect(historyButtons).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(
      screen.queryByRole("button", {
        name: "전체 2000mm · 간격 5개 · 두께 38mm",
      }),
    ).not.toBeInTheDocument();
  });

  it("deletes a history entry from the visible x button", async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      serializeHistoryEntries([
        {
          id: "history-1",
          savedAtMillis: Date.UTC(2026, 2, 28, 10, 30),
          snapshot: {
            totalLengthInput: "3600",
            gapCountInput: "5",
            thicknessInput: "38",
          },
        },
      ]),
    );

    const user = userEvent.setup();
    render(<FrameCalcApp />);

    await user.click(
      screen.getByRole("button", {
        name: "전체 3600mm · 간격 5개 · 두께 38mm 삭제 버튼",
      }),
    );

    expect(screen.getByText("저장된 계산 기록이 없습니다.")).toBeInTheDocument();
    expect(parseHistoryEntries(window.localStorage.getItem(HISTORY_STORAGE_KEY))).toEqual([]);
  });

  it("prevents decimal paste in millimeter inputs", () => {
    render(<FrameCalcApp />);

    const input = screen.getByLabelText("난간 전체 길이");

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "12.5",
      },
    });

    expect(input).toHaveValue("");
  });

  it("rounds rail table positions to whole millimeters while keeping gap summary decimals", () => {
    render(<FrameCalcApp />);

    fireEvent.change(screen.getByLabelText("난간 전체 길이"), {
      target: { value: "3600" },
    });
    fireEvent.change(screen.getByLabelText("난간살 사이의 개수"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("난간 두께"), {
      target: { value: "38" },
    });

    expect(screen.getByText("674.4")).toBeInTheDocument();
    expect(screen.getAllByText("1,425mm")).toHaveLength(1);
    expect(screen.getAllByText("1,463mm")).toHaveLength(1);
    expect(screen.getAllByText("1,425")).toHaveLength(1);
    expect(screen.getAllByText("1,463")).toHaveLength(1);
    expect(screen.queryByText("1,424.8mm")).not.toBeInTheDocument();
    expect(screen.queryByText("1,462.8mm")).not.toBeInTheDocument();
    expect(screen.queryByText("1,424.8")).not.toBeInTheDocument();
    expect(screen.queryByText("1,462.8")).not.toBeInTheDocument();
  });
});

function getHistorySection(): HTMLElement {
  const historyHeading = screen.getByRole("heading", { name: "최근 실행 기록" });
  const historySection = historyHeading.closest("section");

  if (historySection === null) {
    throw new Error("최근 실행 기록 섹션을 찾지 못했습니다.");
  }

  return historySection;
}
