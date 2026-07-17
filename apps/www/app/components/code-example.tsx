import { cx } from "@ngrok/mantle/cx";
import { Tabs } from "@ngrok/mantle/tabs";
import type { ComponentProps } from "react";

type CodeExampleRootProps = Omit<
	ComponentProps<typeof Tabs.Root>,
	"appearance" | "defaultValue" | "orientation"
>;

/**
 * The root of a tabbed example: a Preview/Code pill toggle above a single
 * frame that swaps between the live demo and its source. Defaults to the
 * preview tab. Carries `data-full-bleed`, so on full-width sections (e.g.
 * /layouts) the example escapes the prose measure and spans the whole canvas.
 *
 * @example
 * ```mdx
 * <CodeExample.Root>
 * 	<CodeExample.Preview className="p-0 md:p-0">
 * 		<MyDemo />
 * 	</CodeExample.Preview>
 * 	<CodeExample.Code>{tsx fence}</CodeExample.Code>
 * </CodeExample.Root>
 * ```
 */
function Root({ className, children, ...props }: CodeExampleRootProps) {
	return (
		<Tabs.Root
			appearance="pill"
			defaultValue="preview"
			data-full-bleed=""
			className={cx("mb-6", className)}
			{...props}
		>
			{/* tablists need an accessible name — pages stack several of these */}
			<Tabs.List aria-label="Example preview and source code">
				<Tabs.ListBorder />
				<Tabs.Trigger value="preview">Preview</Tabs.Trigger>
				<Tabs.Trigger value="code">Code</Tabs.Trigger>
			</Tabs.List>
			{children}
		</Tabs.Root>
	);
}

type CodeExamplePanelProps = Omit<ComponentProps<typeof Tabs.Content>, "value">;

/**
 * The live-demo panel of a `CodeExample`: a bordered, centered 16:9 frame —
 * a typical screen, scaled down to the docs canvas — so layout demos read as
 * miniature viewports. Merge a height/aspect class to override, and have the
 * demo fill the frame with `h-full` — an inner scrollbar should only appear
 * when the demo is about scrolling.
 *
 * @example
 * ```tsx
 * <CodeExample.Preview className="p-0 md:p-0">
 * 	<MyDemo />
 * </CodeExample.Preview>
 * ```
 */
function Preview({ className, children, ...props }: CodeExamplePanelProps) {
	return (
		<Tabs.Content
			value="preview"
			className={cx(
				// overflow-hidden clips square-cornered demo children (e.g. full-bleed
				// backgrounds) to the frame's rounded corners
				"flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-gray-300 p-4 md:p-16",
				className,
			)}
			{...props}
		>
			{children}
		</Tabs.Content>
	);
}

/**
 * The source panel of a `CodeExample`. Wrap a regular MDX code fence — it
 * still renders through the MDX provider's pre mapping (pre-rendered shiki,
 * copy button, collapsing), restyled here to sit flush in the tab panel.
 *
 * @example
 * ```mdx
 * <CodeExample.Code>
 *
 * {tsx fence}
 *
 * </CodeExample.Code>
 * ```
 */
function Code({ className, children, ...props }: CodeExamplePanelProps) {
	return (
		<Tabs.Content
			value="code"
			className={cx("[&_[data-slot=code-block]]:mb-0", className)}
			{...props}
		>
			{children}
		</Tabs.Content>
	);
}

/**
 * Compound component for a shadcn-style tabbed example in the docs: a
 * Preview/Code toggle over a single full-bleed frame, so big demos (layouts)
 * get the width they need without stacking a full-width code slab below.
 *
 * @example
 * Composition:
 * ```
 * CodeExample.Root
 * ├── CodeExample.Preview
 * └── CodeExample.Code
 * ```
 */
const CodeExample = {
	Root,
	Preview,
	Code,
} as const;

export {
	//,
	CodeExample,
};
