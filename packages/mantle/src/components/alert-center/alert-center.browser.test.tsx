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
	 * A stateful control lives inside the lower-ranked alert; resolving the top
	 * alert from that control promotes its own item into the bar, moving its host
	 * while the control is focused.
	 */
	function PromotionHarness() {
		const [showPayment, setShowPayment] = useState(true);
		const [count, setCount] = useState(0);

		return (
			<AlertCenter.Root defaultOpen>
				<AlertCenter.Bar />
				<AlertCenter.Content />
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
							<button
								type="button"
								onClick={() => {
									setCount((current) => current + 1);
									setShowPayment(false);
								}}
							>
								resolve payment ({count})
							</button>
						</Alert.Description>
					</Alert.Content>
				</AlertCenter.Item>
			</AlertCenter.Root>
		);
	}

	test("promoting an alert moves its host, keeping its children stateful and focused", async () => {
		const user = userEvent.setup();
		// the branch under test only exists here: assert the API is present so
		// this file can never silently degrade into the fallback path
		expect("moveBefore" in Element.prototype).toBe(true);
		render(<PromotionHarness />);

		// the first adoption of each host happens while it is still parentless,
		// which `moveBefore` is spec'd to reject — the placements below only hold
		// because `adoptHost` recovers from that
		const resolve = screen.getByRole("button", { name: "resolve payment (0)" });
		expect(resolve.closest("[data-placement]")).toHaveAttribute("data-placement", "list");
		expect(document.querySelector('[data-slot="alert-center-bar"]')).toHaveTextContent(
			"Payment failed",
		);

		await user.click(resolve);

		// the tip promoted into the bar, carrying the very same button element
		await waitFor(() => {
			expect(resolve.closest("[data-placement]")).toHaveAttribute("data-placement", "bar");
		});
		expect(document.querySelector('[data-slot="alert-center-bar"]')).toHaveAttribute(
			"data-alert-id",
			"tip",
		);
		// state survives the move, and the keyboard user is left on the same live
		// control rather than on <body>
		expect(resolve).toHaveTextContent("resolve payment (1)");
		expect(resolve).toHaveFocus();
	});
});
