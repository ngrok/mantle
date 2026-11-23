import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
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

/** The anchored content, with a visually hidden label first, as a transcript has. */
function Content({
	anchorRef,
	contentKey,
}: {
	anchorRef: { current: ScrollAnchor | null };
	contentKey?: string;
}) {
	const anchorContent = useScrollAnchor({ anchorRef, key: contentKey });
	return (
		<div ref={anchorContent}>
			<span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
				Transcript
			</span>
			{paragraphs.map((text) => (
				<p key={text}>{text}</p>
			))}
		</div>
	);
}

/**
 * A 300px-tall scroll region at `width` around the content. `wrapped` puts a
 * header and a wrapper between the region and the content, as a page home has
 * and a panel home does not.
 */
function Region({
	anchorRef,
	width,
	wrapped = false,
	contentKey,
}: {
	anchorRef: { current: ScrollAnchor | null };
	width: number;
	wrapped?: boolean;
	contentKey?: string;
}) {
	const content = <Content anchorRef={anchorRef} contentKey={contentKey} />;
	return (
		<div
			data-testid="region"
			style={{ width, height: 300, overflowY: "auto", position: "relative" }}
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

/** How far step 12 sits below the region's top edge, in pixels. */
function stepTwelveOffset() {
	return (
		screen.getByText(stepTwelve).getBoundingClientRect().top -
		screen.getByTestId("region").getBoundingClientRect().top
	);
}

describe("useScrollAnchor", () => {
	test("keeps the same text at the top edge when the region mounts again at another width", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} />);
		screen.getByTestId("region").scrollTop += stepTwelveOffset();
		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("keeps the same text at the top edge when the new region wraps the content differently", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} />);
		screen.getByTestId("region").scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} wrapped />);

		expect(Math.abs(stepTwelveOffset())).toBeLessThanOrEqual(1);
	});

	test("starts at the top when the key changed after the anchor was read", () => {
		const anchorRef = { current: null };
		const first = render(<Region anchorRef={anchorRef} width={240} contentKey="message-1" />);
		screen.getByTestId("region").scrollTop += stepTwelveOffset();
		first.unmount();

		render(<Region anchorRef={anchorRef} width={720} contentKey="message-2" />);

		expect(screen.getByTestId("region").scrollTop).toBe(0);
	});
});
