import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useRef } from "react";
import { describe, expect, test } from "vitest";
import { useFocusTrap } from "./use-focus-trap.js";

/**
 * A trapped region between two outside buttons, so a Tab that leaves the region
 * has somewhere to land when the trap lets it.
 */
function Trapped({ active = true, children }: { active?: boolean; children?: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	useFocusTrap(ref, { active });
	return (
		<>
			<button type="button">before</button>
			<div ref={ref} tabIndex={-1} data-testid="region">
				{children}
			</div>
			<button type="button">after</button>
		</>
	);
}

const inside = () => (
	<>
		<button type="button">first</button>
		<button type="button">middle</button>
		<button type="button">last</button>
	</>
);

describe("useFocusTrap", () => {
	test("moves focus to the first tabbable inside the region when it activates with focus outside", () => {
		render(<Trapped>{inside()}</Trapped>);
		expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
	});

	test("focuses the region itself when nothing inside it is tabbable", () => {
		render(<Trapped>plain text</Trapped>);
		expect(screen.getByTestId("region")).toHaveFocus();
	});

	test("leaves focus where it is when it activates with focus already inside", () => {
		const { rerender } = render(<Trapped active={false}>{inside()}</Trapped>);
		screen.getByRole("button", { name: "middle" }).focus();
		rerender(<Trapped active>{inside()}</Trapped>);
		expect(screen.getByRole("button", { name: "middle" })).toHaveFocus();
	});

	test("Tab on the last tabbable wraps to the first", async () => {
		const user = userEvent.setup();
		render(<Trapped>{inside()}</Trapped>);
		screen.getByRole("button", { name: "last" }).focus();
		await user.tab();
		expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
	});

	test("Shift+Tab on the first tabbable wraps to the last", async () => {
		const user = userEvent.setup();
		render(<Trapped>{inside()}</Trapped>);
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
	});

	test("Tab between two tabbables keeps the browser's own move", async () => {
		const user = userEvent.setup();
		render(<Trapped>{inside()}</Trapped>);
		await user.tab();
		expect(screen.getByRole("button", { name: "middle" })).toHaveFocus();
	});

	test("Tab from the region itself lands on the first tabbable and Shift+Tab on the last", async () => {
		const user = userEvent.setup();
		render(<Trapped>{inside()}</Trapped>);
		screen.getByTestId("region").focus();
		await user.tab();
		expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
		screen.getByTestId("region").focus();
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
	});

	test("Tab with nothing tabbable inside keeps focus on the region", async () => {
		const user = userEvent.setup();
		render(<Trapped>plain text</Trapped>);
		await user.tab();
		expect(screen.getByTestId("region")).toHaveFocus();
	});

	test("an inactive trap lets Tab leave the region and moves no focus on mount", async () => {
		const user = userEvent.setup();
		render(<Trapped active={false}>{inside()}</Trapped>);
		expect(document.body).toHaveFocus();
		screen.getByRole("button", { name: "last" }).focus();
		await user.tab();
		expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
	});

	test("a child that prevents the default on Tab keeps it", async () => {
		const user = userEvent.setup();
		render(
			<Trapped>
				<button type="button">first</button>
				<textarea
					aria-label="editor"
					onKeyDown={(event) => {
						if (event.key === "Tab") {
							event.preventDefault();
						}
					}}
				/>
			</Trapped>,
		);
		const editor = screen.getByRole("textbox", { name: "editor" });
		editor.focus();
		await user.tab();
		expect(editor).toHaveFocus();
	});

	test("gives a region with no tabindex one for the trap's lifetime, so it can hold focus", () => {
		function Plain({ active }: { active: boolean }) {
			const ref = useRef<HTMLDivElement>(null);
			useFocusTrap(ref, { active });
			return (
				<div ref={ref} data-testid="plain">
					plain text
				</div>
			);
		}
		const { rerender } = render(<Plain active />);
		expect(screen.getByTestId("plain")).toHaveAttribute("tabindex", "-1");
		expect(screen.getByTestId("plain")).toHaveFocus();
		rerender(<Plain active={false} />);
		expect(screen.getByTestId("plain")).not.toHaveAttribute("tabindex");
	});

	test("releasing the trap lets the next Tab leave the region", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Trapped>{inside()}</Trapped>);
		screen.getByRole("button", { name: "last" }).focus();
		rerender(<Trapped active={false}>{inside()}</Trapped>);
		await user.tab();
		expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
	});
});
