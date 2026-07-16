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

		// The bottom rule belongs to the classic appearance only. It is painted as a
		// content-box background (bg-origin-content, in the 1px pb-px row) in the
		// separator color, overridable via --tabs-list-border-color, and the list
		// hugs its triggers (w-fit) so the rule terminates at the last trigger
		// instead of running the full container width.
		test("horizontal classic appearance draws a bottom rule that hugs the triggers", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).toHaveClass(
				"bg-origin-content",
				"pb-px",
				"w-fit",
				"max-w-full",
			);
		});

		test("horizontal pill appearance does not draw a bottom rule", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			expect(screen.getByRole("tablist")).not.toHaveClass("bg-origin-content");
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
