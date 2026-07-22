import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
	AlertCenter,
	type AlertCenterAlert,
	alertsSummary,
	alertTitleText,
	SEVERITY_RANK,
	sortAlertsBySeverity,
} from "./alert-center.js";

const regionAlert = {
	id: "region",
	intent: "info",
	title: "New region available",
	action: { label: "Learn more", href: "/regions" },
	dismissable: true,
} satisfies AlertCenterAlert;

const transferAlert = {
	id: "transfer",
	intent: "warning",
	title: "Approaching your data transfer limit",
	action: { label: "Upgrade", href: "/billing/choose-a-plan" },
	dismissable: true,
} satisfies AlertCenterAlert;

const paymentAlert = {
	id: "payment",
	intent: "danger",
	title: "Payment failed",
	description: "Update your card to avoid interruption.",
	action: { label: "Update payment method", href: "/billing" },
} satisfies AlertCenterAlert;

const alerts = [regionAlert, transferAlert, paymentAlert] satisfies AlertCenterAlert[];

describe("sortAlertsBySeverity", () => {
	test("ranks highest-severity first regardless of input order", () => {
		const sorted = sortAlertsBySeverity(alerts);
		expect(sorted.map((alert) => alert.id)).toEqual(["payment", "transfer", "region"]);
	});

	test("is stable within the same intent (preserves input order)", () => {
		const sameIntent = [
			{ id: "a", intent: "warning", title: "A" },
			{ id: "b", intent: "warning", title: "B" },
			{ id: "c", intent: "warning", title: "C" },
		] satisfies AlertCenterAlert[];
		expect(sortAlertsBySeverity(sameIntent).map((alert) => alert.id)).toEqual(["a", "b", "c"]);
	});

	test("does not mutate the input array", () => {
		const input = [...alerts];
		sortAlertsBySeverity(input);
		expect(input.map((alert) => alert.id)).toEqual(["region", "transfer", "payment"]);
	});

	test("ranks every intent in the documented order", () => {
		expect(SEVERITY_RANK.danger).toBeGreaterThan(SEVERITY_RANK.warning);
		expect(SEVERITY_RANK.warning).toBeGreaterThan(SEVERITY_RANK.important);
		expect(SEVERITY_RANK.important).toBeGreaterThan(SEVERITY_RANK.info);
		expect(SEVERITY_RANK.info).toBeGreaterThan(SEVERITY_RANK.success);
	});
});

describe("alertTitleText", () => {
	test("returns a plain-string title verbatim", () => {
		expect(alertTitleText({ id: "x", intent: "info", title: "Hello" })).toBe("Hello");
	});

	test("returns titleText when the title is a rich node", () => {
		expect(
			alertTitleText({
				id: "x",
				intent: "info",
				title: <strong>Rich</strong>,
				titleText: "Rich title",
			}),
		).toBe("Rich title");
	});
});

describe("alertsSummary", () => {
	test("is empty when there are no alerts", () => {
		expect(alertsSummary([])).toBe("");
	});

	test("is just the title for a single alert", () => {
		expect(alertsSummary([paymentAlert])).toBe("Payment failed");
	});

	test("names the top alert and counts the rest (plural)", () => {
		expect(alertsSummary(sortAlertsBySeverity(alerts))).toBe("Payment failed, and 2 more alerts");
	});

	test("uses the singular for exactly one more", () => {
		expect(alertsSummary(sortAlertsBySeverity([paymentAlert, regionAlert]))).toBe(
			"Payment failed, and 1 more alert",
		);
	});
});

describe("AlertCenter.Bar", () => {
	test("renders no visible bar when there are no alerts", () => {
		const { container } = render(
			<AlertCenter.Root alerts={[]}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toBeNull();
		// the persistent announcer stays mounted, but empty
		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	test("surfaces the highest-severity alert inline, with its CTA", () => {
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		// the bar's title span text is exactly "Payment failed"; the announcer's
		// longer summary text does not exact-match, so this resolves to the bar
		expect(screen.getByText("Payment failed")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Update payment method" })).toHaveAttribute(
			"href",
			"/billing",
		);
	});

	test("announces via a persistent polite live region, not a banner landmark", () => {
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(status).toHaveTextContent("Payment failed, and 2 more alerts");
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test('shows a "+N more" trigger whose accessible name includes its visible text', () => {
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		const trigger = screen.getByRole("button", { name: /\+2 more.*show all 3 alerts/i });
		expect(trigger).toHaveTextContent("+2 more");
	});

	test('omits the "+N more" trigger when a single alert is present', () => {
		render(
			<AlertCenter.Root alerts={[paymentAlert]}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		expect(screen.queryByRole("button", { name: /show all/i })).not.toBeInTheDocument();
	});

	test("renders a dismiss affordance for a dismissable top alert and calls onDismiss", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn<(id: string) => void>();
		render(
			<AlertCenter.Root alerts={[regionAlert]} onDismiss={onDismiss}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Dismiss New region available" }));
		expect(onDismiss).toHaveBeenCalledWith("region");
	});

	test("omits the dismiss affordance for a non-dismissable top alert", () => {
		render(
			<AlertCenter.Root alerts={[paymentAlert]} onDismiss={vi.fn<(id: string) => void>()}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
	});
});

describe("AlertCenter.Content", () => {
	test('opening the dialog from "+N more" lists every alert, ranked', async () => {
		const user = userEvent.setup();
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
				<AlertCenter.Content />
			</AlertCenter.Root>,
		);
		await user.click(screen.getByRole("button", { name: /show all 3 alerts/i }));

		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getByText("Account alerts")).toBeInTheDocument();
		// Alert.Title renders an <h5>; Dialog.Title is an <h2>, so level 5 isolates
		// the alert cards from the dialog's own heading.
		const titles = within(dialog)
			.getAllByRole("heading", { level: 5 })
			.map((heading) => heading.textContent);
		expect(titles).toEqual([
			"Payment failed",
			"Approaching your data transfer limit",
			"New region available",
		]);
	});

	test("renders a custom row via the render-prop child", () => {
		render(
			<AlertCenter.Root alerts={alerts} open>
				<AlertCenter.Bar />
				<AlertCenter.Content>
					{(alert) => <div data-testid="custom-row">Custom: {alertTitleText(alert)}</div>}
				</AlertCenter.Content>
			</AlertCenter.Root>,
		);
		const dialog = screen.getByRole("dialog");
		expect(within(dialog).getAllByTestId("custom-row")).toHaveLength(3);
		expect(within(dialog).getByText("Custom: Payment failed")).toBeInTheDocument();
	});

	test("dismissing a row inside the dialog calls onDismiss with its id", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn<(id: string) => void>();
		render(
			<AlertCenter.Root alerts={alerts} open onDismiss={onDismiss}>
				<AlertCenter.Content />
			</AlertCenter.Root>,
		);
		const dialog = screen.getByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		);
		expect(onDismiss).toHaveBeenCalledWith("transfer");
	});

	test("shows an empty state when opened with no alerts", () => {
		render(
			<AlertCenter.Root alerts={[]} open>
				<AlertCenter.Content />
			</AlertCenter.Root>,
		);
		expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
	});
});
