"use client";

import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, onTestFinished, test } from "vitest";
import { commands, server } from "vitest/browser";
import * as Alert from "../alert/alert-parts.js";
import * as AlertCenter from "./alert-center-parts.js";

/**
 * These exercise the real-browser half of stable-host projection:
 * `Element.moveBefore`, the state-preserving move `adoptHost` prefers. happy-dom
 * does not implement it at all, so the unit project only ever runs the
 * `appendChild` fallback. Every branch around the call (the connectivity guard,
 * the insertion reference, and the `catch` that recovers when the spec forbids
 * the move, e.g. for a host that has no parent yet) is unreachable there.
 */
describe("AlertCenter host projection (browser)", () => {
	/**
	 * A control and a scrollable region live in the only alert, so in the bar.
	 * Raising a danger alert from that control demotes its own item into the
	 * expansion. `Content` precedes `Bar`, so its layout effect adopts the demoted
	 * host while the bar still holds it: both nodes are connected, the one shape
	 * `moveBefore` accepts. A promotion cannot reach it: the row that held the
	 * host unmounts in the same commit, so the host is detached by the time the
	 * bar adopts it.
	 */
	function DemotionHarness() {
		const [showPayment, setShowPayment] = useState(false);

		return (
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Content />
				<AlertCenter.Bar />
				{showPayment && (
					<AlertCenter.Item id="payment" intent="danger">
						<Alert.Icon />
						<Alert.Content>
							<Alert.Title>Payment failed</Alert.Title>
						</Alert.Content>
					</AlertCenter.Item>
				)}
				<AlertCenter.Item id="tip" intent="info">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Usage tip</Alert.Title>
						<Alert.Description>
							<button type="button" onClick={() => setShowPayment(true)}>
								flag payment
							</button>
							{/* Browser tests load no stylesheet, so the scrollport is inline. */}
							<div
								role="region"
								aria-label="Release notes"
								style={{ height: 20, overflow: "auto" }}
							>
								<div style={{ height: 200 }}>Every change since the last visit.</div>
							</div>
						</Alert.Description>
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>
		);
	}

	// Why not WebKit: Safari has no `Element.moveBefore`, so its demotion takes the
	// `appendChild` fallback, which drops the scroll offset by design.
	test.skipIf(server.browser === "webkit")(
		"demoting an alert moves its host in place, so a scrolled region inside it keeps its offset",
		async () => {
			const user = userEvent.setup();
			// the branch under test only exists here: assert the API is present so
			// this file can never silently degrade into the fallback path
			expect("moveBefore" in Element.prototype).toBe(true);
			render(<DemotionHarness />);

			// the first adoption of each host happens while it is still parentless,
			// which `moveBefore` is spec'd to reject. The placement below only holds
			// because `adoptHost` recovers from that.
			const flag = screen.getByRole("button", { name: "flag payment" });
			expect(flag.closest("[data-placement]")).toHaveAttribute("data-placement", "bar");
			const notes = screen.getByRole("region", { name: "Release notes" });
			notes.scrollTop = 50;
			expect(notes.scrollTop).toBe(50);

			await user.click(flag);

			// the tip demoted into a row, carrying the very same elements
			await waitFor(() => {
				expect(flag.closest("[data-placement]")).toHaveAttribute("data-placement", "list");
			});
			expect(document.querySelector('[data-slot~="alert-center-bar"]')).toHaveAttribute(
				"data-alert-id",
				"payment",
			);
			// The scroll offset lives on the layout box. The `appendChild` fallback
			// drops the box with the removal, so the region comes back at 0 and no
			// focus redirect can restore it; the move keeps the box.
			expect(notes.scrollTop).toBe(50);
			expect(flag).toHaveFocus();
		},
	);
});

describe("AlertCenter server render (browser)", () => {
	/**
	 * The dashboard shape: the items exist during SSR and follow the bar in the
	 * same parent. The warning comes first, so the server copy must rank, not
	 * take authored order. StrictMode double-renders each item, which must not
	 * change its claim. The bar's `style` must reach the server copy.
	 */
	function Page() {
		return (
			<StrictMode>
				<AlertCenter.Root>
					<div className="flex flex-col">
						<AlertCenter.Bar style={{ minHeight: 160 }} />
						<AlertCenter.Content />
						<AlertCenter.Item id="transfer" intent="warning">
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>Transfer limit</Alert.Title>
							</Alert.Content>
						</AlertCenter.Item>
						<AlertCenter.Item id="payment" intent="danger">
							<Alert.Icon />
							<Alert.Content>
								<Alert.Title>Payment failed</Alert.Title>
								<Alert.Description>Update your card.</Alert.Description>
							</Alert.Content>
						</AlertCenter.Item>
					</div>
					<main>Page content</main>
				</AlertCenter.Root>
			</StrictMode>
		);
	}

	test("hydration hands the server copy of the bar to the client bar without moving the page", async () => {
		// Why the compiled CSS: the browser project loads no stylesheet, and the
		// copy's visibility and the bar's enter animation are both utilities.
		const style = document.createElement("style");
		style.textContent = [
			"*, ::before, ::after { box-sizing: border-box; }",
			await commands.tailwindCss("./alert-center.tsx"),
			await commands.tailwindCss("../alert/alert.tsx"),
		].join("\n");
		document.head.append(style);
		const container = document.createElement("div");
		container.innerHTML = renderToString(<Page />);
		document.body.append(container);
		onTestFinished(() => {
			container.remove();
			style.remove();
		});

		// before hydration: only the top alert shows, and it already pushes the page down
		expect(screen.getByText("Payment failed")).toBeVisible();
		expect(screen.getByText("Transfer limit")).not.toBeVisible();
		const main = screen.getByRole("main");
		const serverTop = main.getBoundingClientRect().top;
		expect(serverTop).toBeGreaterThanOrEqual(160);
		// the room for the client bar's expand control, so no line wraps at hydration
		const contentPadding = () =>
			getComputedStyle(
				screen.getByText("Payment failed").closest('[data-slot~="alert-content"]') ?? document.body,
			).paddingRight;
		const serverPadding = contentPadding();

		const errors: unknown[] = [];
		const root = await act(async () =>
			hydrateRoot(container, <Page />, { onRecoverableError: (error) => errors.push(error) }),
		);
		onTestFinished(() => act(() => root.unmount()));

		expect(errors).toEqual([]);
		expect(container.querySelector('[data-slot="alert-center-server-bar"]')).toBeNull();
		expect(screen.getByRole("button", { name: /1 more/ })).toBeVisible();
		expect(contentPadding()).toBe(serverPadding);
		expect(document.querySelector('[data-slot~="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"payment",
		);
		// Sample each frame until the bar's enter transition ends: an enter from
		// zero height would pull the page up, then push it back down.
		do {
			expect(main.getBoundingClientRect().top).toBe(serverTop);
			await new Promise((resolve) => {
				requestAnimationFrame(resolve);
			});
		} while (document.getAnimations().some((animation) => animation.playState === "running"));
		expect(main.getBoundingClientRect().top).toBe(serverTop);
	});
});
