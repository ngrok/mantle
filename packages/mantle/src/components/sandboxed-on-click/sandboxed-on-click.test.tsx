import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { SandboxedOnClick, sandboxedOnClickProps } from "./sandboxed-on-click.js";

describe("SandboxedOnClick", () => {
	test("the default div is presentational and stops the click from bubbling", async () => {
		const user = userEvent.setup();
		const handleOuterClick = vi.fn<() => void>();
		const handleInnerClick = vi.fn<() => void>();
		render(
			// Why role="presentation": the outer div only observes bubbling in this test.
			<div role="presentation" onClick={handleOuterClick}>
				<SandboxedOnClick data-testid="sandbox" onClick={handleInnerClick}>
					<button type="button">Inside</button>
				</SandboxedOnClick>
			</div>,
		);

		expect(screen.getByTestId("sandbox")).toHaveAttribute("role", "presentation");

		await user.click(screen.getByRole("button", { name: "Inside" }));
		expect(handleInnerClick).toHaveBeenCalledTimes(1);
		expect(handleOuterClick).toHaveBeenCalledTimes(0);
	});

	test("asChild keeps the child's own role and still sandboxes the click", async () => {
		const user = userEvent.setup();
		const handleOuterClick = vi.fn<() => void>();
		render(
			// Why role="presentation": the outer div only observes bubbling in this test.
			<div role="presentation" onClick={handleOuterClick}>
				<SandboxedOnClick asChild allowClickEventDefault>
					<a href="https://ngrok.com/docs">See ngrok docs</a>
				</SandboxedOnClick>
			</div>,
		);

		const link = screen.getByRole("link", { name: "See ngrok docs" });
		expect(link).not.toHaveAttribute("role");

		await user.click(link);
		expect(handleOuterClick).toHaveBeenCalledTimes(0);
	});

	test("allowClickEventDefault keeps the default action; omitting it prevents it", async () => {
		const user = userEvent.setup();
		const seen: boolean[] = [];
		render(
			<>
				<SandboxedOnClick
					data-testid="prevented"
					onClick={(event) => {
						seen.push(event.defaultPrevented);
					}}
				/>
				<SandboxedOnClick
					allowClickEventDefault
					data-testid="allowed"
					onClick={(event) => {
						seen.push(event.defaultPrevented);
					}}
				/>
			</>,
		);

		await user.click(screen.getByTestId("prevented"));
		await user.click(screen.getByTestId("allowed"));
		expect(seen).toEqual([true, false]);
	});

	test("forwards its ref to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<SandboxedOnClick ref={ref} data-testid="sandbox">
				<button type="button">Inside</button>
			</SandboxedOnClick>,
		);

		expect(ref.current).toBe(screen.getByTestId("sandbox"));
	});
});

describe("sandboxedOnClickProps", () => {
	test("spread with no arguments, it marks the element presentational and cancels the click", async () => {
		const user = userEvent.setup();
		const handleOuterClick = vi.fn<() => void>();
		render(
			// Why role="presentation": the outer div only observes bubbling in this test.
			<div role="presentation" onClick={handleOuterClick}>
				<span data-testid="sandbox" {...sandboxedOnClickProps()}>
					<input type="checkbox" aria-label="Select invoice" />
				</span>
			</div>,
		);

		expect(screen.getByTestId("sandbox")).toHaveAttribute("role", "presentation");

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);
		// A cancelled click reverts a checkbox's activation, so an unchecked box is
		// the default action being prevented.
		expect(checkbox).not.toBeChecked();
		expect(handleOuterClick).toHaveBeenCalledTimes(0);
	});

	test("spread with allowClickEventDefault, it keeps the default action and still calls the consumer handler", async () => {
		const user = userEvent.setup();
		const handleOuterClick = vi.fn<() => void>();
		const handleConsumerClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();
		render(
			// Why role="presentation": the outer div only observes bubbling in this test.
			<div role="presentation" onClick={handleOuterClick}>
				<span
					{...sandboxedOnClickProps({ allowClickEventDefault: true, onClick: handleConsumerClick })}
				>
					<input type="checkbox" aria-label="Select invoice" />
				</span>
			</div>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select invoice" });
		await user.click(checkbox);
		expect(checkbox).toBeChecked();
		expect(handleConsumerClick).toHaveBeenCalledTimes(1);
		expect(handleConsumerClick).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: "click", defaultPrevented: false }),
		);
		expect(handleOuterClick).toHaveBeenCalledTimes(0);
	});
});
