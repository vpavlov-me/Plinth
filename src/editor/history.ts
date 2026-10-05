/**
 * Minimal immutable undo/redo history.
 *
 * Continuous interactions (slider drags, number scrubbing) apply "transient"
 * updates: the present value changes but no entry is recorded until
 * {@link commitTransient} runs, so a whole drag becomes a single undo step.
 */
export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** State before the current run of transient updates, if any. */
  pendingBase: T | null;
};

export const HISTORY_LIMIT = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], pendingBase: null };
}

export function pushState<T>(history: History<T>, next: T, options: { transient?: boolean } = {}): History<T> {
  if (Object.is(next, history.present)) return history;
  if (options.transient) {
    return { ...history, present: next, pendingBase: history.pendingBase ?? history.present };
  }
  const base = history.pendingBase ?? history.present;
  return {
    past: [...history.past, base].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    pendingBase: null,
  };
}

export function commitTransient<T>(history: History<T>): History<T> {
  const base = history.pendingBase;
  if (base === null) return history;
  if (Object.is(base, history.present)) return { ...history, pendingBase: null };
  return {
    past: [...history.past, base].slice(-HISTORY_LIMIT),
    present: history.present,
    future: [],
    pendingBase: null,
  };
}

export function undo<T>(history: History<T>): History<T> {
  const settled = commitTransient(history);
  const previous = settled.past.at(-1);
  if (previous === undefined) return settled;
  return {
    past: settled.past.slice(0, -1),
    present: previous,
    future: [settled.present, ...settled.future],
    pendingBase: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  const settled = commitTransient(history);
  const [next, ...rest] = settled.future;
  if (next === undefined) return settled;
  return {
    past: [...settled.past, settled.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
    pendingBase: null,
  };
}

/** Every value still reachable through the history. */
export function historyValues<T>(history: History<T>): T[] {
  const values = [...history.past, history.present, ...history.future];
  if (history.pendingBase !== null) values.push(history.pendingBase);
  return values;
}
