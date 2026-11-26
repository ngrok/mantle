import { render, screen } from "@testing-library/react";
import { type ComponentProps, createRef, type PropsWithChildren, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import invariant from "tiny-invariant";
import { describe, expect, expectTypeOf, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Steps from "./steps-parts.js";
import type { StepsItemProps, StepsRootProps } from "./steps.js";

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
			// `StepsRootProps` omits `role`, so this is a compile error and a no-op.
			// The typecheck owns the first half, and this test owns the second.
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

	test("under asChild the swap merges the className and forwards the ref", () => {
		const ref = createRef<HTMLOListElement>();
		render(
			<Steps.Root asChild className="max-w-xl" ref={ref}>
				<ol className="mt-4" data-testid="root">
					<Steps.Item>
						<Steps.Title>Install the ngrok agent</Steps.Title>
					</Steps.Item>
				</ol>
			</Steps.Root>,
		);
		const root = screen.getByTestId("root");
		expect(ref.current).toBe(root);
		expect(root.className).toContain("mt-4");
		expect(root.className).toContain("max-w-xl");
	});

	test("under asChild the list drops a native start and reversed", () => {
		// The visible counter counts up from 1, so a native ordinal would disagree with it.
		render(
			<Steps.Root asChild>
				<ol data-testid="root" reversed start={7}>
					<Steps.Item asChild>
						<li data-testid="step" value={4}>
							<Steps.Title>Install the ngrok agent</Steps.Title>
						</li>
					</Steps.Item>
				</ol>
			</Steps.Root>,
		);
		expect(screen.getByTestId("root")).not.toHaveAttribute("start");
		expect(screen.getByTestId("root")).not.toHaveAttribute("reversed");
		expect(screen.getByTestId("step")).not.toHaveAttribute("value");
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

describe("Steps numbering props", () => {
	test("omits the native props that disagree with what the parts render", () => {
		// The visible number is a CSS counter that counts up from 1. These native
		// attributes would change only the number that a screen reader announces.
		expectTypeOf<StepsRootProps>().not.toHaveProperty("start");
		expectTypeOf<StepsRootProps>().not.toHaveProperty("reversed");
		expectTypeOf<StepsItemProps>().not.toHaveProperty("value");
		// The item always renders its marker as a child, and React throws when an
		// element has children and inner HTML.
		expectTypeOf<StepsItemProps>().not.toHaveProperty("dangerouslySetInnerHTML");
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

	test("the label slot carries its own slot and holds the step's children", () => {
		render(<Guide />);
		const label = screen.getByTestId("step-2").querySelector('[data-slot="steps-item-label"]');
		// A `<div>`, not a `<span>`: a step's children are flow content, and the
		// box never renders, so the element that validates costs nothing.
		expect(label?.tagName).toBe("DIV");
		expect(label).toHaveTextContent("Add your authtoken");
	});
});

describe("Steps marker", () => {
	test("is decoration: hidden from assistive technology, with no text of its own", () => {
		render(<Guide />);
		const marker = markerOf(screen.getByTestId("step-2"));
		expect(marker).toHaveAttribute("aria-hidden", "true");
		// An <svg><title> in a marker makes a screen reader read its text once
		// for each step.
		expect(marker.querySelector("title")).toBeNull();
		expect(marker.textContent).toBe("");
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

describe("Steps native ordinals", () => {
	test("a spread of wider props drops start, reversed, value, and inner HTML", () => {
		// The types omit these props, but a spread of a native props object can carry them.
		const ol: ComponentProps<"ol"> = { reversed: true, start: 7 };
		const li: ComponentProps<"li"> = {
			value: 4,
			dangerouslySetInnerHTML: { __html: "<p>Install</p>" },
		};
		const html = renderToString(
			<Steps.Root {...ol}>
				<Steps.Item {...li} />
			</Steps.Root>,
		);
		expect(html).not.toMatch(/ start=| reversed| value=/);
		expect(html).toContain('data-slot="steps-marker"');
	});

	test("under asChild a component child keeps the props it owns", () => {
		// A component decides what it forwards, so its `value` is application data.
		const Row = ({ value, ...li }: ComponentProps<"li"> & { value: string }) => (
			<li {...li} aria-label={value.trim()} />
		);
		render(
			<Steps.Root>
				<Steps.Item asChild>
					<Row value=" Install ">Install the ngrok agent</Row>
				</Steps.Item>
			</Steps.Root>,
		);
		expect(screen.getByRole("listitem")).toHaveAttribute("aria-label", "Install");
	});
});

describe("Steps server rendering", () => {
	test("an asChild item with inner HTML renders its marker instead of throwing", () => {
		const html = renderToString(
			<Steps.Root>
				<Steps.Item asChild>
					<li dangerouslySetInnerHTML={{ __html: "<p>Install</p>" }} />
				</Steps.Item>
			</Steps.Root>,
		);
		expect(html).toContain('data-slot="steps-marker"');
	});

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
