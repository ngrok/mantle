import { render, screen } from "@testing-library/react";
import { createRef, type PropsWithChildren, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import invariant from "tiny-invariant";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Steps } from "./steps.js";

/** Three steps: the shortest composition that has a first, a middle, and a last. */
const Guide = ({ children }: PropsWithChildren) => (
	<Steps.Root data-testid="root">
		<Steps.Item data-testid="step-1">
			<Steps.Title>Install the ngrok agent</Steps.Title>
		</Steps.Item>
		<Steps.Item data-testid="step-2">
			<Steps.Title>Add your authtoken</Steps.Title>
		</Steps.Item>
		<Steps.Item data-testid="step-3">
			<Steps.Title>Get a public URL for your app</Steps.Title>
		</Steps.Item>
		{children}
	</Steps.Root>
);

const markerOf = (item: HTMLElement) => {
	const marker = item.querySelector('[data-slot="steps-marker"]');
	invariant(marker != null, "the item rendered no marker");
	return marker;
};

/**
 * Rebuild each silhouette's real CSS selector from the class Tailwind compiles
 * it from, so the exclusivity test below evaluates the shipped condition against
 * the shipped DOM. Reading the conditions rather than restating them is what
 * lets it catch a permuted, widened, or unscoped edit — the silhouette choice
 * emits no data attribute and changes nothing else in the DOM, so the class is
 * its only observable.
 *
 * Tailwind compiles `group-[&<condition>]/steps-item:block` to
 * `:where(.group/steps-item)<condition> *`, and the group lands on the item.
 */
const paintedShapesIn = (marker: Element) =>
	Array.from(marker.querySelectorAll("svg > *")).filter((shape) => {
		const condition = shape.getAttribute("class")?.match(/group-\[&(.+?)\]\/steps-item:block/)?.[1];
		invariant(condition != null, `<${shape.tagName}> carries no position selector`);
		const selected = document.querySelectorAll(`[data-slot~="steps-item"]${condition} *`);
		return Array.from(selected).includes(shape);
	});

/**
 * Name the shape that paints, by the geometry it draws rather than by the class
 * that selected it. A silhouette with a top stub starts on the top edge at the
 * stub's leading edge, `x=18`; one with a bottom stub walks down to `y=50`. The
 * plain circle has no path at all.
 */
const paintedShapeIn = (marker: Element) => {
	const painted = paintedShapesIn(marker);
	invariant(painted.length === 1, `${painted.length} silhouettes paint at once`);
	const [shape] = painted;
	invariant(shape != null, "no silhouette paints");
	const path = shape.getAttribute("d");
	if (path == null) {
		return "only";
	}
	const hasTopStub = path.startsWith("M18 ");
	const hasBottomStub = path.includes("V50h-4");
	if (hasTopStub && hasBottomStub) {
		return "middle";
	}
	return hasTopStub ? "last" : "first";
};

describe("Steps.Root", () => {
	test("renders an ol that a WebKit reader still hears as a list", () => {
		render(<Guide />);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("OL");
		// `list-style: none` costs WebKit the list semantics, and those semantics
		// are the only step position a screen reader gets.
		expect(root).toHaveAttribute("role", "list");
		expect(screen.getByRole("list")).toBe(root);
	});

	test("keeps role=list when a consumer forces another role past the type", () => {
		render(
			// `StepsRootProps` omits `role`, so this is a compile error as well as a
			// no-op — `pnpm typecheck` owns the first half, this owns the second.
			// @ts-expect-error - role is not assignable to StepsRootProps
			<Steps.Root data-testid="root" role="presentation">
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByTestId("root")).toHaveAttribute("role", "list");
	});

	test("a consumer className beats the default it conflicts with", () => {
		render(
			<Steps.Root className="ps-0" data-testid="root">
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const root = screen.getByTestId("root");
		// The tailwind-merge contract: the consumer's padding replaces the gutter
		// rather than racing it in stylesheet order.
		expect(root.className).toContain("ps-0");
		expect(root.className).not.toContain("ps-4.5");
		expect(root.className).toContain("list-none");
	});

	test("joins an incoming data-slot chain ahead of its own", () => {
		render(
			<Steps.Root data-slot="setup-guide" data-testid="root">
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "setup-guide steps");
	});

	test("renders as child element when asChild is true, keeping data-slot and the role", () => {
		render(
			<Steps.Root asChild>
				<ol data-testid="root">
					<Steps.Item>
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</Steps.Item>
				</ol>
			</Steps.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-slot", "steps");
		expect(root).toHaveAttribute("role", "list");
	});

	test("keeps role=list when the asChild child carries its own role", () => {
		// `Slot` merges the child's props over the slot's, so a role stamped only
		// on the slot loses to the child and the list stops being a list.
		render(
			<Steps.Root asChild>
				<ol data-testid="root" role="presentation">
					<Steps.Item>
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</Steps.Item>
				</ol>
			</Steps.Root>,
		);
		expect(screen.getByTestId("root")).toHaveAttribute("role", "list");
		expect(screen.getByRole("list")).toBe(screen.getByTestId("root"));
	});

	test("forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLOListElement>();
		render(
			<Steps.Root data-flavor="setup" data-testid="root" ref={ref}>
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-flavor", "setup");
		expect(ref.current).toBe(root);
	});
});

describe("Steps.Item", () => {
	test("renders an li that is a direct child of the list", () => {
		render(<Guide />);
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
		for (const item of items) {
			expect(item.tagName).toBe("LI");
			expect(item.parentElement).toBe(screen.getByTestId("root"));
		}
	});

	test("a consumer className beats the default it conflicts with", () => {
		render(
			<Steps.Root>
				<Steps.Item className="pb-4" data-testid="step">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("step");
		// The tailwind-merge contract: `pb-4` replaces `pb-10` rather than racing it.
		expect(item.className).toContain("pb-4");
		expect(item.className).not.toContain("pb-10");
		expect(item.className).toContain("relative");
	});

	test("joins an incoming data-slot chain ahead of its own", () => {
		render(
			<Steps.Root>
				<Steps.Item data-slot="setup-step" data-testid="step">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByTestId("step")).toHaveAttribute("data-slot", "setup-step steps-item");
	});

	test("under asChild the swap merges the className and forwards the ref", () => {
		const ref = createRef<HTMLLIElement>();
		render(
			<Steps.Root>
				<Steps.Item asChild className="pb-4" ref={ref}>
					<li className="scroll-mt-8" data-testid="step">
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</li>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("step");
		expect(ref.current).toBe(item);
		expect(item.className).toContain("scroll-mt-8");
		expect(item.className).toContain("pb-4");
		expect(item.className).toContain("relative");
	});

	test("the rail turns transparent on the last step and stays four pixels wide", () => {
		render(<Guide />);
		// A cross-file pin: `last:border-s-transparent` is what lets `:last-child`
		// own last-ness, and dropping it hangs 40px of rail below the last marker.
		// happy-dom computes no Tailwind, so the class is the only observable.
		const classNames = screen.getAllByRole("listitem").map((item) => item.className);
		expect(classNames.every((className) => className.includes("border-s-[0.25rem]"))).toBe(true);
		expect(classNames.every((className) => className.includes("last:border-s-transparent"))).toBe(
			true,
		);
	});

	test("renders as child element when asChild is true, keeping data-slot and the marker", () => {
		render(
			<Steps.Root>
				<Steps.Item asChild>
					<li data-testid="step">
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</li>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("step");
		expect(item).toHaveAttribute("data-slot", "steps-item");
		expect(markerOf(item)).toBeInTheDocument();
		expect(item).toHaveTextContent("Install the ngrok agent");
	});

	test("asChild composition accumulates the data-slot chain in DOM order", () => {
		render(
			<Steps.Root>
				<Steps.Item asChild>
					<li data-slot="setup-step" data-testid="step">
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</li>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByTestId("step")).toHaveAttribute("data-slot", "steps-item setup-step");
	});

	test("asChild throws when the child is not a single JSX tag", () => {
		expect(() =>
			render(
				<Steps.Root>
					<Steps.Item asChild>Install the ngrok agent</Steps.Item>
				</Steps.Root>,
			),
		).toThrow("When using `asChild`, Steps.Item must be passed a single child as a JSX tag.");
	});

	test("forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLLIElement>();
		render(
			<Steps.Root>
				<Steps.Item data-state="done" data-testid="step" ref={ref}>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("step");
		expect(item).toHaveAttribute("data-state", "done");
		expect(ref.current).toBe(item);
	});
});

describe("Steps.Title", () => {
	test("renders an h3 by default", () => {
		render(<Guide />);
		const title = screen.getByRole("heading", { level: 3, name: "Add your authtoken" });
		expect(title).toHaveAttribute("data-slot", "steps-title");
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title asChild>
						<h2>Add your authtoken</h2>
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const title = screen.getByRole("heading", { level: 2, name: "Add your authtoken" });
		expect(title).toHaveAttribute("data-slot", "steps-title");
	});

	test("a consumer className beats the default it conflicts with", () => {
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title className="text-2xl" data-testid="title">
						Add your authtoken
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const title = screen.getByTestId("title");
		// The tailwind-merge contract: `text-2xl` replaces `text-lg`.
		expect(title.className).toContain("text-2xl");
		expect(title.className).not.toContain("text-lg");
		expect(title.className).toContain("font-medium");
	});

	test("joins an incoming data-slot chain ahead of its own", () => {
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title data-slot="setup-heading" data-testid="title">
						Add your authtoken
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByTestId("title")).toHaveAttribute("data-slot", "setup-heading steps-title");
	});

	test("under asChild the swap merges the className and forwards the ref", () => {
		const ref = createRef<HTMLHeadingElement>();
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title asChild className="text-2xl" ref={ref}>
						<h2 className="tracking-tight" data-testid="title">
							Add your authtoken
						</h2>
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const title = screen.getByTestId("title");
		expect(ref.current).toBe(title);
		expect(title.tagName).toBe("H2");
		expect(title.className).toContain("tracking-tight");
		expect(title.className).toContain("text-2xl");
	});

	test("forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLHeadingElement>();
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title data-emphasis="high" data-testid="title" ref={ref}>
						Add your authtoken
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveAttribute("data-emphasis", "high");
		expect(ref.current).toBe(title);
	});
});

describe("Steps data-slot", () => {
	test.each([
		["root", "steps", "OL"],
		["step-1", "steps-item", "LI"],
		["title", "steps-title", "H3"],
	])("%s stamps data-slot=%s on a %s", (testId, slot, tagName) => {
		render(
			<Steps.Root data-testid="root">
				<Steps.Item data-testid="step-1">
					<Steps.Title data-testid="title">Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const element = screen.getByTestId(testId);
		expect(element.tagName).toBe(tagName);
		expect(element).toHaveAttribute("data-slot", slot);
	});

	test("the marker carries its own slot so a consumer can hide the gutter", () => {
		render(<Guide />);
		expect(markerOf(screen.getByTestId("step-2"))).toHaveAttribute("data-slot", "steps-marker");
	});

	test("the content wrapper carries its own slot and lays out nothing", () => {
		render(<Guide />);
		const content = screen.getByTestId("step-2").querySelector('[data-slot="steps-item-content"]');
		// A `<div>`, not a `<span>`: a step's children are flow content, and the
		// box never renders either way, so the element that validates is free.
		expect(content?.tagName).toBe("DIV");
		// A cross-file pin: `contents` is what keeps the wrapper out of layout, so
		// the step's own children still lay out as children of the `<li>`.
		expect(content?.className).toBe("contents");
		expect(content).toHaveTextContent("Add your authtoken");
	});
});

describe("Steps marker", () => {
	test("is decoration: hidden from assistive technology, with no text of its own", () => {
		render(<Guide />);
		const marker = markerOf(screen.getByTestId("step-2"));
		expect(marker).toHaveAttribute("aria-hidden", "true");
		// The dashboard's copy shipped an <svg><title> per marker, so a reader
		// heard "Number with partial stick above and below" once per step.
		expect(marker.querySelector("title")).toBeNull();
		expect(marker.textContent).toBe("");
	});

	test.each([
		[1, ["only"]],
		[2, ["first", "last"]],
		[3, ["first", "middle", "last"]],
		[4, ["first", "middle", "middle", "last"]],
	])("a %i-step guide paints the silhouettes %j, in that order", (length, expected) => {
		render(
			<Steps.Root>
				{Array.from({ length }, (_unused, index) => (
					<Steps.Item key={index}>
						<Steps.Title>Step {index + 1}</Steps.Title>
					</Steps.Item>
				))}
			</Steps.Root>,
		);
		// Which shape wins, not only that one wins: swapping two `d` values leaves
		// each step matching exactly one condition while the first step's stub runs
		// up out of the circle into nothing.
		expect(screen.getAllByRole("listitem").map((item) => paintedShapeIn(markerOf(item)))).toEqual(
			expected,
		);
	});

	test("a guide nested inside a step reads its own position, not the outer step's", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="outer-first">
					<Steps.Title>Outer one</Steps.Title>
					<Steps.Root>
						<Steps.Item data-testid="inner-first">
							<Steps.Title>Inner one</Steps.Title>
						</Steps.Item>
						<Steps.Item data-testid="inner-last">
							<Steps.Title>Inner two</Steps.Title>
						</Steps.Item>
					</Steps.Root>
				</Steps.Item>
				<Steps.Item data-testid="outer-last">
					<Steps.Title>Outer two</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		// A plain group variant is a descendant selector, so the inner markers
		// would also match the outer step's `:first-child` and paint two shapes.
		expect({
			outerFirst: paintedShapeIn(markerOf(screen.getByTestId("outer-first"))),
			innerFirst: paintedShapeIn(markerOf(screen.getByTestId("inner-first"))),
			innerLast: paintedShapeIn(markerOf(screen.getByTestId("inner-last"))),
			outerLast: paintedShapeIn(markerOf(screen.getByTestId("outer-last"))),
		}).toEqual({
			outerFirst: "first",
			innerFirst: "first",
			innerLast: "last",
			outerLast: "last",
		});
	});
});

describe("Steps numbering", () => {
	test("the three counter classes name one counter, so the numbers advance", () => {
		render(<Guide />);
		// A cross-element spelling pin: the reset, the increment, and the
		// `content` that reads them are on three different elements, and a rename
		// in one leaves every step numbered 0 with nothing else to see it.
		expect(screen.getByTestId("root").className).toContain("[counter-reset:mantle-steps]");
		expect(screen.getByTestId("step-2").className).toContain("[counter-increment:mantle-steps]");
		expect(markerOf(screen.getByTestId("step-2")).getAttribute("class")).toContain(
			"after:content-[counter(mantle-steps)]",
		);
	});

	test("a fragment and a false child leave the DOM flat, so position stays the numbering", () => {
		const needsDomain = false;
		render(
			<Steps.Root data-testid="root">
				<>
					<Steps.Item data-testid="grouped-1">
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</Steps.Item>
					<Steps.Item data-testid="grouped-2">
						<Steps.Title>Add your authtoken</Steps.Title>
					</Steps.Item>
				</>
				{needsDomain && (
					<Steps.Item>
						<Steps.Title>Bring your own domain</Steps.Title>
					</Steps.Item>
				)}
				<Steps.Item data-testid="last">
					<Steps.Title>Get a public URL for your app</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		// Numbering by `Children` index counts the fragment as one step; the DOM
		// counts three, and the DOM is what the counter and `:last-child` read.
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
		expect(items.map((item) => item.dataset.testid)).toEqual(["grouped-1", "grouped-2", "last"]);
		expect(screen.getByTestId("last").matches(":last-child")).toBe(true);
		expect(screen.getByTestId("grouped-2").matches(":last-child")).toBe(false);
	});

	test("a wrapper component that renders Steps.Item as its root stays a step", () => {
		const DomainStep = () => (
			<Steps.Item data-testid="wrapped">
				<Steps.Title>Bring your own domain</Steps.Title>
			</Steps.Item>
		);
		render(
			<Steps.Root>
				<Steps.Item data-testid="plain">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<DomainStep />
			</Steps.Root>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(2);
		expect(screen.getByTestId("wrapped").matches(":last-child")).toBe(true);
	});
});

describe("Steps server rendering", () => {
	test("the first paint is the finished guide, markers and all", () => {
		// Numbering and the silhouette choice are CSS, so nothing waits for an
		// effect: the server markup is what a reader sees in the first frame.
		const html = renderToString(<Guide />);
		expect(html).toContain('role="list"');
		expect(html).toContain('data-slot="steps-item"');
		expect(html.match(/data-slot="steps-marker"/g)).toHaveLength(3);
		expect(html).toContain("[counter-increment:mantle-steps]");
		expect(html).not.toContain("<title>");
	});
});

describe("Steps under a browser translation engine", () => {
	test("removing a lone text child from a translated step does not throw", () => {
		// Regression: the marker used to sit beside the text, which is what turns
		// React's `setTextContent` write into a per-node `removeChild`. Translation
		// reparents that node into a `<font>`, so the removal threw a DOMException
		// and the page went blank. The content wrapper puts the text back on its own.
		const Guide = ({ label }: { label: ReactNode }) => (
			<Steps.Root data-testid="root">
				<Steps.Item data-testid="step">{label}</Steps.Item>
			</Steps.Root>
		);
		const { rerender } = render(<Guide label="Install the ngrok agent" />);
		translateTextNodes(screen.getByTestId("root"));
		expect(screen.getByTestId("step")).toHaveTextContent("[Install the ngrok agent-es]");

		expect(() => rerender(<Guide label={null} />)).not.toThrow();
		expect(screen.getByTestId("step")).toHaveTextContent("");
	});

	test("adding a step to a translated guide updates the DOM instead of throwing", () => {
		const { rerender } = render(<Guide />);
		translateTextNodes(screen.getByTestId("root"));
		expect(screen.getByTestId("step-1")).toHaveTextContent("[Install the ngrok agent-es]");

		// The marker mounts with its item and never inserts later, so an update
		// beside the reparented text nodes is an append, not an insert before one.
		expect(() =>
			rerender(
				<Guide>
					<Steps.Item data-testid="step-4">
						<Steps.Title>Bring your own domain</Steps.Title>
					</Steps.Item>
				</Guide>,
			),
		).not.toThrow();
		expect(screen.getAllByRole("listitem")).toHaveLength(4);
		expect(screen.getByTestId("step-4")).toHaveTextContent("Bring your own domain");
	});
});
