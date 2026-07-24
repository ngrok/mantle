import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createContext, useContext, useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Alert } from "../alert/alert.js";
import {
	AlertCenter,
	AlertCenterStore,
	alertsSummary,
	alertTitleText,
	barPresenceReducer,
	rankAlerts,
	SEVERITY_RANK,
} from "./alert-center.js";

/** The canonical banner content for a test alert: icon, linked title, description. */
function AlertBody({ title, href, cta }: { title: string; href?: string; cta?: string }) {
	return (
		<>
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title>
					{title} {href != null && cta != null && <a href={href}>{cta}</a>}
				</Alert.Title>
				<Alert.Description>Supporting copy for {title}.</Alert.Description>
			</Alert.Content>
		</>
	);
}

describe("rankAlerts", () => {
	test("ranks highest-severity first regardless of input order", () => {
		const ranked = rankAlerts([
			{ id: "region", intent: "info", sequence: 0 },
			{ id: "transfer", intent: "warning", sequence: 1 },
			{ id: "payment", intent: "danger", sequence: 2 },
		] as const);
		expect(ranked.map((alert) => alert.id)).toEqual(["payment", "transfer", "region"]);
	});

	test("breaks same-intent ties by sequence (arrival order)", () => {
		const ranked = rankAlerts([
			{ id: "b", intent: "warning", sequence: 1 },
			{ id: "a", intent: "warning", sequence: 0 },
			{ id: "c", intent: "warning", sequence: 2 },
		] as const);
		expect(ranked.map((alert) => alert.id)).toEqual(["a", "b", "c"]);
	});

	test("does not mutate the input array", () => {
		const input = [
			{ id: "region", intent: "info", sequence: 0 },
			{ id: "payment", intent: "danger", sequence: 1 },
		] as const;
		rankAlerts(input);
		expect(input.map((alert) => alert.id)).toEqual(["region", "payment"]);
	});

	test("ranks every intent in the documented order", () => {
		expect(SEVERITY_RANK.danger).toBeGreaterThan(SEVERITY_RANK.warning);
		expect(SEVERITY_RANK.warning).toBeGreaterThan(SEVERITY_RANK.important);
		expect(SEVERITY_RANK.important).toBeGreaterThan(SEVERITY_RANK.info);
		expect(SEVERITY_RANK.info).toBeGreaterThan(SEVERITY_RANK.success);
	});
});

describe("alertsSummary", () => {
	test("is empty when there are no alerts", () => {
		expect(alertsSummary("", 0)).toBe("");
		expect(alertsSummary("Payment failed", 0)).toBe("");
	});

	test("is just the top label for a single alert", () => {
		expect(alertsSummary("Payment failed", 1)).toBe("Payment failed");
	});

	test("names the top alert and counts the rest (plural)", () => {
		expect(alertsSummary("Payment failed", 3)).toBe("Payment failed, and 2 more alerts");
	});

	test("uses the singular for exactly one more", () => {
		expect(alertsSummary("Payment failed", 2)).toBe("Payment failed, and 1 more alert");
	});

	test("falls back to a count-only summary when the top alert rendered no title", () => {
		expect(alertsSummary("", 1)).toBe("1 alert");
		expect(alertsSummary("", 3)).toBe("3 alerts");
	});
});

describe("alertTitleText", () => {
	function banner(innerHTML: string): Element {
		const element = document.createElement("div");
		element.innerHTML = innerHTML;
		return element;
	}

	test("is the title's text with whitespace normalized", () => {
		expect(alertTitleText(banner('<h5 data-slot="alert-title">Payment\n\t failed</h5>'))).toBe(
			"Payment failed",
		);
	});

	test("strips inline CTA anchors from the title", () => {
		expect(
			alertTitleText(
				banner(
					'<h5 data-slot="alert-title">Payment failed <a href="/billing">Update card</a></h5>',
				),
			),
		).toBe("Payment failed");
	});

	test("falls back to the full text when the title is entirely a link", () => {
		expect(
			alertTitleText(banner('<h5 data-slot="alert-title"><a href="/regions">eu-west</a></h5>')),
		).toBe("eu-west");
	});

	test("is empty when the banner rendered no title", () => {
		expect(alertTitleText(banner("<p>no title here</p>"))).toBe("");
	});
});

describe("AlertCenterStore", () => {
	const registration = (id: string, intent: "danger" | "warning" | "info") => ({
		id,
		intent,
		className: undefined,
		children: null,
	});

	test("snapshots the ranked alerts and notifies subscribers", () => {
		const store = new AlertCenterStore();
		const listener = vi.fn<() => void>();
		store.subscribe(listener);
		store.register(registration("region", "info"));
		store.register(registration("payment", "danger"));
		expect(listener).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot().map((alert) => alert.id)).toEqual(["payment", "region"]);
	});

	test("keeps arrival order within an intent across re-registrations", () => {
		const store = new AlertCenterStore();
		store.register(registration("a", "warning"));
		store.register(registration("b", "warning"));
		// a prop update re-registers a — its sticky sequence keeps it first
		store.register(registration("a", "warning"));
		expect(store.getSnapshot().map((alert) => alert.id)).toEqual(["a", "b"]);
	});

	test("a dismissed-then-returning id resumes its original position", () => {
		const store = new AlertCenterStore();
		const unregisterA = store.register(registration("a", "warning"));
		store.register(registration("b", "warning"));
		unregisterA();
		expect(store.getSnapshot().map((alert) => alert.id)).toEqual(["b"]);
		store.register(registration("a", "warning"));
		expect(store.getSnapshot().map((alert) => alert.id)).toEqual(["a", "b"]);
	});

	test("duplicate ids: the last registration wins, and a stale cleanup cannot delete the survivor", () => {
		const store = new AlertCenterStore();
		const unregisterFirst = store.register({ ...registration("x", "info"), className: "first" });
		store.register({ ...registration("x", "info"), className: "second" });
		expect(store.getSnapshot().map((alert) => alert.className)).toEqual(["second"]);
		unregisterFirst();
		expect(store.getSnapshot().map((alert) => alert.className)).toEqual(["second"]);
	});

	test("setTopLabel notifies only on change and leaves the ranked snapshot untouched", () => {
		const store = new AlertCenterStore();
		store.register(registration("payment", "danger"));
		const snapshotBefore = store.getSnapshot();
		const listener = vi.fn<() => void>();
		store.subscribe(listener);
		store.setTopLabel("Payment failed");
		store.setTopLabel("Payment failed");
		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getTopLabel()).toBe("Payment failed");
		expect(store.getSnapshot()).toBe(snapshotBefore);
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

/**
 * A realistic consumer: three alerts whose presence is consumer state, with
 * inline CTAs in every title and dismiss buttons composed on all three. The
 * derived dismiss names strip the CTA anchors, so they read as the bare
 * titles.
 */
function ThreeAlertHarness() {
	const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
	const dismiss = (id: string) => setDismissed((previous) => new Set(previous).add(id));

	return (
		<AlertCenter.Root>
			<AlertCenter.Bar />
			<AlertCenter.Content data-testid="content" />
			{!dismissed.has("region") && (
				<AlertCenter.Item id="region" intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							New region available <a href="/regions">Learn more</a>
						</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => dismiss("region")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{!dismissed.has("transfer") && (
				<AlertCenter.Item id="transfer" intent="warning">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Approaching your data transfer limit <a href="/billing/choose-a-plan">Upgrade</a>
						</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => dismiss("transfer")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
			{!dismissed.has("payment") && (
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Payment failed <a href="/billing">Update payment method</a>
						</Alert.Title>
						<Alert.Description>Supporting copy for Payment failed.</Alert.Description>
						<AlertCenter.DismissIconButton onClick={() => dismiss("payment")} />
					</Alert.Content>
				</AlertCenter.Item>
			)}
		</AlertCenter.Root>
	);
}

describe("AlertCenter.Bar", () => {
	test("surfaces the highest-severity alert's authored content inline, with its CTA", () => {
		const { container } = render(<ThreeAlertHarness />);
		const bar = container.querySelector('[data-slot="alert-center-bar"]');
		expect(bar).not.toBeNull();
		expect(bar).toHaveAttribute("data-alert-id", "payment");
		// the authored children — heading, CTA link — render inside the bar chrome
		expect(bar).toContainElement(screen.getByRole("heading", { level: 5, name: /Payment failed/ }));
		const cta = screen.getByRole("link", { name: "Update payment method" });
		expect(bar).toContainElement(cta);
		expect(cta).toHaveAttribute("href", "/billing");
	});

	test("renders no visible bar when there are no alerts", () => {
		const { container } = render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
			</AlertCenter.Root>,
		);
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toBeNull();
		// the persistent announcer stays mounted, but empty
		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	test("keeps the bar mounted for its exit slide (inert), then unmounts", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<AlertCenter.Root>
					<AlertCenter.Bar />
					<AlertCenter.Item id="payment" intent="danger">
						<AlertBody title="Payment failed" href="/billing" cta="Update payment method" />
					</AlertCenter.Item>
				</AlertCenter.Root>,
			);
			const bar = container.querySelector('[data-slot="alert-center-bar"]');
			expect(bar).not.toBeNull();

			// The item unmounts → the bar stays mounted (marked closed, inert) to
			// animate out, its retained CTA unreachable to keyboard and AT.
			act(() => {
				rerender(
					<AlertCenter.Root>
						<AlertCenter.Bar />
					</AlertCenter.Root>,
				);
			});
			const closingBar = container.querySelector('[data-slot="alert-center-bar"]');
			expect(closingBar).not.toBeNull();
			const wrapper = closingBar?.closest("[data-state]");
			expect(wrapper).toHaveAttribute("data-state", "closed");
			expect(wrapper).toHaveAttribute("inert");
			// the retained children keep the banner filled through the slide —
			// an empty strip collapsing would flash blank before the exit
			expect(closingBar).toHaveTextContent("Payment failed");
			expect(screen.getByRole("link", { name: "Update payment method" })).toBeInTheDocument();

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

	test("announces the top alert's rendered title (CTA stripped) via a persistent polite live region", () => {
		render(<ThreeAlertHarness />);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(status).toHaveTextContent("Payment failed, and 2 more alerts");
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("shows a compact count-and-caret trigger wired to the expansion via aria-controls", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);
		const trigger = screen.getByRole("button", { name: "Show 2 more alerts" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveAttribute("data-slot", "alert-expand-button");
		expect(trigger).toHaveTextContent("+2");

		// the reference resolves even while collapsed — Content stays mounted
		// (hidden) whenever additional alerts exist
		const content = screen.getByTestId("content");
		expect(content.id).not.toBe("");
		expect(trigger).toHaveAttribute("aria-controls", content.id);

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	test("keeps derived labels settled when the dismiss button is composed inside Alert.Title", () => {
		// regression: the derived label must not read back its own sr-only text —
		// that fed the title-derived string to itself and grew it every layout
		// pass until React threw "Maximum update depth exceeded"
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>
							Payment failed <AlertCenter.DismissIconButton onClick={() => {}} />
						</Alert.Title>
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(/^Payment failed$/);
	});

	test("clears the announcer headline when the Bar unmounts", () => {
		const { rerender } = render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.getByRole("status")).toHaveTextContent("Payment failed");

		// without the Bar there is no rendered title to headline with — the
		// announcer falls back to the count instead of a frozen stale label
		rerender(
			<AlertCenter.Root>
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.getByRole("status")).toHaveTextContent(/^1 alert$/);
	});

	test("omits the expansion control when a single alert is present", () => {
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.queryByRole("button", { name: /show/i })).not.toBeInTheDocument();
	});

	test("stamps the chrome with data-placement, data-alert-id, and the single-line description hiding", () => {
		const { container } = render(<ThreeAlertHarness />);
		const bar = container.querySelector('[data-slot="alert-center-bar"]');
		expect(bar).toHaveAttribute("data-placement", "bar");
		expect(bar).toHaveAttribute("data-alert-id", "payment");
		expect(bar).toHaveClass("[&_[data-slot=alert-description]]:hidden");
	});

	test("keeps a top alert's dismiss control when more alerts arrive", () => {
		const { rerender } = render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Payment failed</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Show 1 more alert" })).not.toBeInTheDocument();

		rerender(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Payment failed</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
				<AlertCenter.Item id="transfer" intent="warning">
					<AlertBody title="Transfer limit" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Show 1 more alert" })).toBeInTheDocument();
	});

	test("omits the expansion control when no AlertCenter.Content is composed", () => {
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
				<AlertCenter.Item id="transfer" intent="warning">
					<AlertBody title="Transfer limit" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		// no expansion surface exists — a control that toggles nothing (with a
		// dangling aria-controls) must not render
		expect(screen.queryByRole("button", { name: /show/i })).not.toBeInTheDocument();
	});

	test("dismissing the top alert promotes the next-ranked alert into the bar", async () => {
		const user = userEvent.setup();
		const { container } = render(<ThreeAlertHarness />);
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"payment",
		);

		await user.click(screen.getByRole("button", { name: "Dismiss Payment failed" }));

		expect(container.querySelector('[data-slot="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"transfer",
		);
		expect(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		).toBeInTheDocument();
	});

	test("redirects keyboard focus to the new bar's control when the focused top alert is dismissed", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);

		await user.click(screen.getByRole("button", { name: "Dismiss Payment failed" }));

		expect(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		).toHaveFocus();
	});

	test("does not steal focus from a surviving control when a new top alert arrives", async () => {
		const user = userEvent.setup();
		const { rerender } = render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="transfer" intent="warning">
					<AlertBody title="Transfer limit" />
				</AlertCenter.Item>
				<AlertCenter.Item id="region" intent="info">
					<AlertBody title="New region" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		const expand = screen.getByRole("button", { name: "Show 1 more alert" });
		await user.click(expand);
		expect(expand).toHaveFocus();

		// a higher-severity alert arrives and promotes into the bar — the expand
		// button survives the swap, so the user's focus must stay put
		rerender(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="transfer" intent="warning">
					<AlertBody title="Transfer limit" />
				</AlertCenter.Item>
				<AlertCenter.Item id="region" intent="info">
					<AlertBody title="New region" />
				</AlertCenter.Item>
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Payment failed</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		expect(screen.getByRole("button", { name: "Collapse additional alerts" })).toHaveFocus();
	});

	test("falls back to focusing the bar wrapper when the new top alert has no controls", async () => {
		function PromotionToControlFreeAlert() {
			const [dismissed, setDismissed] = useState(false);
			return (
				<AlertCenter.Root>
					<AlertCenter.Bar />
					<AlertCenter.Content />
					{!dismissed && (
						<AlertCenter.Item id="payment" intent="danger">
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>Payment failed</Alert.Title>
								<AlertCenter.DismissIconButton onClick={() => setDismissed(true)} />
							</Alert.Content>
						</AlertCenter.Item>
					)}
					<AlertCenter.Item id="region" intent="info">
						<Alert.Icon />
						<Alert.Content>
							<Alert.Title>New region</Alert.Title>
						</Alert.Content>
					</AlertCenter.Item>
				</AlertCenter.Root>
			);
		}
		const user = userEvent.setup();
		const { container } = render(<PromotionToControlFreeAlert />);

		// the promoted alert has no dismiss control, and with nothing left to
		// expand there's no expand control either — focus falls to the wrapper
		// (tabIndex -1) rather than dropping to <body>
		await user.click(screen.getByRole("button", { name: "Dismiss Payment failed" }));

		const wrapper = container
			.querySelector('[data-slot="alert-center-bar"]')
			?.closest('[tabindex="-1"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper).toHaveFocus();
	});
});

describe("AlertCenter ordering", () => {
	test("items mounting together rank in tree order within an intent", () => {
		const { container } = render(
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content data-testid="content" />
				<AlertCenter.Item id="first" intent="warning">
					<AlertBody title="First warning" />
				</AlertCenter.Item>
				<AlertCenter.Item id="second" intent="warning">
					<AlertBody title="Second warning" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"first",
		);
		expect(
			screen.getByTestId("content").querySelector('[data-slot="alert-center-item"]'),
		).toHaveAttribute("data-alert-id", "second");
	});

	test("a later-arriving same-intent alert appends after its peers, even when authored above them", () => {
		const { container, rerender } = render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="early" intent="warning">
					<AlertBody title="Early warning" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		rerender(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="late" intent="warning">
					<AlertBody title="Late warning" />
				</AlertCenter.Item>
				<AlertCenter.Item id="early" intent="warning">
					<AlertBody title="Early warning" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		// "early" arrived first, so it keeps the bar despite "late" being authored above it
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"early",
		);
	});
});

describe("AlertCenter.Item projection", () => {
	test("renders nothing at its authored position", () => {
		const { container } = render(
			<AlertCenter.Root>
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		// without a composed Bar/Content, the only rendered output is the
		// announcer — and with no bar DOM to derive a headline from, it falls
		// back to the count-only summary
		expect(container.querySelector('[data-slot="alert"]')).toBeNull();
		expect(screen.getByRole("status")).toHaveTextContent("1 alert");
	});

	test("children rendered in the bar can read context provided above Root", () => {
		const AccountContext = createContext("no-account");
		function AccountName() {
			return <Alert.Title>{useContext(AccountContext)}</Alert.Title>;
		}
		render(
			<AccountContext.Provider value="Acme Corp">
				<AlertCenter.Root>
					<AlertCenter.Bar />
					<AlertCenter.Item id="payment" intent="danger">
						<Alert.Content>
							<AccountName />
						</Alert.Content>
					</AlertCenter.Item>
				</AlertCenter.Root>
			</AccountContext.Provider>,
		);
		expect(screen.getByRole("heading", { level: 5, name: "Acme Corp" })).toBeInTheDocument();
		// the announcer derives its headline from the same rendered title
		expect(screen.getByRole("status")).toHaveTextContent("Acme Corp");
	});

	test("forwards the item's className to its chrome in both placements", () => {
		const { container } = render(
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content />
				<AlertCenter.Item id="payment" intent="danger" className="test-bar-chrome">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
				<AlertCenter.Item id="transfer" intent="warning" className="test-row-chrome">
					<AlertBody title="Transfer limit" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(container.querySelector('[data-slot="alert-center-bar"]')).toHaveClass(
			"test-bar-chrome",
		);
		expect(container.querySelector('[data-slot="alert-center-item"]')).toHaveClass(
			"test-row-chrome",
		);
	});

	test("throws when an item is nested inside another item's children", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() =>
				render(
					<AlertCenter.Root>
						<AlertCenter.Bar />
						<AlertCenter.Item id="outer" intent="warning">
							<AlertCenter.Item id="inner" intent="danger">
								<AlertBody title="Inner" />
							</AlertCenter.Item>
						</AlertCenter.Item>
					</AlertCenter.Root>,
				),
			).toThrow("AlertCenter.Item cannot be rendered inside another item's children.");
		} finally {
			consoleError.mockRestore();
		}
	});

	test("throws when rendered outside AlertCenter.Root", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() =>
				render(
					<AlertCenter.Item id="x" intent="info">
						<AlertBody title="X" />
					</AlertCenter.Item>,
				),
			).toThrow("AlertCenter.Item must be rendered inside <AlertCenter.Root>.");
		} finally {
			consoleError.mockRestore();
		}
	});
});

describe("AlertCenter.DismissIconButton", () => {
	test("derives its label from the enclosing banner's rendered title and calls onClick", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn<() => void>();
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="region" intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>New region available</Alert.Title>
						<AlertCenter.DismissIconButton onClick={onDismiss} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		const dismiss = screen.getByRole("button", { name: "Dismiss New region available" });
		expect(dismiss).toHaveAttribute("data-slot", "alert-dismiss-icon-button");
		await user.click(dismiss);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	test("strips the title's inline CTA anchor from the derived label", () => {
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="payment" intent="danger">
					<Alert.Content>
						<Alert.Title>
							Payment failed <a href="/billing">Update payment method</a>
						</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toBeInTheDocument();
	});

	test("an explicit label overrides the derived default", () => {
		render(
			<AlertCenter.Root>
				<AlertCenter.Bar />
				<AlertCenter.Item id="region" intent="info">
					<Alert.Content>
						<Alert.Title>New region available</Alert.Title>
						<AlertCenter.DismissIconButton label="Hide this notice" onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.getByRole("button", { name: "Hide this notice" })).toBeInTheDocument();
	});

	test("centers itself only in the bar placement", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);
		// top (bar) placement: re-centered for the single-line form
		expect(screen.getByRole("button", { name: "Dismiss Payment failed" })).toHaveClass(
			"top-1/2",
			"-translate-y-1/2",
		);
		await user.click(screen.getByRole("button", { name: "Show 2 more alerts" }));
		// list placement: the Alert default top offset stands
		expect(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		).not.toHaveClass("top-1/2");
	});

	test("throws when composed outside an item's children", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() =>
				render(
					<AlertCenter.Root>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</AlertCenter.Root>,
				),
			).toThrow(
				"AlertCenter.DismissIconButton must be composed inside an <AlertCenter.Item>'s children.",
			);
		} finally {
			consoleError.mockRestore();
		}
	});
});

describe("AlertCenter.Content", () => {
	test("expands the additional alerts inline and collapses them again", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);
		await user.click(screen.getByRole("button", { name: "Show 2 more alerts" }));

		const content = screen.getByTestId("content");
		expect(content).toHaveAttribute("data-slot", "alert-center-content");
		expect(content).toHaveAttribute("data-state", "open");
		const rows = content.querySelectorAll('[data-slot="alert-center-item"]');
		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expect(row).toHaveAttribute("data-placement", "list");
		}
		expect(screen.getByRole("list", { name: "More alerts" })).toBeInTheDocument();

		// ranked order: the two remaining alerts, warning before info
		expect([...rows].map((row) => row.getAttribute("data-alert-id"))).toEqual([
			"transfer",
			"region",
		]);
		expect(screen.getByRole("link", { name: "Upgrade" })).toHaveAttribute(
			"href",
			"/billing/choose-a-plan",
		);

		await user.click(screen.getByRole("button", { name: "Collapse additional alerts" }));
		// Collapsing runs an exit animation, so the content stays mounted (hidden)
		// rather than unmounting — its data-state flips to "closed".
		expect(screen.getByTestId("content")).toHaveAttribute("data-state", "closed");
	});

	test("does not render inline content when there are no additional alerts", () => {
		render(
			<AlertCenter.Root open>
				<AlertCenter.Content data-testid="content" />
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);
		expect(screen.queryByTestId("content")).not.toBeInTheDocument();
	});

	test("dismissing a row removes it and updates the count and announcement", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);
		await user.click(screen.getByRole("button", { name: "Show 2 more alerts" }));
		await user.click(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		);

		expect(screen.getByRole("button", { name: "Collapse additional alerts" })).toHaveTextContent(
			"+1",
		);
		expect(screen.getByRole("status")).toHaveTextContent("Payment failed, and 1 more alert");
	});

	test("redirects keyboard focus to the next row's dismiss control when a focused row is dismissed", async () => {
		const user = userEvent.setup();
		render(<ThreeAlertHarness />);
		await user.click(screen.getByRole("button", { name: "Show 2 more alerts" }));

		// dismissing the focused row removes its button with no blur — focus is
		// steered to the remaining row's dismiss control instead of <body>
		await user.click(
			screen.getByRole("button", { name: "Dismiss Approaching your data transfer limit" }),
		);
		expect(screen.getByRole("button", { name: "Dismiss New region available" })).toHaveFocus();
	});

	test("chains consumer onFocus/onBlur with the internal focus tracking", async () => {
		// Regression: the internal focus-tracking handlers were assigned after
		// the props spread, silently dropping consumer-passed onFocus/onBlur.
		const user = userEvent.setup();
		const onFocus = vi.fn<() => void>();
		const onBlur = vi.fn<() => void>();
		render(
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content onFocus={onFocus} onBlur={onBlur} />
				<AlertCenter.Item id="payment" intent="danger">
					<AlertBody title="Payment failed" />
				</AlertCenter.Item>
				<AlertCenter.Item id="region" intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>New region available</Alert.Title>
						<AlertCenter.DismissIconButton onClick={() => {}} />
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>,
		);

		// focus enters the expansion → the consumer's onFocus fires
		screen.getByRole("button", { name: "Dismiss New region available" }).focus();
		expect(onFocus).toHaveBeenCalled();

		// focus leaves for the bar's expand control → the consumer's onBlur fires
		// and the internal tracking still works alongside it
		await user.click(screen.getByRole("button", { name: "Collapse additional alerts" }));
		expect(onBlur).toHaveBeenCalled();
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});
