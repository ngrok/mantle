import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { DescriptionList } from "./description-list.js";

describe("DescriptionList.Root", () => {
	test("renders a dl element with data-slot", () => {
		render(
			<DescriptionList.Root data-testid="dl">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		expect(dl.tagName).toBe("DL");
		expect(dl).toHaveAttribute("data-slot", "description-list");
	});

	test("stripes rows with a selector that requires items to be direct children", () => {
		render(
			<DescriptionList.Root data-testid="dl">
				{["Name", "ID", "Created"].map((label) => (
					<DescriptionList.Item data-testid="item" key={label}>
						<DescriptionList.Label>{label}</DescriptionList.Label>
						<DescriptionList.Value>{label.toLowerCase()}</DescriptionList.Value>
					</DescriptionList.Item>
				))}
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		// Row striping is a `[&>*:nth-child(odd)]` selector emitted by Root, so it
		// only matches while every Item renders as a direct element child of the
		// <dl>. Both halves of that pair are asserted together — the selector's
		// spelling, and the DOM shape it depends on.
		expect(dl.className).toContain("[&>*:nth-child(odd)]:bg-neutral-500/5");
		const items = screen.getAllByTestId("item");
		expect(items).toHaveLength(3);
		for (const item of items) {
			expect(item.parentElement).toBe(dl);
		}
	});

	test("lets a custom className override the conflicting default radius", () => {
		render(
			<DescriptionList.Root className="custom-class rounded-none" data-testid="dl">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		expect(dl).toHaveClass("custom-class", "rounded-none");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(dl).not.toHaveClass("rounded-lg");
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<DescriptionList.Root asChild>
				<section data-testid="dl">content</section>
			</DescriptionList.Root>,
		);
		const root = screen.getByTestId("dl");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "description-list");
		expect(root).toHaveTextContent("content");
	});

	test("forwards refs and arbitrary props", () => {
		const ref = createRef<HTMLDListElement>();
		render(
			<DescriptionList.Root data-testid="dl" id="resource-metadata" ref={ref}>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		expect(dl).toHaveAttribute("id", "resource-metadata");
		expect(ref.current).toBe(dl);
	});
});

describe("DescriptionList.Item", () => {
	test("renders a div element with data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item data-testid="item">
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const item = screen.getByTestId("item");
		expect(item.tagName).toBe("DIV");
		expect(item).toHaveAttribute("data-slot", "description-list-item");
	});

	test("lets a custom className override the conflicting default alignment", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item className="custom-class items-start" data-testid="item">
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const item = screen.getByTestId("item");
		expect(item).toHaveClass("custom-class", "items-start");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(item).not.toHaveClass("items-center");
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item asChild>
					<a href="/keys/1" data-testid="item">
						row
					</a>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const item = screen.getByRole("link", { name: "row" });
		expect(item).toBe(screen.getByTestId("item"));
		expect(item).toHaveAttribute("data-slot", "description-list-item");
	});

	test("forwards refs and arbitrary props", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<DescriptionList.Root>
				<DescriptionList.Item data-testid="item" data-row="name" ref={ref}>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const item = screen.getByTestId("item");
		expect(item).toHaveAttribute("data-row", "name");
		expect(ref.current).toBe(item);
	});
});

describe("DescriptionList.Label", () => {
	test("renders a dt element with data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label data-testid="label">Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		expect(dt.tagName).toBe("DT");
		expect(dt).toHaveAttribute("data-slot", "description-list-label");
		expect(dt).toHaveTextContent("Name");
	});

	test("merges a custom className, overriding the conflicting default weight", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label className="font-bold" data-testid="label">
						Name
					</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		expect(dt).toHaveClass("font-bold");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(dt).not.toHaveClass("font-medium");
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label asChild>
						<span data-testid="label">Name</span>
					</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const label = screen.getByTestId("label");
		expect(label.tagName).toBe("SPAN");
		expect(label).toHaveAttribute("data-slot", "description-list-label");
	});

	test("forwards refs and arbitrary props", () => {
		const ref = createRef<HTMLElement>();
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label data-testid="label" id="name-label" ref={ref}>
						Name
					</DescriptionList.Label>
					<DescriptionList.Value aria-labelledby="name-label">foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		expect(dt).toHaveAttribute("id", "name-label");
		expect(ref.current).toBe(dt);
	});
});

describe("DescriptionList.Value", () => {
	test("renders a dd element with data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value data-testid="value">foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd.tagName).toBe("DD");
		expect(dd).toHaveAttribute("data-slot", "description-list-value");
		expect(dd).toHaveTextContent("foo");
	});

	test("lets a custom className override the conflicting default padding", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					{/* custom-class is deliberately NOT one of Value's own defaults (e.g.
					    font-mono), which would keep this assertion true even if the
					    incoming className were dropped entirely */}
					<DescriptionList.Value className="custom-class px-0" data-testid="value">
						foo
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd).toHaveClass("custom-class", "px-0");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(dd).not.toHaveClass("px-3");
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value asChild>
						<code data-testid="value">my-api-key</code>
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const value = screen.getByTestId("value");
		expect(value.tagName).toBe("CODE");
		expect(value).toHaveAttribute("data-slot", "description-list-value");
		expect(value).toHaveTextContent("my-api-key");
	});

	test("forwards refs and arbitrary props", () => {
		const ref = createRef<HTMLElement>();
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value data-testid="value" data-copyable="" ref={ref}>
						foo
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd).toHaveAttribute("data-copyable");
		expect(ref.current).toBe(dd);
	});
});
