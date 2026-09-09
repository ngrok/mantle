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

	test("renders the icon aria-hidden, so the link text alone names the link", () => {
		render(
			<Anchor href="https://ngrok.com/docs" icon={<BookIcon />}>
				ngrok docs
			</Anchor>,
		);

		const link = screen.getByRole("link", { name: "ngrok docs" });
		expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	describe("rel", () => {
		test(`defaults to "noopener noreferrer" when target="_blank" and rel is omitted`, () => {
			render(
				<Anchor href="https://ngrok.com/" target="_blank">
					ngrok.com
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
		});

		test("renders no rel when target is not _blank and rel is omitted", () => {
			render(<Anchor href="https://ngrok.com/">ngrok.com</Anchor>);
			expect(screen.getByRole("link")).not.toHaveAttribute("rel");
		});

		test(`uses the rel you pass as-is, even with target="_blank"`, () => {
			render(
				<Anchor href="https://ngrok.com/" target="_blank" rel="nofollow">
					ngrok.com
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "nofollow");
		});

		test("resolves an array rel onto the element", () => {
			render(
				<Anchor href="https://ngrok.com/" rel={["noreferrer", "noopener"]}>
					ngrok.com
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
		});

		test(`the default reaches an asChild anchor with target="_blank"`, () => {
			render(
				<Anchor asChild>
					{/* oxlint-disable-next-line react/jsx-no-target-blank -- Anchor supplies the rel; this test pins that default */}
					<a href="https://ngrok.com/" target="_blank">
						ngrok.com
					</a>
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
		});
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

	test("joins an incoming data-slot chain ahead of its own slot name", () => {
		render(
			<Anchor data-slot="skip-to-main-link" href="#main">
				Skip
			</Anchor>,
		);
		expect(screen.getByRole("link", { name: "Skip" })).toHaveAttribute(
			"data-slot",
			"skip-to-main-link anchor",
		);
	});
});
