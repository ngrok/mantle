import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Avatar } from "./avatar.js";

/**
 * Radix decides whether `Avatar.Image` may render by preloading the `src`
 * through `new window.Image()` and reading `complete` / `naturalWidth` — happy-dom
 * fetches nothing, so without a stand-in every image stays `"loading"` forever
 * and only the fallback is ever reachable. This stubs that one constructor with a
 * probe that reports the outcome under test, synchronously.
 */
function stubImageLoading(outcome: "loaded" | "error") {
	class ProbeImage {
		complete = true;
		naturalWidth = outcome === "loaded" ? 128 : 0;
		crossOrigin: string | null = null;
		referrerPolicy = "";
		src = "";
		addEventListener() {}
		removeEventListener() {}
	}
	vi.stubGlobal("Image", ProbeImage);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("Avatar.Root", () => {
	test("renders the documented composition, showing the fallback until an image loads", () => {
		render(
			<Avatar.Root appearance="square" colorSeed="acc_123">
				<Avatar.Image src="https://example.com/acme.png" alt="" />
				<Avatar.Fallback name="Acme Corp" />
			</Avatar.Root>,
		);
		expect(screen.getByText("AC")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	test("is a fixed-size, unsqueezable circle by default", () => {
		// shrink-0 is load-bearing: an avatar is a fixed-size visual and the flex
		// rows it sits in must not be able to compress it.
		render(<Avatar.Root data-testid="avatar" />);
		expect(screen.getByTestId("avatar")).toHaveClass("size-7", "shrink-0", "rounded-full");
	});

	test("appearance=square renders a rounded square", () => {
		render(<Avatar.Root appearance="square" data-testid="avatar" />);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).toHaveClass("rounded-md");
		expect(avatar).not.toHaveClass("rounded-full");
	});

	test("colorSeed paints a swatch and the static foreground that stays legible on it", () => {
		render(<Avatar.Root colorSeed="acc_123" data-testid="avatar" />);
		const avatar = screen.getByTestId("avatar");
		// Pinned on purpose: the palette order is what makes a seed's color stable,
		// so reordering it — which would recolor every account on screen — fails here.
		expect(avatar).toHaveClass("bg-orange-500", "text-static-white");
	});

	test("the same seed always resolves to the same swatch, and different seeds spread", () => {
		render(
			<>
				<Avatar.Root colorSeed="acc_acme" data-testid="first" />
				<Avatar.Root colorSeed="acc_acme" data-testid="second" />
				<Avatar.Root colorSeed="acc_atlas" data-testid="third" />
			</>,
		);
		expect(screen.getByTestId("first")).toHaveClass("bg-emerald-500");
		expect(screen.getByTestId("second")).toHaveClass("bg-emerald-500");
		expect(screen.getByTestId("third")).toHaveClass("bg-purple-500");
	});

	test("a seeded swatch survives server rendering unchanged", () => {
		// The hash has to agree across the SSR boundary or the avatar changes color
		// on hydration.
		const html = renderToString(<Avatar.Root colorSeed="acc_atlas" />);
		expect(html).toContain("bg-purple-500");
	});

	test("without a seed it stays neutral and keeps the surrounding foreground", () => {
		render(<Avatar.Root data-testid="avatar" />);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).toHaveClass("bg-neutral-500/15", "text-body");
		expect(avatar).not.toHaveClass("text-static-white");
	});

	test("forwards className, data-*, and the ref, and the consumer's size wins", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Avatar.Root className="size-10" data-flavor="primary" data-testid="avatar" ref={ref} />,
		);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).toHaveClass("size-10");
		expect(avatar).not.toHaveClass("size-7");
		expect(avatar).toHaveAttribute("data-flavor", "primary");
		expect(avatar).toHaveAttribute("data-slot", "avatar");
		expect(ref.current).toBe(avatar);
	});

	test("joins an ancestor-forwarded data-slot chain ahead of its own", () => {
		render(<Avatar.Root data-slot="outer" data-testid="avatar" />);
		expect(screen.getByTestId("avatar")).toHaveAttribute("data-slot", "outer avatar");
	});

	test("asChild renders the consumer element with the avatar styles, data-slot, and ref", () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<Avatar.Root asChild appearance="square" colorSeed="acc_acme" ref={ref}>
				<a className="custom-class" data-flavor="primary" href="/accounts/acme">
					<Avatar.Fallback name="Acme Corp" />
				</a>
			</Avatar.Root>,
		);
		const link = screen.getByRole("link");
		expect(link).toHaveClass("custom-class", "shrink-0", "rounded-md", "bg-emerald-500");
		expect(link).toHaveAttribute("data-slot", "avatar");
		expect(link).toHaveAttribute("data-flavor", "primary");
		expect(ref.current).toBe(link);
	});
});

describe("Avatar.Fallback", () => {
	test.for([
		{ expected: "AC", name: "Acme Corp" },
		{ expected: "J", name: "jane" },
		// the first two words, not first-and-last: a middle initial takes the second slot
		{ expected: "JQ", name: "Jane Q. Doe" },
		{ expected: "AC", name: "  acme   corp  " },
		{ expected: "AI", name: "Atlas Industries, Inc." },
		{ expected: "?", name: "" },
		{ expected: "?", name: "   " },
		{ expected: "?", name: "!@#$%" },
		{ expected: "I", name: "ipek" },
		{ expected: "🚀A", name: "🚀 Acme" },
		{ expected: "ÉC", name: "école centrale" },
	])("name=$name renders the initials $expected", ({ expected, name }) => {
		render(
			<Avatar.Root>
				<Avatar.Fallback name={name} />
			</Avatar.Root>,
		);
		expect(screen.getByText(expected)).toBeInTheDocument();
	});

	test("derived initials are decorative, so a row's accessible name is not doubled", () => {
		// The name they abbreviate is already in the DOM beside the avatar; without
		// this a menu row reads "A C Acme Corp".
		render(
			<Avatar.Root>
				<Avatar.Fallback data-testid="fallback" name="Acme Corp" />
			</Avatar.Root>,
		);
		expect(screen.getByTestId("fallback")).toHaveAttribute("aria-hidden", "true");
	});

	test("children are announced, and an explicit aria-hidden still wins", () => {
		render(
			<Avatar.Root>
				<Avatar.Fallback data-testid="children">AC</Avatar.Fallback>
				<Avatar.Root>
					<Avatar.Fallback aria-hidden={false} data-testid="override" name="Acme Corp" />
				</Avatar.Root>
			</Avatar.Root>,
		);
		expect(screen.getByTestId("children")).not.toHaveAttribute("aria-hidden");
		expect(screen.getByTestId("override")).toHaveAttribute("aria-hidden", "false");
	});

	test("children render instead of derived initials", () => {
		render(
			<Avatar.Root>
				<Avatar.Fallback>
					<svg aria-hidden="true" data-testid="silhouette" />
				</Avatar.Fallback>
			</Avatar.Root>,
		);
		expect(screen.getByTestId("silhouette")).toBeInTheDocument();
	});

	test("throws when rendered outside Avatar.Root", () => {
		// Radix owns the context that decides whether a fallback may render, so it
		// fails loudly rather than rendering an avatar that can never show anything.
		expect(() => render(<Avatar.Fallback name="Acme Corp" />)).toThrow(
			/must be used within `Avatar`/,
		);
	});

	test("forwards className, data-*, and the ref, and joins the data-slot chain", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Avatar.Root>
				<Avatar.Fallback
					className="custom-class"
					data-flavor="primary"
					data-slot="outer"
					data-testid="fallback"
					name="Acme Corp"
					ref={ref}
				/>
			</Avatar.Root>,
		);
		const fallback = screen.getByTestId("fallback");
		expect(fallback).toHaveClass("custom-class", "size-full");
		expect(fallback).toHaveAttribute("data-flavor", "primary");
		expect(fallback).toHaveAttribute("data-slot", "outer avatar-fallback");
		expect(ref.current).toBe(fallback);
	});

	test("asChild renders the consumer element with the fallback styles and ref", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Avatar.Root>
				<Avatar.Fallback asChild ref={ref}>
					<abbr className="custom-class" data-flavor="primary" title="Acme Corp">
						AC
					</abbr>
				</Avatar.Fallback>
			</Avatar.Root>,
		);
		const abbreviation = screen.getByTitle("Acme Corp");
		expect(abbreviation).toHaveClass("custom-class", "items-center");
		expect(abbreviation).toHaveAttribute("data-flavor", "primary");
		expect(abbreviation).toHaveAttribute("data-slot", "avatar-fallback");
		expect(ref.current).toBe(abbreviation);
	});

	test("requires exactly one source of content at the type level", () => {
		// Two sources would leave the winner to precedence, and no source would
		// render an empty avatar; both are compile errors rather than surprises.
		const withBoth = (
			// @ts-expect-error -- name and children are mutually exclusive
			<Avatar.Fallback name="Acme Corp">AC</Avatar.Fallback>
		);
		const withNeither = (
			// @ts-expect-error -- one of name or children is required
			<Avatar.Fallback />
		);
		expect(withBoth).toBeTruthy();
		expect(withNeither).toBeTruthy();
	});
});

describe("Avatar.Image", () => {
	test("renders the picture once it has loaded, and drops the fallback", () => {
		stubImageLoading("loaded");
		render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/jane.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		const image = screen.getByRole("img", { name: "Jane Doe" });
		expect(image).toHaveAttribute("src", "https://example.com/jane.png");
		expect(image).toHaveClass("size-full", "object-cover");
		expect(image).toHaveAttribute("data-slot", "avatar-image");
		expect(screen.queryByText("JD")).not.toBeInTheDocument();
	});

	test("a failed image shows the fallback rather than a broken-image icon", () => {
		stubImageLoading("error");
		render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/missing.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("forwards className, data-*, and the ref, and joins the data-slot chain", () => {
		stubImageLoading("loaded");
		const ref = createRef<HTMLImageElement>();
		render(
			<Avatar.Root>
				<Avatar.Image
					alt="Jane Doe"
					className="custom-class"
					data-flavor="primary"
					data-slot="outer"
					ref={ref}
					src="https://example.com/jane.png"
				/>
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		const image = screen.getByRole("img", { name: "Jane Doe" });
		expect(image).toHaveClass("custom-class", "object-cover");
		expect(image).toHaveAttribute("data-flavor", "primary");
		expect(image).toHaveAttribute("data-slot", "outer avatar-image");
		expect(ref.current).toBe(image);
	});

	test("does not render during server rendering, so the fallback is the first paint", () => {
		// Loading status is only knowable in a browser, so SSR markup can only carry
		// the fallback — documented on the part, and asserted here so it stays true.
		const html = renderToString(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/jane.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		expect(html).not.toContain("<img");
		expect(html).toContain("JD");
	});
});
