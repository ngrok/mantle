import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Avatar } from "./avatar.js";

describe("Avatar.Root", () => {
	test("renders the documented composition, with the image over the fallback", () => {
		render(
			<Avatar.Root appearance="square" colorSeed="acc_123">
				<Avatar.Image alt="" src="https://example.com/acme.png" />
				<Avatar.Fallback name="Acme Corp" />
			</Avatar.Root>,
		);
		// Both, together: the fallback is what a loading image shows through, not an
		// alternative branch the consumer picks between.
		expect(screen.getByRole("presentation")).toHaveAttribute("src", "https://example.com/acme.png");
		expect(screen.getByText("AC")).toBeInTheDocument();
	});

	test("is a fixed-size, unsqueezable circle by default", () => {
		// shrink-0 is load-bearing: an avatar is a fixed-size visual and the flex rows
		// it sits in must not be able to compress it. `relative` is what the image
		// positions against — the pair is asserted together in the Image tests below.
		render(<Avatar.Root data-testid="avatar" />);
		expect(screen.getByTestId("avatar")).toHaveClass(
			"size-7",
			"shrink-0",
			"relative",
			"rounded-full",
		);
	});

	test("renders a span, so it stays valid inside a switcher row's button", () => {
		render(
			<button type="button">
				<Avatar.Root data-testid="avatar" />
			</button>,
		);
		expect(screen.getByTestId("avatar").tagName).toBe("SPAN");
	});

	test("appearance=square renders a rounded square", () => {
		render(<Avatar.Root appearance="square" data-testid="avatar" />);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).toHaveClass("rounded-md");
		expect(avatar).not.toHaveClass("rounded-full");
	});

	test("colorSeed paints a swatch and the static foreground that stays legible on it", () => {
		render(<Avatar.Root colorSeed="acc_123" data-testid="avatar" />);
		// Pinned on purpose: the palette order is what makes a seed's color stable, so
		// reordering it — which would recolor every account on screen — fails here.
		expect(screen.getByTestId("avatar")).toHaveClass("bg-orange-500", "text-static-white");
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
		// The hash has to agree across the SSR boundary or the avatar changes color on
		// hydration.
		expect(renderToString(<Avatar.Root colorSeed="acc_atlas" />)).toContain("bg-purple-500");
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
		// A tailwind-merge override contract: the consumer's size beats the default.
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
		{ expected: "山太", name: "山田 太郎" },
		{ expected: "مع", name: "محمد علي" },
		// Uppercasing happens per word, before the code point is taken: "ß" → "SS" and
		// "ﬄ" → "FFL", so uppercasing the joined result would overrun two.
		{ expected: "SH", name: "straße hof" },
		{ expected: "FF", name: "ﬄuent ﬂow" },
		// Unicode punctuation reaches the "?" floor too, not just ASCII.
		{ expected: "?", name: "…" },
		{ expected: "?", name: "— —" },
		{ expected: "A", name: "«Acme»" },
	])("name=$name renders the initials $expected", ({ expected, name }) => {
		render(<Avatar.Fallback name={name} />);
		expect(screen.getByText(expected)).toBeInTheDocument();
	});

	test("derived initials are decorative, so a row's accessible name is not doubled", () => {
		// The name they abbreviate is already in the DOM beside the avatar; without
		// this the row reads "A C Acme Corp".
		render(
			<button type="button">
				<Avatar.Root>
					<Avatar.Fallback name="Acme Corp" />
				</Avatar.Root>
				Acme Corp
			</button>,
		);
		expect(screen.getByRole("button")).toHaveAccessibleName("Acme Corp");
	});

	test("children are announced, and an explicit aria-hidden still wins", () => {
		render(
			<>
				<Avatar.Fallback data-testid="children">AC</Avatar.Fallback>
				<Avatar.Fallback aria-hidden={false} data-testid="override" name="Acme Corp" />
			</>,
		);
		expect(screen.getByTestId("children")).not.toHaveAttribute("aria-hidden");
		expect(screen.getByTestId("override")).toHaveAttribute("aria-hidden", "false");
	});

	test("children render instead of derived initials", () => {
		render(
			<Avatar.Fallback>
				<svg aria-hidden="true" data-testid="silhouette" />
			</Avatar.Fallback>,
		);
		expect(screen.getByTestId("silhouette")).toBeInTheDocument();
	});

	test("a child that resolves to nothing renders nothing, not a stray question mark", () => {
		// `{isAdmin && <ShieldIcon />}` is the caller saying "nothing here" for
		// everyone else. Coalescing that into derived initials would answer with a bare
		// "?" — and an announced one, since only name-derived initials are hidden.
		render(<Avatar.Fallback data-testid="fallback">{null}</Avatar.Fallback>);
		const fallback = screen.getByTestId("fallback");
		expect(fallback).toBeEmptyDOMElement();
		expect(fallback).not.toHaveAttribute("aria-hidden");
	});

	test("forwards className, data-*, and the ref, and joins the data-slot chain", () => {
		const ref = createRef<HTMLSpanElement>();
		render(
			<Avatar.Fallback
				className="custom-class"
				data-flavor="primary"
				data-slot="outer"
				data-testid="fallback"
				name="Acme Corp"
				ref={ref}
			/>,
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
			<Avatar.Fallback asChild ref={ref}>
				<abbr className="custom-class" data-flavor="primary" title="Acme Corp">
					AC
				</abbr>
			</Avatar.Fallback>,
		);
		const abbreviation = screen.getByTitle("Acme Corp");
		expect(abbreviation).toHaveClass("custom-class", "items-center");
		expect(abbreviation).toHaveAttribute("data-flavor", "primary");
		expect(abbreviation).toHaveAttribute("data-slot", "avatar-fallback");
		expect(ref.current).toBe(abbreviation);
	});
});

describe("Avatar.Image", () => {
	test("is in the server-rendered markup, alongside the fallback behind it", () => {
		// The reason this part is a plain <img>: the server emits it, so the browser
		// fetches while it parses HTML and a cached image is on screen in the first
		// frame — no hydration, no swap, no flash of initials.
		const html = renderToString(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/jane.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		expect(html).toContain('src="https://example.com/jane.png"');
		expect(html).toContain('alt="Jane Doe"');
		expect(html).toContain("JD");
	});

	test("covers the fallback rather than replacing it", () => {
		render(
			<Avatar.Root data-testid="avatar">
				<Avatar.Image alt="Jane Doe" src="https://example.com/jane.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		// Both sides of the pair in one test: the image is positioned against the
		// root's own `relative`, which is what lets the fallback sit behind it with no
		// loading state anywhere.
		expect(screen.getByTestId("avatar")).toHaveClass("relative");
		expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveClass(
			"absolute",
			"inset-0",
			"size-full",
			"object-cover",
		);
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("a failed load unmounts the image, leaving the fallback showing", () => {
		render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/missing.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);

		fireEvent.error(screen.getByRole("img", { name: "Jane Doe" }));

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("onError runs first and can preventDefault to keep the image mounted", () => {
		// The house convention for a wrapped handler: the consumer's callback runs
		// first and `preventDefault()` bails out of the default behavior — here, for
		// someone who would rather retry a URL than fall back.
		const onError = vi.fn<(event: { preventDefault: () => void }) => void>((event) => {
			event.preventDefault();
		});
		render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" onError={onError} src="https://example.com/flaky.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);

		fireEvent.error(screen.getByRole("img", { name: "Jane Doe" }));

		expect(onError).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("img", { name: "Jane Doe" })).toBeInTheDocument();
	});

	test("a new src is a fresh attempt, so a good URL recovers from a bad one", () => {
		// Only the exact URL that failed stays unmounted — a boolean would strand an
		// avatar whose src changed after one failure.
		const { rerender } = render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/missing.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		fireEvent.error(screen.getByRole("img", { name: "Jane Doe" }));
		expect(screen.queryByRole("img")).not.toBeInTheDocument();

		rerender(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="https://example.com/jane.png" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);

		expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveAttribute(
			"src",
			"https://example.com/jane.png",
		);
	});

	test.for([
		{ label: "undefined", src: undefined },
		{ label: "an empty string", src: "" },
	])("renders nothing when src is $label, so the fallback stands alone", ({ src }) => {
		// An empty src would otherwise re-request the current page URL.
		render(
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src={src} />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>,
		);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("forwards className, data-*, and the ref, and joins the data-slot chain", () => {
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
			</Avatar.Root>,
		);
		const image = screen.getByRole("img", { name: "Jane Doe" });
		expect(image).toHaveClass("custom-class", "object-cover");
		expect(image).toHaveAttribute("data-flavor", "primary");
		expect(image).toHaveAttribute("data-slot", "outer avatar-image");
		expect(ref.current).toBe(image);
	});

	test("asChild renders the consumer element with the image styles, data-slot, and ref", () => {
		const ref = createRef<HTMLImageElement>();
		// The real reason to swap this part is a framework image component; the wrapper
		// stands in for one, and receives the src/alt the part supplies.
		const FrameworkImage = (props: ComponentProps<"img">) => <img alt={props.alt} {...props} />;
		render(
			<Avatar.Root>
				<Avatar.Image asChild alt="Jane Doe" ref={ref} src="https://example.com/jane.png">
					<FrameworkImage className="custom-class" data-flavor="primary" />
				</Avatar.Image>
			</Avatar.Root>,
		);
		const image = screen.getByRole("img", { name: "Jane Doe" });
		expect(image).toHaveClass("custom-class", "size-full", "object-cover");
		expect(image).toHaveAttribute("data-slot", "avatar-image");
		expect(image).toHaveAttribute("data-flavor", "primary");
		expect(image).toHaveAttribute("src", "https://example.com/jane.png");
		expect(ref.current).toBe(image);
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` rather than by a `test()`: a
 * `@ts-expect-error` that compiles is the assertion, and pairing it with a runtime
 * `expect` would read as coverage the vitest run does not have.
 *
 * `Avatar.Fallback` takes exactly one source of content — two would leave the winner
 * to precedence, none would render an empty avatar — and `asChild` needs a real
 * element to clone, so it belongs to the `children` arm only; beside `name` it would
 * otherwise typecheck and then render a string into `Slot`. `Avatar.Image` requires
 * `alt`, because an `<img>` without one announces its URL.
 */
export function typeLevelContracts() {
	return (
		<>
			{/* @ts-expect-error -- name and children are mutually exclusive */}
			<Avatar.Fallback name="Acme Corp">AC</Avatar.Fallback>
			{/* @ts-expect-error -- one of name or children is required */}
			<Avatar.Fallback />
			{/* @ts-expect-error -- asChild has nothing to clone beside name */}
			<Avatar.Fallback asChild name="Acme Corp" />
			{/* @ts-expect-error -- alt is required */}
			<Avatar.Image src="https://example.com/jane.png" />
		</>
	);
}
