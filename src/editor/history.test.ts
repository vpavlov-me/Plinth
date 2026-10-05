import { describe, expect, it } from "vitest";
import { commitTransient, createHistory, HISTORY_LIMIT, pushState, redo, undo } from "@/editor/history";

describe("history", () => {
  it("records, undoes and redoes", () => {
    let h = createHistory(1);
    h = pushState(h, 2);
    h = pushState(h, 3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(3);
  });

  it("folds transient updates into a single entry", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 50; i++) h = pushState(h, i, { transient: true });
    h = commitTransient(h);
    expect(h.past).toEqual([0]);
    expect(undo(h).present).toBe(0);
  });

  it("drops the redo stack on new changes and caps the size", () => {
    let h = createHistory(0);
    h = pushState(h, 1);
    h = undo(h);
    h = pushState(h, 2);
    expect(h.future).toEqual([]);
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) h = pushState(h, i + 10);
    expect(h.past.length).toBe(HISTORY_LIMIT);
  });

  it("undo during a transient run returns to the state before it", () => {
    let h = createHistory("a");
    h = pushState(h, "b", { transient: true });
    h = undo(h);
    expect(h.present).toBe("a");
  });
});
