import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

	test("sandboxedOnClickProps returns the presentational role for a consumer element", () => {
		expect(sandboxedOnClickProps().role).toBe("presentation");
	});
});
