import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Tabs } from "./tabs.js";

describe("Tabs", () => {
	describe("Root", () => {
		// data-appearance is a public styling hook (SSR-friendly alternative to
		// reading context) — consumer CSS like [data-appearance="pill"] relies on it.
		test.each(["classic", "pill"] as const)(
			"renders data-appearance=%s for appearance-scoped styling",
			(appearance) => {
				const { container } = render(
					<Tabs.Root appearance={appearance} orientation="horizontal" defaultValue="a">
						<Tabs.List>
							<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>,
				);

				expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
					"data-appearance",
					appearance,
				);
			},
		);
	});

	describe("List", () => {
		// Every horizontal tablist scrolls on overflow with a scroll fade, but the
		// fade class differs: the bordered classic list uses the
		// scroll-fade-x-keep-bottom-border variant (so the border stays solid
		// under the fade), while pill and borderless classic use plain
		// scroll-fade-x. The variant and the plain utility must never co-exist
		// on one element — this pins exactly one being present per case.
		test("horizontal pill appearance scrolls on overflow with scroll-fade-x", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("scroll-fade-x", "overflow-x-auto", "min-w-0");
			expect(tablist).not.toHaveClass("scroll-fade-x-keep-bottom-border");
		});

		test("horizontal classic appearance scrolls on overflow with the border-preserving fade", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("scroll-fade-x-keep-bottom-border", "overflow-x-auto", "min-w-0");
			expect(tablist).not.toHaveClass("scroll-fade-x");
		});

		test("horizontal classic appearance with hideBorder scrolls on overflow with scroll-fade-x", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("scroll-fade-x", "overflow-x-auto", "min-w-0");
			expect(tablist).not.toHaveClass("scroll-fade-x-keep-bottom-border");
		});

		// The bottom border is on by default for the classic appearance, painted
		// as a content-box background in the separator color so the px-1/-mx-1
		// focus-ring breathing room doesn't push it past the container edges.
		test("horizontal classic appearance draws the bottom border by default", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveClass("bg-origin-content", "pb-px");
			expect(tablist).not.toHaveAttribute("data-hide-border");
		});

		test("hideBorder removes the border paint and renders data-hide-border", () => {
			render(
				<Tabs.Root appearance="classic" orientation="horizontal" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("bg-origin-content");
			expect(tablist).not.toHaveClass("pb-px");
			expect(tablist).toHaveAttribute("data-hide-border");
		});

		test("horizontal pill appearance never draws the bottom border", () => {
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

		// hideBorder is documented as a no-op for pill (which never draws a
		// border), but the data attribute still renders appearance-independently.
		test("hideBorder on the pill appearance is a no-op but still renders data-hide-border", () => {
			render(
				<Tabs.Root appearance="pill" orientation="horizontal" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("bg-origin-content");
			expect(tablist).not.toHaveClass("pb-px");
			expect(tablist).toHaveAttribute("data-hide-border");
		});

		test("vertical classic appearance draws the side border by default with the separator token", () => {
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

		test("hideBorder removes the vertical classic side border", () => {
			render(
				<Tabs.Root appearance="classic" orientation="vertical" defaultValue="a">
					<Tabs.List hideBorder>
						<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
						<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>,
			);

			const tablist = screen.getByRole("tablist");
			expect(tablist).not.toHaveClass("border-r");
			expect(tablist).toHaveAttribute("data-hide-border");
		});
	});
});
