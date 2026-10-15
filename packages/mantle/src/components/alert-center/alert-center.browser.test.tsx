"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { Alert } from "../alert/alert.js";
import { AlertCenter } from "./alert-center.js";

/**
 * These exercise the real-browser half of stable-host projection:
 * `Element.moveBefore`, the state-preserving move `adoptHost` prefers. happy-dom
 * does not implement it at all, so the unit project only ever runs the
 * `appendChild` fallback — every branch around the call (the connectivity guard,
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

	test("demoting an alert moves its host in place, so a scrolled region inside it keeps its offset", async () => {
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
	});
});
