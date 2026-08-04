import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Badge } from "./badge.js";

describe("Badge", () => {
	test(`wraps children in a span carrying data-slot="badge-label"`, () => {
		render(
			<Badge appearance="muted" color="success">
				Succeeded
			</Badge>,
		);

		const badge = screen.getByText("Succeeded", { selector: "[data-slot='badge-label']" });
		expect(badge.tagName).toBe("SPAN");
		expect(badge.closest("[data-slot='badge']")).toBeInTheDocument();
	});

	test("lays out the label slot as contents so it adds no box of its own", () => {
		render(
			<Badge appearance="muted" color="success">
				Succeeded
			</Badge>,
		);

		// The class is the only observable form of this contract: the slot generates
		// no box, so every child stays a flex item of the badge and the badge's `gap`
		// still falls between them. See decisions/2026-08-04-translation-safe-label-wrappers.md.
		expect(screen.getByText("Succeeded", { selector: "[data-slot='badge-label']" })).toHaveClass(
			"contents",
		);
	});

	describe("on a browser-translated page", () => {
		test("keeps rendering when an `icon` appears", () => {
			const { rerender } = render(
				<Badge appearance="muted" color="success" data-testid="badge">
					Succeeded
				</Badge>,
			);
			translateTextNodes(screen.getByTestId("badge"));

			rerender(
				<Badge appearance="muted" color="success" data-testid="badge" icon={<CheckCircleIcon />}>
					Succeeded
				</Badge>,
			);

			const badge = screen.getByTestId("badge");
			expect(badge).toHaveTextContent("[Succeeded-es]");
			expect(badge.querySelector("svg")).toBeInTheDocument();
		});

		test("keeps rendering when an `icon` appears with `asChild`", () => {
			const { rerender } = render(
				<Badge appearance="muted" color="info" asChild>
					<a href="/status">Operational</a>
				</Badge>,
			);
			translateTextNodes(screen.getByRole("link"));

			rerender(
				<Badge appearance="muted" color="info" asChild icon={<CheckCircleIcon />}>
					<a href="/status">Operational</a>
				</Badge>,
			);

			const badge = screen.getByRole("link");
			expect(badge).toHaveTextContent("[Operational-es]");
			expect(badge.querySelector("svg")).toBeInTheDocument();
		});
	});
});
