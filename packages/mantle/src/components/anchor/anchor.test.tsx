import { BookIcon } from "@phosphor-icons/react/Book";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Anchor, resolveRel } from "./anchor.js";

describe("Anchor", () => {
	test(`wraps children in a span carrying data-slot="anchor-label"`, () => {
		render(<Anchor href="https://ngrok.com/">ngrok.com</Anchor>);

		const label = screen.getByRole("link").querySelector("[data-slot='anchor-label']");
		expect(label?.tagName).toBe("SPAN");
		expect(label).toHaveTextContent("ngrok.com");
	});

	describe("on a browser-translated page", () => {
		test("keeps rendering when a leading `icon` appears", () => {
			const { rerender } = render(<Anchor href="https://ngrok.com/docs">ngrok docs</Anchor>);
			translateTextNodes(screen.getByRole("link"));

			rerender(
				<Anchor href="https://ngrok.com/docs" icon={<BookIcon />}>
					ngrok docs
				</Anchor>,
			);

			const link = screen.getByRole("link");
			expect(link).toHaveTextContent("[ngrok docs-es]");
			expect(link.querySelector("svg")).toBeInTheDocument();
		});

		test("keeps rendering when a leading `icon` appears with `asChild`", () => {
			const { rerender } = render(
				<Anchor asChild>
					<a href="https://ngrok.com/docs">ngrok docs</a>
				</Anchor>,
			);
			translateTextNodes(screen.getByRole("link"));

			rerender(
				<Anchor asChild icon={<BookIcon />}>
					<a href="https://ngrok.com/docs">ngrok docs</a>
				</Anchor>,
			);

			const link = screen.getByRole("link");
			expect(link).toHaveTextContent("[ngrok docs-es]");
			expect(link.querySelector("svg")).toBeInTheDocument();
		});
	});
});

describe("resolveRel", () => {
	test("given nothing or undefined, returns undefined", () => {
		expect(resolveRel(undefined)).toBe(undefined);
		expect(resolveRel(null)).toBe(undefined);
		expect(resolveRel([])).toBe(undefined);
		expect(resolveRel("")).toBe(undefined);
	});

	test("filters out empty values", () => {
		expect(resolveRel(["noopener", undefined, null, "", "     ", "\t\r\n ", "noreferrer"])).toBe(
			"noopener noreferrer",
		);
	});

	test("given a single rel, returns that rel", () => {
		expect(resolveRel("noopener")).toBe("noopener");
		expect(resolveRel("noreferrer")).toBe("noreferrer");
	});

	test("given multiple rels, returns a space-separated string of unique rels", () => {
		expect(resolveRel(["noopener", "noreferrer"])).toBe("noopener noreferrer");
		expect(resolveRel(["noopener", "noreferrer", "noopener"])).toBe("noopener noreferrer");
	});

	test("sorts rels", () => {
		expect(resolveRel(["noreferrer", "noopener", "alternate"])).toBe(
			"alternate noopener noreferrer",
		);
	});

	test("allows custom rels", () => {
		expect(resolveRel(["noopener", "noreferrer", "custom"])).toBe("custom noopener noreferrer");
	});
});
