"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
} from "react";

import {
  MAX_HISTORY_ENTRIES,
  createCalculationHistorySnapshot,
  createHistoryEntry,
  deleteHistoryEntry,
  getClientHistoryEntriesSnapshot,
  getServerHistoryEntriesSnapshot,
  getSnapshotSignature,
  notifyHistoryEntriesChanged,
  persistHistoryEntries,
  subscribeToHistoryEntries,
  withSavedEntry,
  type CalculationHistoryEntry,
} from "@/lib/history";
import {
  formatInputSummary,
  formatMeters,
} from "@/lib/format";
import { buildCalculatorUiState } from "@/lib/ui-state";

const AUTO_SAVE_DELAY_MILLIS = 500;
const HISTORY_SWIPE_REVEAL_PX = 88;
const HISTORY_SWIPE_OPEN_THRESHOLD_PX = 52;
const HISTORY_SWIPE_SLOP_PX = 8;

export function FrameCalcApp() {
  const [totalLengthInput, setTotalLengthInput] = useState("");
  const [gapCountInput, setGapCountInput] = useState("");
  const [thicknessInput, setThicknessInput] = useState("");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(null);
  const historyEntries = useSyncExternalStore(
    subscribeToHistoryEntries,
    getClientHistoryEntriesSnapshot,
    getServerHistoryEntriesSnapshot,
  );

  const uiState = buildCalculatorUiState({
    totalLengthInput,
    gapCountInput,
    thicknessInput,
  });

  const currentSnapshot = createCalculationHistorySnapshot({
    totalLengthInput,
    gapCountInput,
    thicknessInput,
  });

  const readySignature =
    uiState.kind === "ready" && currentSnapshot !== null
      ? getSnapshotSignature(currentSnapshot)
      : null;

  useEffect(() => {
    if (!autoSaveEnabled || currentSnapshot === null || readySignature === null) {
      return;
    }

    if (readySignature === lastSavedSignature) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextEntries = withSavedEntry(
        historyEntries,
        createHistoryEntry(currentSnapshot),
      );
      persistHistoryEntries(nextEntries, window.localStorage);
      notifyHistoryEntriesChanged();
      setLastSavedSignature(readySignature);
    }, AUTO_SAVE_DELAY_MILLIS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    autoSaveEnabled,
    currentSnapshot,
    historyEntries,
    lastSavedSignature,
    readySignature,
  ]);

  function enableAutoSaveAndUpdate(
    updater: (value: string) => void,
    value: string,
  ): void {
    setAutoSaveEnabled(true);
    const nextSnapshot = createCalculationHistorySnapshot({
      totalLengthInput:
        updater === setTotalLengthInput ? value : totalLengthInput,
      gapCountInput: updater === setGapCountInput ? value : gapCountInput,
      thicknessInput: updater === setThicknessInput ? value : thicknessInput,
    });
    if (nextSnapshot === null) {
      setLastSavedSignature(null);
    }
    updater(value);
  }

  function handleSelectHistory(entry: CalculationHistoryEntry): void {
    setAutoSaveEnabled(false);
    setLastSavedSignature(getSnapshotSignature(entry.snapshot));
    setTotalLengthInput(entry.snapshot.totalLengthInput);
    setGapCountInput(entry.snapshot.gapCountInput);
    setThicknessInput(entry.snapshot.thicknessInput);
  }

  function handleDeleteHistory(entry: CalculationHistoryEntry): void {
    const entrySignature = getSnapshotSignature(entry.snapshot);
    const hasSameSignature = historyEntries.some((candidate) => {
      return (
        candidate.id !== entry.id &&
        getSnapshotSignature(candidate.snapshot) === entrySignature
      );
    });
    const nextEntries = deleteHistoryEntry(historyEntries, entry.id);

    if (lastSavedSignature === entrySignature && !hasSameSignature) {
      setLastSavedSignature(null);
    }

    persistHistoryEntries(nextEntries, window.localStorage);
    notifyHistoryEntriesChanged();
  }

  return (
    <main className="relative isolate min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-16 pt-6 sm:px-6">
        <header className="rise-in mb-5 rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,252,247,0.92),rgba(246,225,200,0.88))] px-5 py-6 shadow-[0_20px_60px_rgba(117,72,39,0.14)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(125,53,21,0.14)] bg-[rgba(255,255,255,0.56)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
            Mobile Field Calculator
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr] sm:items-end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--muted)]">
                현장에서 바로 확인하는 난간 배치 계산
              </p>
              <h1 className="text-[clamp(2rem,8vw,3.4rem)] font-bold leading-none tracking-[-0.04em]">
                난간 계산기
              </h1>
            </div>
          </div>
        </header>

        <section className="panel rise-in rounded-[2rem] p-5 [animation-delay:90ms]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">입력값</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              전체 길이는 <span className="font-medium">m</span>, 난간 두께는{" "}
              <span className="font-medium">mm</span>로 입력합니다. 소수점은{" "}
              <span className="font-medium">.</span> 또는{" "}
              <span className="font-medium">,</span> 모두 입력할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-4">
            <MetricField
              id="total-length"
              label="난간 전체 길이"
              placeholder="예: 3.6"
              unit="m"
              inputMode="decimal"
              value={totalLengthInput}
              onChange={(value) => {
                enableAutoSaveAndUpdate(setTotalLengthInput, value);
              }}
            />
            <MetricField
              id="gap-count"
              label="난간살 사이의 개수"
              placeholder="예: 5"
              unit="개"
              inputMode="numeric"
              value={gapCountInput}
              onChange={(value) => {
                enableAutoSaveAndUpdate(setGapCountInput, value);
              }}
            />
            <MetricField
              id="thickness"
              label="난간 두께"
              placeholder="예: 38"
              unit="mm"
              inputMode="decimal"
              value={thicknessInput}
              onChange={(value) => {
                enableAutoSaveAndUpdate(setThicknessInput, value);
              }}
            />
          </div>
        </section>

        <StateCard uiState={uiState} />

        {uiState.kind === "ready" ? (
          <>
            <SummarySection railCount={uiState.layout.railCount} gapSize={uiState.layout.gapSize} />
            <ResultsSection positions={uiState.layout.positions} />
          </>
        ) : null}

        <HistorySection
          historyEntries={historyEntries}
          onSelect={handleSelectHistory}
          onDelete={handleDeleteHistory}
        />
      </div>
    </main>
  );
}

function MetricField(props: {
  id: string;
  label: string;
  placeholder: string;
  unit: string;
  inputMode: HTMLAttributes<HTMLInputElement>["inputMode"];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2" htmlFor={props.id}>
      <span className="text-sm font-semibold tracking-[-0.02em]">{props.label}</span>
      <div className="relative">
        <input
          id={props.id}
          aria-label={props.label}
          type="text"
          inputMode={props.inputMode}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(event) => {
            props.onChange(event.target.value);
          }}
          className="h-14 w-full rounded-[1.25rem] border border-[rgba(112,72,42,0.12)] bg-[rgba(255,255,255,0.76)] px-4 pr-14 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none transition focus:border-[rgba(189,90,42,0.55)] focus:ring-4 focus:ring-[rgba(189,90,42,0.12)]"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-sm font-semibold text-[var(--muted)]">
          {props.unit}
        </span>
      </div>
    </label>
  );
}

function StateCard(props: {
  uiState: ReturnType<typeof buildCalculatorUiState>;
}) {
  if (props.uiState.kind === "ready") {
    return null;
  }

  return (
    <section
      className={`rise-in mt-5 rounded-[1.8rem] border px-5 py-4 [animation-delay:160ms] ${
        props.uiState.isError
          ? "border-[rgba(167,43,16,0.14)] bg-[rgba(255,236,230,0.85)] text-[#7b2f18]"
          : "border-[rgba(110,79,46,0.1)] bg-[rgba(246,236,223,0.88)] text-[var(--text)]"
      }`}
    >
      <div className="text-base font-semibold">{props.uiState.title}</div>
      <p className="mt-1 text-sm leading-6 text-current/80">{props.uiState.message}</p>
    </section>
  );
}

function SummarySection(props: { railCount: number; gapSize: number }) {
  return (
    <section className="rise-in mt-5 grid gap-3 [animation-delay:230ms] sm:grid-cols-2">
      <SummaryCard label="난간 개수" value={props.railCount.toString()} unit="개" />
      <SummaryCard label="동일 간격" value={formatMeters(props.gapSize)} unit="m" accent />
    </section>
  );
}

function SummaryCard(props: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`panel rounded-[1.8rem] p-5 ${
        props.accent ? "bg-[rgba(255,244,233,0.94)]" : ""
      }`}
    >
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {props.label}
      </div>
      <div className="font-display mt-4 text-[2rem] font-bold leading-none tracking-[-0.05em] text-[var(--accent-deep)]">
        {props.value}
      </div>
      <div className="mt-2 text-sm text-[var(--muted)]">{props.unit}</div>
    </article>
  );
}

function ResultsSection(props: {
  positions: Array<{
    index: number;
    start: number;
    end: number;
  }>;
}) {
  return (
    <section className="panel rise-in mt-5 rounded-[2rem] p-5 [animation-delay:300ms]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">난간 시작 위치 테이블</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            모바일에서는 카드형으로, 넓은 화면에서는 표 형태로 확인할 수 있습니다.
          </p>
        </div>
        <div className="rounded-full bg-[rgba(189,90,42,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {props.positions.length} Rails
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {props.positions.map((position) => {
          return (
            <article
              key={position.index}
              className="rounded-[1.4rem] border border-[rgba(112,72,42,0.1)] bg-[rgba(255,255,255,0.65)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{position.index}번</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Rail
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-[rgba(239,225,206,0.72)] px-3 py-3">
                  <dt className="text-[var(--muted)]">시작 위치</dt>
                  <dd className="font-display mt-1 text-base font-bold text-[var(--accent-deep)]">
                    {formatMeters(position.start)}m
                  </dd>
                </div>
                <div className="rounded-2xl bg-[rgba(239,225,206,0.72)] px-3 py-3">
                  <dt className="text-[var(--muted)]">끝 위치</dt>
                  <dd className="font-display mt-1 text-base font-bold text-[var(--accent-deep)]">
                    {formatMeters(position.end)}m
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[1.6rem] border border-[rgba(112,72,42,0.1)] md:block">
        <div className="grid grid-cols-[0.9fr_1.2fr_1.2fr] bg-[rgba(239,225,206,0.9)] px-4 py-3 text-sm font-semibold text-[var(--muted)]">
          <div>번호</div>
          <div className="text-right">시작 위치 (m)</div>
          <div className="text-right">끝 위치 (m)</div>
        </div>
        {props.positions.map((position) => {
          return (
            <div
              key={position.index}
              className="grid grid-cols-[0.9fr_1.2fr_1.2fr] border-t border-[rgba(112,72,42,0.08)] bg-[rgba(255,255,255,0.56)] px-4 py-3 text-sm"
            >
              <div className="font-medium">{position.index}번</div>
              <div className="text-right font-medium">{formatMeters(position.start)}</div>
              <div className="text-right font-medium">{formatMeters(position.end)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HistorySection(props: {
  historyEntries: CalculationHistoryEntry[];
  onSelect: (entry: CalculationHistoryEntry) => void;
  onDelete: (entry: CalculationHistoryEntry) => void;
}) {
  const visibleEntries = props.historyEntries.slice(0, MAX_HISTORY_ENTRIES);

  return (
    <section className="panel rise-in mt-5 rounded-[2rem] p-5 [animation-delay:370ms]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">최근 실행 기록</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          항목을 누르면 다시 불러옵니다. 모바일에서는 밀어서, 데스크톱에서는
          우측 × 버튼으로 삭제할 수 있습니다.
        </p>
      </div>

      {visibleEntries.length === 0 ? (
        <p className="rounded-[1.4rem] bg-[rgba(255,255,255,0.52)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          저장된 계산 기록이 없습니다.
        </p>
      ) : (
        <div className="grid gap-2">
          {visibleEntries.map((entry) => {
            return (
              <HistoryListItem
                key={entry.id}
                entry={entry}
                onDelete={props.onDelete}
                onSelect={props.onSelect}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function HistoryListItem(props: {
  entry: CalculationHistoryEntry;
  onSelect: (entry: CalculationHistoryEntry) => void;
  onDelete: (entry: CalculationHistoryEntry) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const swipeOffsetRef = useRef(0);

  function setSwipePosition(nextOffset: number): void {
    swipeOffsetRef.current = nextOffset;
    setSwipeOffset(nextOffset);
  }

  function snapSwipe(open: boolean): void {
    setIsSwipeOpen(open);
    setSwipePosition(open ? -HISTORY_SWIPE_REVEAL_PX : 0);
  }

  function finishSwipe(
    event: PointerEvent<HTMLButtonElement>,
    forceClosed: boolean = false,
  ): void {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId) &&
      typeof event.currentTarget.releasePointerCapture === "function"
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerIdRef.current = null;
    setIsDragging(false);

    if (forceClosed) {
      snapSwipe(false);
      return;
    }

    snapSwipe(swipeOffsetRef.current <= -HISTORY_SWIPE_OPEN_THRESHOLD_PX);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    if (event.pointerType === "mouse") {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startOffsetRef.current = isSwipeOpen ? -HISTORY_SWIPE_REVEAL_PX : 0;
    hasDraggedRef.current = false;
    setIsDragging(true);
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>): void {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const nextOffset = clampValue(
      startOffsetRef.current + event.clientX - startXRef.current,
      -HISTORY_SWIPE_REVEAL_PX,
      0,
    );

    if (Math.abs(nextOffset - startOffsetRef.current) >= HISTORY_SWIPE_SLOP_PX) {
      hasDraggedRef.current = true;
      suppressClickRef.current = true;
    }

    if (!hasDraggedRef.current) {
      return;
    }

    setSwipePosition(nextOffset);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>): void {
    finishSwipe(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>): void {
    finishSwipe(event, true);
  }

  function handleSelect(event: MouseEvent<HTMLButtonElement>): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }

    if (isSwipeOpen) {
      snapSwipe(false);
      return;
    }

    props.onSelect(props.entry);
  }

  return (
    <article className="relative overflow-hidden rounded-[1.3rem] border border-[rgba(112,72,42,0.08)] bg-[rgba(255,255,255,0.68)] shadow-[0_10px_24px_rgba(117,72,39,0.06)]">
      <div className="absolute inset-y-0 right-0 flex items-stretch md:hidden">
        <button
          type="button"
          aria-label={`${formatInputSummary(props.entry.snapshot)} 밀어서 삭제`}
          onClick={() => {
            props.onDelete(props.entry);
          }}
          className="flex w-[5.5rem] items-center justify-center bg-[#a74120] px-4 text-sm font-semibold text-white"
        >
          삭제
        </button>
      </div>

      <button
        type="button"
        aria-label={formatInputSummary(props.entry.snapshot)}
        onClick={handleSelect}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative flex w-full items-center gap-3 px-4 py-3 text-left [touch-action:pan-y] md:pr-14 ${
          isDragging ? "" : "transition-transform duration-200 ease-out"
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.02em]">
          {formatInputSummary(props.entry.snapshot)}
        </span>
      </button>

      <div className="absolute inset-y-0 right-2 hidden items-center md:flex">
        <button
          type="button"
          aria-label={`${formatInputSummary(props.entry.snapshot)} 삭제 버튼`}
          onClick={() => {
            if (isSwipeOpen) {
              snapSwipe(false);
            }
            props.onDelete(props.entry);
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(167,43,16,0.12)] bg-[rgba(255,244,240,0.92)] text-lg leading-none text-[#8f3d1f] transition hover:bg-[rgba(255,232,225,1)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </article>
  );
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
