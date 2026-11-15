import {
	PrimaryCodeBlockDemo,
	SingleLineWithHeaderDemo,
	HorizontalScrollingDemo,
	NoHeaderOrCopyButtonDemo,
	SingleLineHorizontalScrollingDemo,
	ServerRenderedHighlightingDemo,
	MantleCodeOptionsDemo,
	TabbedCodeBlockDemo,
	ScrollingTabListDemo,
	FoldableJsonDemo,
	JsonCodeBlockValueDemo,
	NestedFragmentInterpolationDemo,
	DefaultOptionsDemo,
	OverriddenOptionsDemo,
} from "~/features/code-block-demos";

/** The first example on the Code Block docs page. */
export function OverviewExample() {
	return <PrimaryCodeBlockDemo />;
}

/** The "Single line with a header" example on the Code Block docs page. */
export function SingleLineWithAHeaderExample() {
	return <SingleLineWithHeaderDemo />;
}

/** The "Horizontal scrolling" example on the Code Block docs page. */
export function HorizontalScrollingExample() {
	return <HorizontalScrollingDemo />;
}

/** The "No header or copy button" example on the Code Block docs page. */
export function NoHeaderOrCopyButtonExample() {
	return <NoHeaderOrCopyButtonDemo />;
}

/** The "Single line with horizontal scrolling" example on the Code Block docs page. */
export function SingleLineWithHorizontalScrollingExample() {
	return <SingleLineHorizontalScrollingDemo />;
}

/** The "Server-rendered syntax highlighting" example on the Code Block docs page. */
export function ServerRenderedSyntaxHighlightingExample() {
	return <ServerRenderedHighlightingDemo />;
}

/** The "Foldable code blocks" example on the Code Block docs page. */
export function FoldableCodeBlocksExample() {
	return <FoldableJsonDemo />;
}

/** The "Highlighting runtime JSON on the client" example on the Code Block docs page. */
export function HighlightingRuntimeJsonOnTheClientExample() {
	return <JsonCodeBlockValueDemo />;
}

/** The "Tabbed code block" example on the Code Block docs page. */
export function TabbedCodeBlockExample() {
	return <TabbedCodeBlockDemo />;
}

/** The "Scrolling tab list" example on the Code Block docs page. */
export function ScrollingTabListExample() {
	return <ScrollingTabListDemo />;
}

/** The "Reusing fragments with nested interpolation" example on the Code Block docs page. */
export function ReusingFragmentsWithNestedInterpolationExample() {
	return <NestedFragmentInterpolationDemo />;
}

/** The "mantleCode() options" example on the Code Block docs page. */
export function MantlecodeOptionsExample() {
	return <MantleCodeOptionsDemo />;
}

/** The "Default options" example on the Code Block docs page. */
export function DefaultOptionsExample() {
	return <DefaultOptionsDemo />;
}

/** The "Overriding every option" example on the Code Block docs page. */
export function OverridingEveryOptionExample() {
	return <OverriddenOptionsDemo />;
}
