// @vitest-environment jsdom

import { useState, type KeyboardEvent } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { handleRovingTabKey } from "./rovingTabs";
import { useDialogFocus } from "./useDialogFocus";

afterEach(cleanup);

function TestDialog({ onClose }: { readonly onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  return (
    <div ref={dialogRef} role="dialog" aria-label="Test dialog" tabIndex={-1}>
      <button type="button" data-dialog-autofocus>First action</button>
      <button type="button">Last action</button>
    </div>
  );
}

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      {open && <TestDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function TabHarness() {
  const options = ["daily", "weekly"] as const;
  const [active, setActive] = useState<(typeof options)[number]>("daily");
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) =>
    handleRovingTabKey(event, options, active, setActive);
  return (
    <div role="tablist" aria-label="Habit cadence">
      {options.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={active === option}
          tabIndex={active === option ? 0 : -1}
          onKeyDown={keyDown}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

describe("keyboard accessibility", () => {
  it("contains modal focus, closes on Escape, and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    const first = await screen.findByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });
    await waitFor(() => expect(document.activeElement).toBe(first));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("moves and selects tabs with arrow, Home, and End keys", () => {
    render(<TabHarness />);
    const daily = screen.getByRole("tab", { name: "daily" });
    const weekly = screen.getByRole("tab", { name: "weekly" });

    daily.focus();
    fireEvent.keyDown(daily, { key: "ArrowRight" });
    expect(weekly.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(weekly);

    fireEvent.keyDown(weekly, { key: "Home" });
    expect(daily.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(daily);

    fireEvent.keyDown(daily, { key: "End" });
    expect(weekly.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(weekly);
  });
});
