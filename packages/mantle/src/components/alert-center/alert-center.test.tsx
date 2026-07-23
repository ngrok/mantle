import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
	AlertCenter,
	type AlertCenterAlert,
	alertsSummary,
	alertTitleText,
	barPresenceReducer,
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

describe("barPresenceReducer", () => {
	test("show opens from any state (re-showing mid-exit retargets, never restarts)", () => {
		expect(barPresenceReducer("closed", "show")).toBe("open");
		expect(barPresenceReducer("closing", "show")).toBe("open");
		expect(barPresenceReducer("open", "show")).toBe("open");
	});

	test("hide begins the exit only from a mounted state", () => {
		expect(barPresenceReducer("open", "hide")).toBe("closing");
		expect(barPresenceReducer("closing", "hide")).toBe("closing");
		// already unmounted → stay closed, don't resurrect a closing slide
		expect(barPresenceReducer("closed", "hide")).toBe("closed");
	});

	test("exited completes the exit only while closing", () => {
		expect(barPresenceReducer("closing", "exited")).toBe("closed");
		// a stray transitionend after re-opening must not unmount
		expect(barPresenceReducer("open", "exited")).toBe("open");
		expect(barPresenceReducer("closed", "exited")).toBe("closed");
	});
});

describe("AlertCenter.Bar", () => {
	test("keeps the bar mounted for its exit slide, then unmounts", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<AlertCenter.Root alerts={[paymentAlert]}>
					<AlertCenter.Bar />
				</AlertCenter.Root>,
			);
			const bar = container.querySelector('[data-slot="alert-center-bar"]');
			expect(bar).not.toBeNull();

			// Alerts empty → the bar stays mounted (marked closed) to animate out.
			act(() => {
				rerender(
					<AlertCenter.Root alerts={[]}>
						<AlertCenter.Bar />
					</AlertCenter.Root>,
				);
			});
			expect(container.querySelector('[data-slot="alert-center-bar"]')).not.toBeNull();
			expect(bar?.closest("[data-state]")).toHaveAttribute("data-state", "closed");

			// The exit completes on its safety timeout when no transitionend fires
			// (happy-dom runs no real transitions), and the bar unmounts.
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(container.querySelector('[data-slot="alert-center-bar"]')).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

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
		expect(screen.getByRole("link", { name: "Update payment method" })).toHaveClass("font-medium");
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

	test("shows a compact count-and-caret trigger for additional alerts", () => {
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Show 2 more alerts" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveAttribute("data-slot", "alert-expand-button");
		expect(trigger).toHaveTextContent("+2");
	});

	test("omits the expansion control when a single alert is present", () => {
		render(
			<AlertCenter.Root alerts={[paymentAlert]}>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		expect(screen.queryByRole("button", { name: /show all/i })).not.toBeInTheDocument();
	});

	test("keeps a top alert's dismiss control when more alerts arrive", () => {
		const dismissablePaymentAlert = {
			...paymentAlert,
			dismissable: true,
		} satisfies AlertCenterAlert;
		const { rerender } = render(
			<AlertCenter.Root
				alerts={[dismissablePaymentAlert]}
				onDismiss={vi.fn<(id: string) => void>()}
			>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);

		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Show 1 more alert" })).not.toBeInTheDocument();

		rerender(
			<AlertCenter.Root
				alerts={[dismissablePaymentAlert, transferAlert]}
				onDismiss={vi.fn<(id: string) => void>()}
			>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);

		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show 1 more alert" })).toBeInTheDocument();
	});

	test("renders a custom banner with expansion and dismiss capabilities", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn<(id: string) => void>();
		const dismissableAlerts = [
			{ ...paymentAlert, dismissable: true },
			transferAlert,
			regionAlert,
		] satisfies AlertCenterAlert[];
		render(
			<AlertCenter.Root alerts={dismissableAlerts} onDismiss={onDismiss}>
				<AlertCenter.Bar>
					{(alert, { dismiss, isExpanded, remaining, toggle }) => (
						<div data-testid="custom-banner">
							<span>{alert.id}</span>
							<button type="button" onClick={toggle}>
								{isExpanded ? "Collapse custom alerts" : `Expand ${remaining} custom alerts`}
							</button>
							{dismiss != null && (
								<button type="button" onClick={dismiss}>
									Dismiss custom alert
								</button>
							)}
						</div>
					)}
				</AlertCenter.Bar>
				<AlertCenter.Content data-testid="content" />
			</AlertCenter.Root>,
		);

		expect(screen.getByTestId("custom-banner")).toHaveTextContent("payment");
		await user.click(screen.getByRole("button", { name: "Expand 2 custom alerts" }));
		expect(screen.getByTestId("content")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Collapse custom alerts" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Dismiss custom alert" }));
		expect(onDismiss).toHaveBeenCalledWith("payment");
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
		expect(screen.getByRole("button", { name: "Dismiss New region available" })).toHaveAttribute(
			"data-slot",
			"alert-dismiss-icon-button",
		);
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
	test("expands the additional alerts inline and collapses them again", async () => {
		const user = userEvent.setup();
		render(
			<AlertCenter.Root alerts={alerts}>
				<AlertCenter.Bar />
				<AlertCenter.Content data-testid="content" />
			</AlertCenter.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Show 2 more alerts" }));

		const content = screen.getByTestId("content");
		expect(content).toHaveAttribute("data-slot", "alert-center-content");
		expect(content).toHaveAttribute("data-state", "open");
		const additionalBanners = content.querySelectorAll('[data-slot="alert"]');
		expect(additionalBanners).toHaveLength(2);
		for (const banner of additionalBanners) {
			expect(banner).toHaveClass("w-full", "rounded-none", "py-2");
			expect(banner).not.toHaveClass("items-center");
		}
		for (const title of content.querySelectorAll('[data-slot="alert-title"]')) {
			expect(title).not.toHaveClass("truncate");
		}
		expect(screen.getByRole("link", { name: "Upgrade" })).toHaveClass("font-medium");
		const titles = screen
			.getAllByRole("heading", { level: 5 })
			.map((heading) => heading.textContent);
		expect(titles).toEqual([
			"Payment failed Update payment method",
			"Approaching your data transfer limit Upgrade",
			"New region available Learn more",
		]);
		expect(screen.getByRole("button", { name: "Collapse additional alerts" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);

		await user.click(screen.getByRole("button", { name: "Collapse additional alerts" }));
		// Collapsing runs an exit animation, so the content stays mounted (hidden)
		// rather than unmounting — its data-state flips to "closed".
		expect(screen.getByTestId("content")).toHaveAttribute("data-state", "closed");
	});

	test("renders a custom row via the render-prop child", () => {
		render(
			<AlertCenter.Root alerts={alerts} open onDismiss={vi.fn<(id: string) => void>()}>
				<AlertCenter.Bar />
				<AlertCenter.Content>
					{(alert, _index, { dismiss }) => (
						<div data-testid="custom-row">
							Custom: {alertTitleText(alert)}
							{dismiss != null && (
								<button type="button" onClick={dismiss}>
									Dismiss custom row
								</button>
							)}
						</div>
					)}
				</AlertCenter.Content>
			</AlertCenter.Root>,
		);
		expect(screen.getAllByTestId("custom-row")).toHaveLength(2);
		expect(screen.getByText("Custom: Approaching your data transfer limit")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "Dismiss custom row" })).toHaveLength(2);
	});

	test("dismissing a row in the inline expansion calls onDismiss with its id", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn<(id: string) => void>();
		render(
			<AlertCenter.Root alerts={alerts} open onDismiss={onDismiss}>
				<AlertCenter.Content />
			</AlertCenter.Root>,
		);
		await user.click(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		);
		expect(onDismiss).toHaveBeenCalledWith("transfer");
	});

	test("does not render inline content when there are no additional alerts", () => {
		render(
			<AlertCenter.Root alerts={[]} open>
				<AlertCenter.Content />
			</AlertCenter.Root>,
		);
		expect(screen.queryByTestId("content")).not.toBeInTheDocument();
	});
});
