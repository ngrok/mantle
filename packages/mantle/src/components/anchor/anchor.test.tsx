import { BookIcon } from "@phosphor-icons/react/Book";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Anchor, resolveRel } from "./anchor.js";

describe("Anchor", () => {
	test(`wraps children in a span carrying data-slot="anchor-label"`, () => {
		render(<Anchor href="https://ngrok.com/">ngrok.com</Anchor>);

		const label = screen.getByRole("link").querySelector("[data-slot='anchor-label']");
		// Why tagName: the JSDoc documents the label slot as a <span>, so the element is API.
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

	test("a consumer className wins over the default link color", () => {
		// tailwind-merge override contract: the consumer's utility replaces the
		// conflicting default instead of sitting next to it.
		render(
			<Anchor href="#yolo" className="text-red-500">
				click me
			</Anchor>,
		);
		const link = screen.getByRole("link");
		expect(Array.from(link.classList).filter((name) => name.startsWith("text-"))).toEqual([
			"text-red-500",
		]);
	});

	describe("icon placement", () => {
		test("renders the icon before the label by default", () => {
			render(
				<Anchor href="#yolo" icon={<svg data-testid="icon" />}>
					ngrok docs
				</Anchor>,
			);
			const link = screen.getByRole("link");
			// Why DOM order: placement has no data attribute, so order is the only observable.
			expect(link.firstChild).toBe(screen.getByTestId("icon"));
			expect(link).toHaveTextContent("ngrok docs");
		});

		test(`renders the icon after the label when iconPlacement="end"`, () => {
			render(
				<Anchor href="#yolo" icon={<svg data-testid="icon" />} iconPlacement="end">
					ngrok docs
				</Anchor>,
			);
			const link = screen.getByRole("link");
			expect(link.lastChild).toBe(screen.getByTestId("icon"));
			expect(link.firstChild).not.toBe(screen.getByTestId("icon"));
		});

		test("renders no icon element when `icon` is omitted", () => {
			render(<Anchor href="#yolo">ngrok docs</Anchor>);
			expect(screen.getByRole("link").querySelector("svg")).toBeNull();
		});
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

		test("an explicit array rel reaches an asChild anchor", () => {
			render(
				<Anchor asChild rel={["noreferrer", "noopener"]}>
					<a href="https://ngrok.com/">ngrok.com</a>
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("asChild", () => {
		test("renders the child with its own props, className, and the anchor data-slot", () => {
			render(
				<Anchor asChild className="text-red-500">
					{/* A plain anchor stands in for a router `<Link>`; `data-discover` is the prop it would own. */}
					<a href="/dashboard" data-discover="true" className="underline">
						Open dashboard
					</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			expect(link).toHaveAttribute("href", "/dashboard");
			expect(link).toHaveAttribute("data-discover", "true");
			expect(link).toHaveAttribute("data-slot", "anchor");
			// tailwind-merge override contract: the child's class survives the merge and
			// the consumer's color replaces the default.
			expect(link).toHaveClass("underline");
			expect(Array.from(link.classList).filter((name) => name.startsWith("text-"))).toEqual([
				"text-red-500",
			]);
		});

		test("injects the icon before the child's label by default", () => {
			render(
				<Anchor asChild icon={<svg data-testid="icon" />}>
					<a href="/dashboard">Open dashboard</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			expect(link.firstChild).toBe(screen.getByTestId("icon"));
			expect(link).toHaveTextContent("Open dashboard");
		});

		test(`injects the icon after the child's label when iconPlacement="end"`, () => {
			render(
				<Anchor asChild icon={<svg data-testid="icon" />} iconPlacement="end">
					<a href="/dashboard">Open dashboard</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			expect(link.lastChild).toBe(screen.getByTestId("icon"));
			expect(link).toHaveTextContent("Open dashboard");
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
	});

	test("trims a single rel", () => {
		expect(resolveRel("  noopener\n")).toBe("noopener");
	});

	test("given multiple rels, returns a space-separated string of unique rels", () => {
		expect(resolveRel(["noopener", "noreferrer", "noopener"])).toBe("noopener noreferrer");
	});

	test("sorts rels", () => {
		expect(resolveRel(["noreferrer", "noopener", "alternate"])).toBe(
			"alternate noopener noreferrer",
		);
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
