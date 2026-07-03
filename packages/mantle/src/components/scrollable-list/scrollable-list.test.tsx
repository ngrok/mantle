import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ScrollableList } from "./scrollable-list.js";

describe("ScrollableList.Item", () => {
	test("renders a type=button by default", () => {
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item onClick={() => {}}>Account</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("type", "button");
	});

	test("clicking fires onClick", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item onClick={onClick}>Account</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);

		await user.click(screen.getByRole("button", { name: "Account" }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	test("a disabled button is disabled", () => {
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item disabled>Account</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toBeDisabled();
	});

	test("asChild renders the provided element (e.g. a link) with the item slot", () => {
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item asChild>
					<a href="/accounts/1">Account</a>
				</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);

		const link = screen.getByRole("link", { name: "Account" });
		expect(link).toHaveAttribute("href", "/accounts/1");
		expect(link).toHaveAttribute("data-slot", "scrollable-list-item");
	});

	test("asChild conveys disabled inertly (aria-disabled + removed from tab order + no pointer events)", () => {
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item asChild disabled>
					<a href="/accounts/1">Account</a>
				</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);
		// `aria-disabled` alone is advisory, so a disabled <a> (which can't take the
		// real `disabled` attribute) is also pulled out of the tab order and has its
		// pointer events blocked, so it can't be clicked or Enter-activated.
		const link = screen.getByRole("link", { name: "Account" });
		expect(link).toHaveAttribute("aria-disabled", "true");
		expect(link).toHaveAttribute("tabindex", "-1");
		expect(link.className).toContain("aria-disabled:pointer-events-none");
	});

	test("a disabled asChild link swallows activation (AT dispatches clicks without hit testing)", () => {
		// Regression: `pointer-events: none` only blocks hit-tested pointer input —
		// screen readers and `element.click()` dispatch click events directly, which
		// would follow the still-present `href`. The item must swallow those too.
		const onClick = vi.fn<() => void>();
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item asChild disabled onClick={onClick}>
					<a href="/accounts/1">Account</a>
				</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);

		// Dispatch the click directly on the element (as AT does) — fireEvent returns
		// false when a handler called preventDefault, i.e. navigation was blocked.
		const link = screen.getByRole("link", { name: "Account" });
		const activationAllowed = fireEvent.click(link);
		expect(activationAllowed).toBe(false);
		expect(onClick).not.toHaveBeenCalled();
	});

	test("reflects selected as aria-current so the state is announced, not just tinted", () => {
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item selected onClick={() => {}}>
					Account
				</ScrollableList.Item>
				<ScrollableList.Item onClick={() => {}}>Other</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("aria-current", "true");
		expect(screen.getByRole("button", { name: "Other" })).not.toHaveAttribute("aria-current");
	});

	test("throws a helpful error when rendered outside a Viewport", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() => render(<ScrollableList.Item>Account</ScrollableList.Item>)).toThrow(
				/must be rendered inside List.Root or List.VirtualRoot/,
			);
		} finally {
			errorSpy.mockRestore();
		}
	});
});
