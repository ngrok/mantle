import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { List } from "./list.js";
import { isInteractiveRowTarget } from "./primitive.js";

/**
 * Focus the grid the way a Tab-in would. happy-dom's `focus()` moves
 * `document.activeElement` (so later keystrokes land on the grid) but does not
 * dispatch a focus event React's `onFocus` sees — fire it explicitly.
 */
function focusGrid(grid: HTMLElement) {
	grid.focus();
	fireEvent.focus(grid);
}

/**
 * A plain grid of button rows where any subset can be disabled — the smallest
 * harness that exercises the primitive's keyboard navigation directly.
 */
function Grid({
	count,
	disabled = [],
	onActivate,
}: {
	count: number;
	disabled?: number[];
	onActivate?: (index: number) => void;
}) {
	return (
		<List.Root semantics="grid" aria-label="grid" onActivate={onActivate}>
			{Array.from({ length: count }, (_unused, index) => (
				<List.Row key={`row-${index}`} disabled={disabled.includes(index)}>
					<div role="gridcell">Row {index}</div>
				</List.Row>
			))}
		</List.Root>
	);
}

function activeIndex(): string | null {
	return document.querySelector("[role='row'][data-active]")?.getAttribute("data-index") ?? null;
}

describe("List grid keyboard navigation edges", () => {
	test("Home/End land on the first/last enabled row and arrows skip disabled rows in both directions", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		render(<Grid count={6} disabled={[0, 3, 5]} onActivate={onActivate} />);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		// Focus defaults to the first enabled row, skipping the disabled row 0.
		expect(activeIndex()).toBe("1");

		await user.keyboard("{End}");
		// The last row (5) is disabled — End lands on the last enabled row.
		expect(activeIndex()).toBe("4");

		await user.keyboard("{Home}");
		expect(activeIndex()).toBe("1");

		await user.keyboard("{ArrowDown}");
		expect(activeIndex()).toBe("2");
		await user.keyboard("{ArrowDown}");
		// Skips disabled row 3.
		expect(activeIndex()).toBe("4");
		await user.keyboard("{ArrowDown}");
		// No enabled row below (5 is disabled) — the active row holds.
		expect(activeIndex()).toBe("4");

		await user.keyboard("{ArrowUp}");
		// Skips disabled row 3 on the way back up.
		expect(activeIndex()).toBe("2");

		await user.keyboard("{Enter}");
		expect(onActivate).toHaveBeenCalledExactlyOnceWith(2);
	});

	test("an all-disabled grid never activates anything", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		render(<Grid count={3} disabled={[0, 1, 2]} onActivate={onActivate} />);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		expect(activeIndex()).toBeNull();
		expect(grid).not.toHaveAttribute("aria-activedescendant");

		await user.keyboard("{ArrowDown}{End}{Enter} ");
		expect(activeIndex()).toBeNull();
		expect(onActivate).not.toHaveBeenCalled();
	});

	test("the active index clamps when the collection shrinks, and Enter on a clamped disabled row no-ops", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		const view = render(<Grid count={5} onActivate={onActivate} />);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		await user.keyboard("{End}");
		expect(activeIndex()).toBe("4");

		// Shrink to two rows (e.g. a filter narrowed the collection); the stale
		// active index 4 clamps to the new last row, which happens to be disabled.
		view.rerender(<Grid count={2} disabled={[1]} onActivate={onActivate} />);
		expect(activeIndex()).toBe("1");

		await user.keyboard("{Enter}");
		expect(onActivate).not.toHaveBeenCalled();

		// Navigation recovers to the enabled row.
		await user.keyboard("{ArrowUp}");
		expect(activeIndex()).toBe("0");
		await user.keyboard(" ");
		expect(onActivate).toHaveBeenCalledExactlyOnceWith(0);
	});
});

describe("List grid pointer activation", () => {
	test("a bare row click activates; clicks on nested controls or disabled rows do not", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		render(
			<List.Root semantics="grid" aria-label="grid" onActivate={onActivate}>
				<List.Row>
					<div role="gridcell">Row 0</div>
				</List.Row>
				<List.Row>
					<div role="gridcell">
						<button type="button" tabIndex={-1}>
							nested control
						</button>
					</div>
				</List.Row>
				<List.Row disabled>
					<div role="gridcell">Row 2</div>
				</List.Row>
			</List.Root>,
		);

		await user.click(screen.getByText("Row 0"));
		expect(onActivate).toHaveBeenCalledExactlyOnceWith(0);

		// The nested control handles its own click — activation must not fire twice.
		await user.click(screen.getByRole("button", { name: "nested control" }));
		expect(onActivate).toHaveBeenCalledTimes(1);

		await user.click(screen.getByText("Row 2"));
		expect(onActivate).toHaveBeenCalledTimes(1);
	});

	test("a consumer onClick on the row can preventDefault to opt out of activation", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		render(
			<List.Root semantics="grid" aria-label="grid" onActivate={onActivate}>
				<List.Row onClick={(event) => event.preventDefault()}>
					<div role="gridcell">Row 0</div>
				</List.Row>
			</List.Root>,
		);

		await user.click(screen.getByText("Row 0"));
		expect(onActivate).not.toHaveBeenCalled();
	});
});

describe("List isRowDisabled", () => {
	test("drives disabled state from data instead of row-element props", async () => {
		const user = userEvent.setup();
		const onActivate = vi.fn<(index: number) => void>();
		render(
			<List.Root
				semantics="grid"
				aria-label="grid"
				onActivate={onActivate}
				isRowDisabled={(index) => index === 0}
			>
				<List.Row>
					<div role="gridcell">Row 0</div>
				</List.Row>
				<List.Row>
					<div role="gridcell">Row 1</div>
				</List.Row>
			</List.Root>,
		);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		// No row element carries `disabled`; the callback alone makes navigation
		// skip row 0 and default to row 1.
		expect(activeIndex()).toBe("1");

		await user.click(screen.getByText("Row 0"));
		expect(onActivate).not.toHaveBeenCalled();
	});
});

describe("isInteractiveRowTarget", () => {
	test("returns true for a control or label inside the row (activation must not fire twice)", () => {
		const row = document.createElement("div");
		const button = document.createElement("button");
		row.append(button);
		expect(isInteractiveRowTarget(button, row)).toBe(true);

		const label = document.createElement("label");
		row.append(label);
		expect(isInteractiveRowTarget(label, row)).toBe(true);
	});

	test("returns false for non-interactive row content (the row activates)", () => {
		const row = document.createElement("div");
		const description = document.createElement("p");
		row.append(description);
		expect(isInteractiveRowTarget(description, row)).toBe(false);
	});

	test("returns false for a non-element target", () => {
		const row = document.createElement("div");
		expect(isInteractiveRowTarget(null, row)).toBe(false);
	});

	test("ignores interactive ancestors outside the row", () => {
		// The row is nested inside a button; a click on the row's own text must not
		// be treated as interactive just because an ancestor is.
		const outerButton = document.createElement("button");
		const row = document.createElement("div");
		const text = document.createElement("p");
		outerButton.append(row);
		row.append(text);
		expect(isInteractiveRowTarget(text, row)).toBe(false);
	});
});

describe("List grid row ids", () => {
	test("the default rowId is stamped on the row and referenced by aria-activedescendant", () => {
		render(<Grid count={2} />);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		const firstRow = document.querySelector("[role='row'][data-index='0']");
		if (!(firstRow instanceof HTMLElement)) {
			throw new Error("first row not found");
		}
		expect(firstRow.id).not.toBe("");
		expect(grid).toHaveAttribute("aria-activedescendant", firstRow.id);
	});

	test("a custom rowId leaves the row's own id alone instead of duplicating the referenced id", () => {
		// Regression: the row used to stamp rowId(index) as its own DOM id even when
		// the consumer's rowId pointed at an element *inside* the row — producing
		// duplicate ids — and silently discarded a consumer-provided row id.
		render(
			<List.Root semantics="grid" aria-label="grid" rowId={(index) => `ctrl-${index}`}>
				<List.Row id="consumer-row">
					<div role="gridcell">
						<button type="button" tabIndex={-1} id="ctrl-0">
							Row 0
						</button>
					</div>
				</List.Row>
			</List.Root>,
		);

		const grid = screen.getByRole("grid", { name: "grid" });
		focusGrid(grid);
		expect(screen.getByRole("row")).toHaveAttribute("id", "consumer-row");
		expect(grid).toHaveAttribute("aria-activedescendant", "ctrl-0");
		expect(document.querySelectorAll("#ctrl-0")).toHaveLength(1);
	});
});

describe("List semantics and attributes", () => {
	test("grid rows expose disabled state to assistive tech; list rows stay data-only", () => {
		const gridRender = render(<Grid count={2} disabled={[1]} />);
		const disabledGridRow = document.querySelector("[role='row'][data-index='1']");
		expect(disabledGridRow).toHaveAttribute("aria-disabled", "true");
		expect(disabledGridRow).toHaveAttribute("data-disabled");
		gridRender.unmount();

		render(
			<List.Root semantics="list" aria-label="list">
				<List.Row disabled>
					<button type="button">Row 0</button>
				</List.Row>
			</List.Root>,
		);
		const listRow = screen.getByRole("listitem");
		expect(listRow).not.toHaveAttribute("aria-disabled");
		expect(listRow).toHaveAttribute("data-disabled");
	});

	test("a list-semantics collection is not a tab stop and tracks no active descendant", () => {
		render(
			<List.Root semantics="list" aria-label="list">
				<List.Row>
					<button type="button">Row 0</button>
				</List.Row>
			</List.Root>,
		);

		const collection = screen.getByRole("list");
		expect(collection).not.toHaveAttribute("tabindex");
		expect(collection).not.toHaveAttribute("aria-activedescendant");
		expect(collection).toHaveAttribute("data-slot", "list-collection");
	});

	test("List.Row outside a Root throws a helpful error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() =>
				render(
					<List.Row>
						<button type="button">stray</button>
					</List.Row>,
				),
			).toThrow(/must be rendered inside List.Root or List.VirtualRoot/);
		} finally {
			errorSpy.mockRestore();
		}
	});
});
