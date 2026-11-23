import { render, screen } from "@testing-library/react";
import { type CSSProperties, StrictMode } from "react";
import { afterEach, describe, expect, test } from "vitest";
import type { ScrollAnchor } from "./use-scroll-anchor.js";
import { useScrollAnchor } from "./use-scroll-anchor.js";

// Paragraphs long enough to wrap to a different line count at each width, so
// the same `scrollTop` shows a different paragraph in each.
const paragraphs = Array.from(
	{ length: 30 },
	(_, index) =>
		`Step ${index + 1}: run the agent, then check that the endpoint answers before the next step.`,
);
const stepTwelve = paragraphs[11] ?? "";

type AnchorRef = { current: ScrollAnchor | null };

type ContentProps = {
	anchorRef: AnchorRef;
	contentKey?: string;
	/** Ends each paragraph with an inline element after its text. */
	inline?: boolean;
	/** Puts a fixed label first, as a pinned toolbar is. */
	fixedLabel?: boolean;
	/** False removes the element with the ref and keeps the hook mounted. */
	showContent?: boolean;
};

/** The anchored content, with a visually hidden label first, as a transcript has. */
function Content({
	anchorRef,
	contentKey,
	inline = false,
	fixedLabel = false,
	showContent = true,
}: ContentProps) {
	const anchorContent = useScrollAnchor({ anchorRef, key: contentKey });
	if (!showContent) {
		return null;
	}
	return (
		<div ref={anchorContent}>
			<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
				Transcript
			</span>
			{fixedLabel && <span style={{ position: "fixed", top: 0, height: 20 }}>Pinned</span>}
			{paragraphs.map((text) => (
				<p key={text}>
					{text}
					{inline && (
						<>
							{` ${text} ${text}`} <strong>Done.</strong>
						</>
					)}
				</p>
			))}
		</div>
	);
}

type RegionProps = ContentProps & {
	width: number;
	/**
	 * Puts a header and a wrapper between the region and the content, as a page
	 * home has and a panel home does not.
	 */
	wrapped?: boolean;
	/** Puts an `overflow: auto` wrapper around the content that grows with it. */
	autoWrapper?: boolean;
	style?: CSSProperties;
};

/** A 300px-tall scroll region at `width` around the content. */
function Region({
	width,
	wrapped = false,
	autoWrapper = false,
	style,
	...contentProps
}: RegionProps) {
	let content = <Content {...contentProps} />;
	if (autoWrapper) {
		content = <div style={{ overflow: "auto" }}>{content}</div>;
	}
	return (
		<div
			data-testid="region"
			style={{ width, height: 300, overflowY: "auto", position: "relative", ...style }}
		>
			{wrapped ? (
				<div>
					<h2>Assistant</h2>
					{content}
				</div>
			) : (
				content
			)}
		</div>
	);
}

function region() {
	return screen.getByTestId("region");
}

/** How far step 12 sits below the region's top edge, in pixels. */
function stepTwelveOffset() {
	return (
		screen.getByText(stepTwelve, { exact: false }).getBoundingClientRect().top -
		region().getBoundingClientRect().top
	);
}

afterEach(() => {
	window.scrollTo({ top: 0, behavior: "instant" });
});

describe("useScrollAnchor", () => {
	test("keeps the same text at the top edge when the region mounts again at another width", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} />);
		region().scrollTop += stepTwelveOffset();
		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("keeps the same text at the top edge when the new region wraps the content differently", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} />);
		region().scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} wrapped />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("keeps the paragraph at the top edge when the edge is in its text, before an inline element", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} inline />);
		// Two lines into step 12, well above its `<strong>`.
		region().scrollTop += stepTwelveOffset() + 40;
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} inline />);

		const step = screen.getByText(stepTwelve, { exact: false }).getBoundingClientRect();
		const edge = region().getBoundingClientRect().top;
		expect(step.top).toBeLessThanOrEqual(edge);
		expect(step.bottom).toBeGreaterThan(edge);
	});

	test("anchors the text, not a fixed child that stays at the edge", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} fixedLabel />);
		region().scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} fixedLabel />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("scrolls the region that moves the text, not an overflow wrapper that grows with it", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} autoWrapper />);
		region().scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} autoWrapper />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("restores at once in a region with smooth scrolling, also in StrictMode", () => {
		const anchorRef = { current: null };
		const smooth = { scrollBehavior: "smooth" } as const;
		const first = render(<Region anchorRef={anchorRef} width={240} style={smooth} />, {
			wrapper: StrictMode,
		});
		region().scrollTo({ top: region().scrollTop + stepTwelveOffset(), behavior: "instant" });
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} style={smooth} />, { wrapper: StrictMode });

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("keeps the same text at the top of the viewport when the document scrolls the content", () => {
		const anchorRef = { current: null };
		const step = () => screen.getByText(stepTwelve).getBoundingClientRect().top;
		const first = render(
			<div style={{ width: 200 }}>
				<Content anchorRef={anchorRef} />
			</div>,
		);
		window.scrollTo({ top: window.scrollY + step(), behavior: "instant" });
		expect(Math.abs(step())).toBeLessThanOrEqual(1);
		first.unmount();

		render(
			<div style={{ width: 360 }}>
				<Content anchorRef={anchorRef} />
			</div>,
		);

		expect(Math.abs(step())).toBeLessThanOrEqual(1);
	});

	test("starts at the top when the key changed after the anchor was read", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} contentKey="message-1" />);
		region().scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} contentKey="message-2" />);

		expect(region().scrollTop).toBe(0);
	});

	test("starts at the top when the hook stays mounted and the content comes back with a new key", () => {
		const anchorRef = { current: null };
		const view = render(<Region anchorRef={anchorRef} width={240} contentKey="message-1" />);
		region().scrollTop += stepTwelveOffset();
		view.rerender(
			<Region anchorRef={anchorRef} width={240} contentKey="message-1" showContent={false} />,
		);
		// Reading lays the region out, which clamps its scroll position to the empty content.
		expect(region().scrollTop).toBe(0);

		view.rerender(<Region anchorRef={anchorRef} width={240} contentKey="message-2" />);

		expect(region().scrollTop).toBe(0);
	});
});
