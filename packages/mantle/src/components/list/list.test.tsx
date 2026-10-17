import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { List } from "./list.js";

/** The Tailwind `font-weight` utilities. */
const FONT_WEIGHT = /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;

describe("List.Item", () => {
	test("renders a type=button by default", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Account</List.Item>
			</List.Root>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("type", "button");
	});

	test("clicking fires onClick", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={onClick}>Account</List.Item>
			</List.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Account" }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	test("a disabled button is disabled", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item disabled>Account</List.Item>
			</List.Root>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toBeDisabled();
	});

	test("asChild renders the provided element (e.g. a link) with the control slot", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item asChild>
					<a href="/accounts/1">Account</a>
				</List.Item>
			</List.Root>,
		);

		const link = screen.getByRole("link", { name: "Account" });
		expect(link).toHaveAttribute("href", "/accounts/1");
		expect(link).toHaveAttribute("data-slot", "list-item-control");
	});

	test("asChild conveys disabled inertly (aria-disabled + removed from tab order)", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item asChild disabled>
					<a href="/accounts/1">Account</a>
				</List.Item>
			</List.Root>,
		);
		// Why `tabindex="-1"`: an `<a>` cannot take the `disabled` attribute.
		// `aria-disabled` alone is advisory.
		const link = screen.getByRole("link", { name: "Account" });
		expect(link).toHaveAttribute("aria-disabled", "true");
		expect(link).toHaveAttribute("tabindex", "-1");
	});

	test("a disabled asChild link swallows activation (AT dispatches clicks without hit testing)", () => {
		// Regression: `pointer-events: none` only blocks hit-tested pointer input —
		// screen readers and `element.click()` dispatch click events directly, which
		// would follow the still-present `href`. The item must swallow those too.
		const onClick = vi.fn<() => void>();
		render(
			<List.Root aria-label="Accounts">
				<List.Item asChild disabled onClick={onClick}>
					<a href="/accounts/1">Account</a>
				</List.Item>
			</List.Root>,
		);

		// Dispatch the click directly on the element (as AT does) — fireEvent returns
		// false when a handler called preventDefault, i.e. navigation was blocked.
		const link = screen.getByRole("link", { name: "Account" });
		const activationAllowed = fireEvent.click(link);
		expect(activationAllowed).toBe(false);
		expect(onClick).not.toHaveBeenCalled();
	});

	test("reflects current as aria-current so the state is announced, not just tinted", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item current onClick={() => {}}>
					Account
				</List.Item>
				<List.Item onClick={() => {}}>Other</List.Item>
			</List.Root>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("aria-current", "true");
		expect(screen.getByRole("button", { name: "Other" })).not.toHaveAttribute("aria-current");
	});

	test("keeps a consumer's onClickCapture on an enabled item (only the disabled asChild guard replaces it)", () => {
		// The disabled-asChild guard is installed *as* `onClickCapture`, after the
		// prop spread — so the enabled branch has to hand a consumer's own capture
		// handler back or it is silently dropped.
		const onClickCapture = vi.fn<() => void>();
		render(
			<List.Root aria-label="Accounts">
				<List.Item asChild onClickCapture={onClickCapture}>
					<a href="#a">Account</a>
				</List.Item>
			</List.Root>,
		);

		fireEvent.click(screen.getByRole("link", { name: "Account" }));
		expect(onClickCapture).toHaveBeenCalledTimes(1);
	});

	test("throws a helpful error when rendered outside a Root", () => {
		// Why the spy: React logs the thrown render error to `console.error` and floods the report.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<List.Item>Account</List.Item>)).toThrow(
			/must be composed inside List\.Root/,
		);
	});
});

describe("List.ItemTitle / List.ItemDescription", () => {
	test("stamp their data-slot on a span and let a consumer className win over the default", () => {
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>
					<List.ItemTitle className="font-normal">Acme Inc</List.ItemTitle>
					<List.ItemDescription className="leading-6">Pay-as-you-go</List.ItemDescription>
				</List.Item>
			</List.Root>,
		);

		const title = screen.getByText("Acme Inc");
		expect(title).toHaveAttribute("data-slot", "list-item-title");
		expect(title.tagName).toBe("SPAN");
		// tailwind-merge override contract: the consumer's weight replaces the
		// part's `font-medium` default instead of landing beside it, where source
		// order would decide the winner.
		expect(Array.from(title.classList).filter((name) => FONT_WEIGHT.test(name))).toEqual([
			"font-normal",
		]);

		const description = screen.getByText("Pay-as-you-go");
		expect(description).toHaveAttribute("data-slot", "list-item-description");
		expect(description.tagName).toBe("SPAN");
		expect(Array.from(description.classList).filter((name) => name.startsWith("leading-"))).toEqual(
			["leading-6"],
		);
	});
});
