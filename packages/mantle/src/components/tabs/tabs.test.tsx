import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Tabs } from "./tabs.js";

describe("Tabs", () => {
	describe("List", () => {
		// scroll-fade-x lives on the shared horizontal-orientation variant, so both
		// appearances inherit it. This guards against a regression that would scope
		// the overflow handling to only the classic appearance.
		test.each(["classic", "pill"] as const)(
			"horizontal %s appearance scrolls on overflow with scroll-fade-x",
			(appearance) => {
				render(
					<Tabs.Root appearance={appearance} orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
							<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				expect(screen.getByRole("tablist")).toHaveClass(
					"scroll-fade-x",
					"overflow-x-auto",
					"min-w-0",
				);
			},
		);

		// The bottom border is opt-in composition: the classic list carries the
		// border paint gated behind a CSS :has([data-slot=tabs-list-border]) check
		// (painted as a content-box background in the separator color, overridable
		// via --tabs-list-border-color), and Tabs.ListBorder renders the marker
		// that activates it. The list hugs its triggers (w-fit) so the border
		// terminates at the last trigger instead of running the full container.
		test("horizontal classic appearance carries the :has()-gated border paint and hugs the triggers", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.ListBorder />
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).toHaveClass(
				"has-data-[slot=tabs-list-border]:bg-origin-content",
				"has-data-[slot=tabs-list-border]:pb-px",
				"w-fit",
				"max-w-full",
			);
		});

		test("Tabs.ListBorder renders an inert, hidden marker inside the tablist", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.ListBorder />
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const marker = screen.getByRole("tablist").querySelector('[data-slot="tabs-list-border"]');
			expect(marker).toBeInTheDocument();
			expect(marker).toHaveAttribute("aria-hidden");
			expect(marker).toHaveAttribute("hidden");
		});

		test("horizontal pill appearance does not carry the border paint", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.ListBorder />
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).not.toHaveClass(
				"has-data-[slot=tabs-list-border]:bg-origin-content",
			);
		});

		test("vertical classic appearance draws the side rule with the separator token", () => {
			render(
				<Tabs.Root appearance="classic" orientation="vertical" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).toHaveClass("border-r", "border-separator");
		});
	});
});
