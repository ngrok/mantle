import { cx } from "@ngrok/mantle/cx";
import { Tabs } from "@ngrok/mantle/tabs";
import type { ComponentProps } from "react";
import { PreviewFrame as PreviewFrameImpl } from "./preview-frame";

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
 * 	<CodeExample.PreviewFrame example="centered-layout" title="Centered layout demo" />
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
				<Tabs.Trigger value="preview">Preview</Tabs.Trigger>
				<Tabs.Trigger value="code">Code</Tabs.Trigger>
			</Tabs.List>
			{children}
		</Tabs.Root>
	);
}

type CodeExamplePanelProps = Omit<ComponentProps<typeof Tabs.Content>, "value">;

type CodeExamplePreviewFrameProps = Omit<
	ComponentProps<typeof Tabs.Content>,
	"value" | "forceMount" | "children"
> &
	ComponentProps<typeof PreviewFrameImpl>;

/**
 * The live-demo panel of a `CodeExample`: hosts a {@link PreviewFrameImpl PreviewFrame},
 * an iframe pointed at the chrome-less `/preview/*` route with a
 * desktop/tablet/mobile viewport switcher and a reload button. A page example
 * key (`<page>/<name>`) grows the frame to the example's height; pass
 * `height="fixed"` for a demo that fills the frame. The demo gets its own document (its
 * own `window`, isolated keyboard shortcuts, frame-driven breakpoints). The
 * panel is force-mounted so flipping to the Code tab and back never reloads
 * the iframe.
 *
 * @example
 * ```mdx
 * <CodeExample.Root>
 * 	<CodeExample.PreviewFrame example="centered-layout" title="Centered layout demo" />
 * 	<CodeExample.Code>{tsx fence}</CodeExample.Code>
 * </CodeExample.Root>
 * ```
 */
function PreviewFrame({
	className,
	example,
	title,
	height,
	...props
}: CodeExamplePreviewFrameProps) {
	return (
		<Tabs.Content
			value="preview"
			// keep the iframe mounted while the Code tab is active — Radix leaves
			// force-mounted inactive panels visible, so hide it ourselves
			forceMount
			className="data-[state=inactive]:hidden"
			{...props}
		>
			<PreviewFrameImpl
				example={example}
				title={title}
				// Why the default: a page example sizes to its content, and a registry
				// shell demo fills a fixed-height frame.
				height={height ?? (example.includes("/") ? "content" : "fixed")}
				className={className}
			/>
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
			className={cx("**:data-[slot=code-block]:mb-0", className)}
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
 * ├── CodeExample.PreviewFrame
 * └── CodeExample.Code
 * ```
 */
const CodeExample = {
	Root,
	PreviewFrame,
	Code,
} as const;

export {
	//,
	CodeExample,
};
