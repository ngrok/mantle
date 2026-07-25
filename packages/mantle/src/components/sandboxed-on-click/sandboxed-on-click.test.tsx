import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { SandboxedOnClick, sandboxedOnClickProps } from "./sandboxed-on-click.js";

describe("SandboxedOnClick", () => {
	test("stops a click inside it from reaching an ancestor onClick handler", async () => {
		const user = userEvent.setup();
		const rowOnClick = vi.fn<() => void>();
		const buttonOnClick = vi.fn<() => void>();

		render(
			<div onClick={rowOnClick} role="presentation">
				<SandboxedOnClick>
					<button type="button" onClick={buttonOnClick}>
						Delete
					</button>
				</SandboxedOnClick>
			</div>,
		);

		await user.click(screen.getByRole("button", { name: "Delete" }));

		// The inner element still gets its own click; only the trip upward is severed.
		expect(buttonOnClick).toHaveBeenCalledTimes(1);
		expect(rowOnClick).not.toHaveBeenCalled();
	});

	test("cancels the click's default action by default", async () => {
		const user = userEvent.setup();

		render(
			<SandboxedOnClick>
				<input type="checkbox" aria-label="Select invoice" />
			</SandboxedOnClick>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);

		// preventDefault() on a click reverts a checkbox's activation behavior, so the
		// unchecked box is direct evidence the default action was cancelled.
		expect(checkbox).not.toBeChecked();
	});

	test("leaves the default action intact when `allowClickEventDefault` is set, while still stopping propagation", async () => {
		const user = userEvent.setup();
		const rowOnClick = vi.fn<() => void>();

		render(
			<div onClick={rowOnClick} role="presentation">
				<SandboxedOnClick allowClickEventDefault>
					<input type="checkbox" aria-label="Select invoice" />
				</SandboxedOnClick>
			</div>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);

		expect(checkbox).toBeChecked();
		expect(rowOnClick).not.toHaveBeenCalled();
	});

	test("invokes the consumer `onClick` once with an already-cancelled event", async () => {
		const user = userEvent.setup();
		let defaultPreventedWhenCalled: boolean | null = null;
		let typeWhenCalled: string | null = null;
		const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>((event) => {
			// Read inside the handler: the contract is that stopPropagation() and
			// preventDefault() have already run by the time the consumer sees the event.
			defaultPreventedWhenCalled = event.defaultPrevented;
			typeWhenCalled = event.type;
		});

		render(
			<SandboxedOnClick onClick={onClick}>
				<button type="button">Delete</button>
			</SandboxedOnClick>,
		);

		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(typeWhenCalled).toBe("click");
		expect(defaultPreventedWhenCalled).toBe(true);
	});

	test("invokes the consumer `onClick` with an uncancelled event when `allowClickEventDefault` is set", async () => {
		const user = userEvent.setup();
		let defaultPreventedWhenCalled: boolean | null = null;
		const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>((event) => {
			defaultPreventedWhenCalled = event.defaultPrevented;
		});

		render(
			<SandboxedOnClick allowClickEventDefault onClick={onClick}>
				<a href="https://ngrok.com/docs">See ngrok docs</a>
			</SandboxedOnClick>,
		);

		await user.click(screen.getByRole("link", { name: "See ngrok docs" }));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(defaultPreventedWhenCalled).toBe(false);
	});

	test("contains a click synthesized by keyboard activation of an inner button", async () => {
		const user = userEvent.setup();
		const rowOnClick = vi.fn<() => void>();
		const buttonOnClick = vi.fn<() => void>();

		render(
			<div onClick={rowOnClick} role="presentation">
				<SandboxedOnClick>
					<button type="button" onClick={buttonOnClick}>
						Delete
					</button>
				</SandboxedOnClick>
			</div>,
		);

		screen.getByRole("button", { name: "Delete" }).focus();
		await user.keyboard("{Enter}");

		expect(buttonOnClick).toHaveBeenCalledTimes(1);
		expect(rowOnClick).not.toHaveBeenCalled();
	});

	test("always renders `role=presentation`, even when the consumer passes a role of their own", () => {
		const { container } = render(
			<SandboxedOnClick role="group" data-testid="sandbox">
				<button type="button">Delete</button>
			</SandboxedOnClick>,
		);

		// The sandboxed props are spread last, so the presentation role — which is what
		// keeps a non-interactive click target out of the accessibility tree — always wins.
		expect(screen.getByTestId("sandbox")).toHaveAttribute("role", "presentation");
		expect(container.querySelector("[role='group']")).toBeNull();
	});

	test("forwards arbitrary div props onto the rendered element", () => {
		render(
			<SandboxedOnClick
				id="invoice-actions"
				className="custom-class"
				data-testid="sandbox"
				data-invoice="INV001"
				title="Row actions"
			>
				<button type="button">Delete</button>
			</SandboxedOnClick>,
		);

		const sandbox = screen.getByTestId("sandbox");

		expect(sandbox.tagName).toBe("DIV");
		expect(sandbox).toHaveAttribute("id", "invoice-actions");
		expect(sandbox).toHaveAttribute("data-invoice", "INV001");
		expect(sandbox).toHaveAttribute("title", "Row actions");
		expect(sandbox).toHaveClass("custom-class");
	});

	test("forwards `ref` to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();

		render(
			<SandboxedOnClick ref={ref} data-testid="sandbox">
				<button type="button">Delete</button>
			</SandboxedOnClick>,
		);

		expect(ref.current).toBe(screen.getByTestId("sandbox"));
	});

	describe("asChild", () => {
		test("renders the child element instead of a wrapper div, carrying the role and ref", () => {
			// The public props are `ComponentProps<"div">`, so the ref stays div-typed even
			// under `asChild`; at runtime it has to land on the child element instead.
			const ref = createRef<HTMLDivElement>();

			const { container } = render(
				<SandboxedOnClick asChild allowClickEventDefault ref={ref}>
					<a href="https://ngrok.com/docs" className="child-class">
						See ngrok docs
					</a>
				</SandboxedOnClick>,
			);

			const anchor = screen.getByText("See ngrok docs");

			expect(container.querySelector("div")).toBeNull();
			expect(anchor.tagName).toBe("A");
			expect(anchor).toHaveAttribute("role", "presentation");
			expect(anchor).toHaveAttribute("href", "https://ngrok.com/docs");
			expect(anchor).toHaveClass("child-class");
			expect(ref.current).toBe(anchor);
		});

		test("composes with the child's own onClick and still contains and cancels the click", async () => {
			const user = userEvent.setup();
			const rowOnClick = vi.fn<() => void>();
			const childOnClick = vi.fn<() => void>();
			let defaultPreventedWhenCalled: boolean | null = null;
			const sandboxOnClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>((event) => {
				defaultPreventedWhenCalled = event.defaultPrevented;
			});

			render(
				<div onClick={rowOnClick} role="presentation">
					<SandboxedOnClick asChild onClick={sandboxOnClick}>
						<button type="button" onClick={childOnClick}>
							Delete
						</button>
					</SandboxedOnClick>
				</div>,
			);

			await user.click(screen.getByText("Delete"));

			expect(childOnClick).toHaveBeenCalledTimes(1);
			expect(sandboxOnClick).toHaveBeenCalledTimes(1);
			expect(defaultPreventedWhenCalled).toBe(true);
			expect(rowOnClick).not.toHaveBeenCalled();
		});
	});
});

describe("sandboxedOnClickProps", () => {
	test("returns `role=presentation` and a click handler when called with no arguments", () => {
		const props = sandboxedOnClickProps();

		expect(props.role).toBe("presentation");
		expect(typeof props.onClick).toBe("function");
	});

	test("spread with no arguments, it stops propagation and cancels the default action", async () => {
		const user = userEvent.setup();
		const rowOnClick = vi.fn<() => void>();

		render(
			<div onClick={rowOnClick} role="presentation">
				<span {...sandboxedOnClickProps()}>
					<input type="checkbox" aria-label="Select invoice" />
				</span>
			</div>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);

		expect(checkbox).not.toBeChecked();
		expect(rowOnClick).not.toHaveBeenCalled();
	});

	test("spread with `allowClickEventDefault`, it keeps the default action and still calls the consumer handler", async () => {
		const user = userEvent.setup();
		const rowOnClick = vi.fn<() => void>();
		const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();

		render(
			<div onClick={rowOnClick} role="presentation">
				<span {...sandboxedOnClickProps({ allowClickEventDefault: true, onClick })}>
					<input type="checkbox" aria-label="Select invoice" />
				</span>
			</div>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);

		expect(checkbox).toBeChecked();
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(rowOnClick).not.toHaveBeenCalled();
	});
});
