"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { TerminalIcon } from "@phosphor-icons/react/Terminal";
import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from "react";
import {
	createContext,
	Fragment,
	memo,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import assert from "tiny-invariant";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import {
	getTabListProps,
	getTabPanelProps,
	getTabProps,
	useTabs,
} from "../../behaviors/use-tabs.js";
import type { TabsBehavior } from "../../behaviors/use-tabs.js";
import { useCopyToClipboard } from "../../hooks/use-copy-to-clipboard.js";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { SelfClosingWithAsChild, WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { announce, mountSharedStatus } from "../../utils/shared-status.js";
import { Icon as MantleIcon } from "../icon/icon.js";
import type { SvgAttributes } from "../icon/types.js";
import { TrafficPolicyFileIcon } from "../icons/traffic-policy-file.js";
import { IconButton } from "../button/icon-button.js";
import { Slot } from "../slot/index.js";
import { escapeHtml } from "./escape-html.js";
import { tokenClassForColor } from "./token-classes.js";
import { attachFoldHandler, resetFoldState } from "./fold-runtime.js";
import type { Mode } from "./resolve-pre-rendered-props.js";
import type { CodeLine, CodeToken } from "./line-tokenizer.js";
import type { MantleCodeBlockValue } from "./mantle-code.js";

type CodeBlockContextType = {
	codeId: string;
	copyTextRef: { current: string };
	hasCodeExpander: boolean;
	isCodeExpanded: boolean;
	registerCode: () => void;
	setHasCodeExpander: (value: boolean) => void;
	setIsCodeExpanded: Dispatch<SetStateAction<boolean>>;
	unregisterCode: () => void;
};

const CodeBlockContext = createContext<CodeBlockContextType | null>(null);

const CodeBlockTabsContext = createContext<TabsBehavior | null>(null);

/** Returns the root's tab state, throwing when the root has no `defaultTab` or `activeTab`. */
function useCodeBlockTabs(partName: string): TabsBehavior {
	const tabs = useContext(CodeBlockTabsContext);
	assert(
		tabs != null,
		`${partName} must be rendered within a <CodeBlock.Root> that has \`defaultTab\` or \`activeTab\`.`,
	);
	return tabs;
}

/**
 * Owns the tab state of a tabbed `CodeBlock.Root`. It mounts when the root
 * first gets `defaultTab` or `activeTab`, so a default that arrives later
 * still applies.
 */
const CodeBlockTabs = ({
	activeTab,
	children,
	defaultTab,
	onActiveTabChange,
}: Pick<CodeBlockRootProps, "activeTab" | "defaultTab" | "onActiveTabChange"> & {
	children: ReactNode;
}) => {
	const tabs = useTabs({
		value: activeTab,
		defaultValue: defaultTab,
		onValueChange: onActiveTabChange,
	});
	return <CodeBlockTabsContext.Provider value={tabs}>{children}</CodeBlockTabsContext.Provider>;
};

/** Returns the nearest `CodeBlock` context, throwing if called outside a `CodeBlock.Root`. */
function useCodeBlockContext(): CodeBlockContextType {
	const context = useContext(CodeBlockContext);
	assert(context != null, "CodeBlock subcomponents must be rendered within a <CodeBlock.Root>.");
	return context;
}

type CodeBlockRootProps = Omit<ComponentProps<"div">, "align"> &
	WithAsChild & {
		/**
		 * The default active tab value (uncontrolled).
		 * Only relevant when using `CodeBlock.TabList` / `CodeBlock.TabContent`.
		 */
		defaultTab?: string;
		/**
		 * The controlled active tab value.
		 * Only relevant when using `CodeBlock.TabList` / `CodeBlock.TabContent`.
		 */
		activeTab?: string;
		/**
		 * Callback fired when the active tab changes.
		 * Only relevant when using `CodeBlock.TabList` / `CodeBlock.TabContent`.
		 */
		onActiveTabChange?: (value: string) => void;
	} & WithDataSlot;

/**
 * Shiki-powered code blocks with build-time syntax highlighting and zero browser bundle.
 * This is the root component for all CodeBlock components.
 *
 * For tabbed code blocks, pass `defaultTab` (uncontrolled) or `activeTab` / `onActiveTabChange`
 * (controlled) to enable tab switching with `CodeBlock.TabList` and `CodeBlock.TabContent`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-orientation` | `"horizontal"` | Present when `defaultTab` or `activeTab` is set. Omitted otherwise. |
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockroot
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Root = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	defaultTab,
	activeTab,
	onActiveTabChange,
	ref,
	...props
}: CodeBlockRootProps) => {
	const copyTextRef = useRef("");
	// Why Root owns the id: `ExpanderButton` renders `aria-controls` from it, and
	// an id that `Code` registers from a mount effect is absent in the server HTML.
	const codeId = useId();
	const mountedCodeCount = useRef(0);
	const [hasCodeExpander, setHasCodeExpander] = useState(false);
	const [isCodeExpanded, setIsCodeExpanded] = useState(false);

	const registerCode = useCallback(() => {
		assert(
			mountedCodeCount.current === 0,
			"You can only render a single CodeBlock.Code within a CodeBlock.",
		);
		mountedCodeCount.current += 1;
	}, []);

	const unregisterCode = useCallback(() => {
		mountedCodeCount.current -= 1;
	}, []);

	const context: CodeBlockContextType = useMemo(
		() =>
			({
				codeId,
				copyTextRef,
				hasCodeExpander,
				isCodeExpanded,
				registerCode,
				setHasCodeExpander,
				setIsCodeExpanded,
				unregisterCode,
			}) as const,
		[codeId, hasCodeExpander, isCodeExpanded, registerCode, unregisterCode],
	);

	const hasTabs = defaultTab != null || activeTab != null;
	const Component = asChild ? Slot : "div";

	const tree = (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block")}
			data-orientation={hasTabs ? "horizontal" : undefined}
			className={cx(
				"text-mono w-full overflow-hidden rounded-xl border border-gray-300 bg-base font-mono",
				"[&_svg]:shrink-0",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);

	return (
		<CodeBlockContext.Provider value={context}>
			{hasTabs ? (
				<CodeBlockTabs
					activeTab={activeTab}
					defaultTab={defaultTab}
					onActiveTabChange={onActiveTabChange}
				>
					{tree}
				</CodeBlockTabs>
			) : (
				tree
			)}
		</CodeBlockContext.Provider>
	);
};

/**
 * The body of the `CodeBlock`. This is where `CodeBlock.Code` and
 * the optional `CodeBlock.CopyButton` are rendered.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockbody
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Body = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-body")}
			className={cx(
				"relative",
				// Why per-line breathing room: the scroll range ends at the edge of
				// the max-content <code>, so without a small reserve the longest
				// line touches the container edge at the end of the scroll range.
				"[&_.mantle-code-line]:pr-4",
				// Why only the first two lines reserve copy-button space: the size-7
				// button sits at `right-3 top-3`, over the first two text-mono lines
				// only. Per-line padding adds to the max-content width of the `w-max`
				// <code>, so a blanket reserve forced a horizontal scrollbar even when
				// every line fit the container. The `:has()` scope drops the reserve
				// when no copy button is rendered. This rule outranks the breathing
				// room above on specificity.
				"[&:has([data-slot=code-block-copy-button])_.mantle-code-line:nth-child(-n+2)]:pr-14",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * Matches `SHIKI_VAL_<index>` placeholders injected by the Vite plugin for
 * interpolated template expressions. Hoisted to module scope to avoid
 * re-creating the regex on every substitution call.
 */
const LEGACY_SHIKI_VAL_PATTERN = /SHIKI_VAL_(\d+)/g;

/** Escapes special characters in a string for use in a `RegExp` constructor. */
function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const maxPreValPatternCacheSize = 500;
const preValPatternCache = new Map<string, RegExp>();

/**
 * Returns the cached `RegExp` for the given `preValToken`, falling back to the
 * legacy `SHIKI_VAL_<n>` pattern when the token is missing or empty.
 */
function getTemplateValPattern(preValToken: string | undefined): RegExp {
	if (preValToken == null || preValToken.length === 0) {
		return LEGACY_SHIKI_VAL_PATTERN;
	}

	let cached = preValPatternCache.get(preValToken);
	if (cached == null) {
		if (preValPatternCache.size >= maxPreValPatternCacheSize) {
			preValPatternCache.clear();
		}
		cached = new RegExp(`${escapeForRegExp(preValToken)}(\\d+)__`, "g");
		preValPatternCache.set(preValToken, cached);
	}
	return cached;
}

/**
 * Replaces placeholder tokens in `input` with values from `vals`, applying
 * `mapValue` to each substituted value. Returns the input unchanged when
 * no placeholders are present.
 */
function substituteTemplateVals({
	input,
	vals,
	preValToken,
	mapValue,
}: {
	input: string;
	vals: unknown[];
	preValToken: string | undefined;
	mapValue: (value: unknown) => string;
}): string {
	if (preValToken == null) {
		if (!input.includes("SHIKI_VAL_")) {
			return input;
		}
	} else if (!input.includes(preValToken)) {
		return input;
	}

	return input.replaceAll(getTemplateValPattern(preValToken), (match, indexText: string) => {
		const index = Number.parseInt(indexText, 10);
		if (Number.isNaN(index) || index < 0 || index >= vals.length) {
			return match;
		}
		return mapValue(vals[index]);
	});
}

/** Substitutes placeholder tokens in pre-rendered HTML, HTML-escaping each interpolated value. */
function substitutePreVals(html: string, vals: unknown[], preValToken: string | undefined): string {
	return substituteTemplateVals({
		input: html,
		vals,
		preValToken,
		mapValue: (value) => escapeHtml(String(value)),
	});
}

/** Substitutes placeholder tokens in plain text (for the copy button), without HTML escaping. */
function substitutePreValsPlainText(
	text: string,
	vals: unknown[],
	preValToken: string | undefined,
): string {
	return substituteTemplateVals({
		input: text,
		vals,
		preValToken,
		mapValue: (value) => String(value),
	});
}

type CodeBlockCodeProps = Omit<ComponentProps<"pre">, "children" | "translate"> & {
	/**
	 * The code value produced by `mantleCode("lang")` tagged template.
	 * Contains pre-rendered Shiki HTML (when the Vite plugin is active) and
	 * the original code string for the copy button.
	 */
	value: MantleCodeBlockValue;
};

/**
 * One highlighted token: plain text in the inherited foreground color, a
 * `<span>` with a short token class from `mantle.css`, or a `<span>` with an
 * inline style for a color with no class or a font style.
 */
function TokenView({ token }: { token: CodeToken }) {
	const fontStyle = token.fontStyle ?? 0;
	const tokenClass = token.color == null ? "" : tokenClassForColor(token.color);
	if (tokenClass === "" && fontStyle === 0) {
		return token.content;
	}
	const className = tokenClass === "" ? undefined : tokenClass;
	return (
		<span
			className={className}
			style={
				tokenClass == null || fontStyle !== 0
					? {
							color: tokenClass == null ? token.color : undefined,
							fontStyle: fontStyle & 1 ? "italic" : undefined,
							fontWeight: fontStyle & 2 ? "bold" : undefined,
							textDecoration:
								fontStyle & 12
									? clsx(fontStyle & 4 && "underline", fontStyle & 8 && "line-through")
									: undefined,
						}
					: undefined
			}
		>
			{token.content}
		</span>
	);
}

/**
 * One line of browser-highlighted code, with the same markup as a line of
 * pre-rendered HTML, so the two share one stylesheet and one geometry.
 * Why `memo`: a streamed block renders again for each update, and a finished
 * line keeps its tokens, so it skips the render.
 */
const CodeLineView = memo(function CodeLineView({
	line,
	lineNumber,
}: {
	line: CodeLine | string;
	lineNumber: number;
}) {
	// Why a space: an empty line keeps its height, and each browser copies it as a blank line (see `decorateHighlightedHtml`).
	let content: ReactNode;
	if (line.length === 0) {
		content = " ";
	} else if (typeof line === "string") {
		content = line;
	} else {
		content = line.map((token, index) => (
			// oxlint-disable-next-line react/no-array-index-key -- Why: a token has no identity but its position in a line that renders as a whole.
			<TokenView key={index} token={token} />
		));
	}
	// Why no number element: `mantle.css` counts the lines and draws each
	// number, so the digits stay out of the code's text.
	return (
		<span className="mantle-code-line" data-line-number={lineNumber}>
			<span className="mantle-code-line-content">{content}</span>
		</span>
	);
});

/**
 * The `CodeBlock` content. Renders pre-highlighted code from `mantleCode()`,
 * or browser-highlighted code from `useCodeBlockStream()`.
 *
 * Mantle's Vite plugin or server highlighter sets `value["~preHtml"]`.
 * `useCodeBlockStream` sets `value["~lines"]` instead: each line then renders
 * as React elements with the same markup, and a line that did not change
 * does not render again. Code folding needs pre-rendered HTML.
 *
 * The `<pre>` always carries `translate="no"`, so a browser translation engine
 * skips the code. A translated CLI flag, env var, or YAML key is wrong, and the
 * reader copies it anyway. The `translate` prop is omitted from the type, so no
 * call site can turn the guard off.
 *
 * CSS draws line numbers with empty alternative text, so a screen reader hears
 * the code, not "1 const x", and a copy holds no numbers.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-expanded` | present when expanded | Presence-only. Only with a composed `CodeBlock.ExpanderButton`, which carries `aria-expanded`. |
 * | `data-syntax-highlighted` | present when highlighted | Presence-only. The value carried pre-rendered Shiki HTML. |
 * | `data-lang` | the language id | The value's language. |
 * | `data-mantle-line-numbers` | `"true"` \| `"false"` | Whether the gutter shows line numbers. |
 * | `data-mantle-line-number-start` | a number as a string | The first line number. |
 * | `data-mantle-highlight-lines` | comma-separated line numbers | Present when lines are highlighted. |
 * | `data-line-number` | a number | On each `.mantle-code-line`. The line number the gutter shows. |
 * | `data-fold-line` | a fold id | On each fold toggle `<button>`. The URI-encoded id of the region the button folds. |
 * | `data-fold-regions` | space-separated fold ids | On each line inside a foldable region. The id of each region that holds it. |
 * | `data-folded-regions` | space-separated fold ids | On the `<code>` while a region is folded. The id of each folded region. |
 * | `data-fold-hidden` | `"true"` \| `"false"` | On a line a fold changed. `"true"` while a folded region hides it; `"false"` only while it opens, then removed. |
 * | `data-fold-instant` | present on a large fold | Presence-only. On each line past the first 50 that a fold changes. The line hides or shows with no motion. |
 *
 * Inside the highlighted HTML, each line is a `.mantle-code-line` with
 * `data-line-number`, and `mantle.css` draws the gutter number, the fold caret,
 * and the folded marker. A token has a short color class, such as `tk` for a
 * keyword, or no element in the foreground color.
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--mantle-line-number-start` | `1` | The CSS counter start for the line-number gutter. |
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockcode
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Code = ({ className, style, value, ref, ...props }: CodeBlockCodeProps) => {
	const preRef = useRef<HTMLPreElement>(null);
	const composedRef = useComposedRefs(preRef, ref);
	const { codeId, copyTextRef, hasCodeExpander, isCodeExpanded, registerCode, unregisterCode } =
		useCodeBlockContext();
	const {
		language,
		code,
		"~preValToken": __preValToken,
		"~preVals": __preVals,
		"~highlightLines": __highlightLines,
		"~lineNumberStart": __lineNumberStart,
		"~preHtml": __preHtml,
		"~lines": lines,
		"~showLineNumbers": __showLineNumbers,
	} = value;

	const effectiveHighlightLines = __highlightLines;
	const effectiveLineNumberStart = __lineNumberStart ?? 1;
	const effectiveShowLineNumbers = __showLineNumbers ?? false;
	const copyText = useMemo(
		() =>
			__preVals != null && __preVals.length > 0
				? substitutePreValsPlainText(code, __preVals, __preValToken)
				: code,
		[__preValToken, __preVals, code],
	);

	useLayoutEffect(() => {
		copyTextRef.current = copyText;
	}, [copyTextRef, copyText]);

	// Why count in an effect: React can discard a render, so only a commit proves
	// that a second `CodeBlock.Code` is mounted.
	useEffect(() => {
		registerCode();

		return () => {
			unregisterCode();
		};
	}, [registerCode, unregisterCode]);

	const hasLines = lines != null;
	const renderedHtml = useMemo(() => {
		if (__preHtml == null || hasLines) {
			return undefined;
		}
		return __preVals != null && __preVals.length > 0
			? substitutePreVals(__preHtml, __preVals, __preValToken)
			: __preHtml;
	}, [__preHtml, __preValToken, __preVals, hasLines]);

	// Attach a single delegated click handler per <pre> so fold toggles do
	// not pay the cost of N React re-renders or N event handlers (see the
	// performance rationale in `fold-runtime.ts`). Re-attaches when the
	// rendered HTML changes since `<code>` gets a new dangerouslySetInnerHTML.
	// Only highlighted HTML has fold toggles, so plain text gets no handler.
	useEffect(() => {
		const pre = preRef.current;
		if (pre == null || renderedHtml == null) {
			return undefined;
		}
		const codeElement = pre.querySelector("code");
		if (codeElement != null) {
			resetFoldState(codeElement);
		}
		return attachFoldHandler(pre);
	}, [renderedHtml]);

	const isPreRendered = renderedHtml != null || hasLines;
	const displayHtml = renderedHtml ?? escapeHtml(copyText);

	// React diffs `dangerouslySetInnerHTML` by prop reference; a fresh
	// `{ __html }` literal each render re-applies `innerHTML`, wiping any
	// runtime-managed DOM state on the children (e.g. fold attributes).
	const innerHtmlProp = useMemo(() => ({ __html: displayHtml }), [displayHtml]);
	// Why omit `MozTabSize`: Firefox reads `-moz-tab-size` as an alias of
	// `tab-size`. React writes a number as `2px`, and on a client mount it writes
	// an `undefined` value as `""`, which clears `tab-size` too.
	const { MozTabSize: _mozTabSize, ...preStyle } = style ?? {};

	return (
		<pre
			data-slot="code-block-code"
			// Why data-expanded and not aria-expanded: `aria-expanded` is not a global
			// attribute and `<pre>` has no role that supports it. The expander
			// button owns the ARIA state; this attribute mirrors it for styling.
			data-expanded={hasCodeExpander && isCodeExpanded ? "" : undefined}
			className={cx(
				"scrollbar overflow-x-auto overscroll-x-none overflow-y-hidden py-4",
				!isPreRendered && "pr-14",
				"data-[mantle-line-numbers~='false']:pl-4",
				"text-mono m-0 font-mono outline-hidden",
				hasCodeExpander && !isCodeExpanded && "max-h-[13.6rem]",
				className,
			)}
			data-syntax-highlighted={isPreRendered ? "" : undefined}
			data-lang={language}
			data-mantle-highlight-lines={
				isPreRendered && effectiveHighlightLines != null && effectiveHighlightLines.length > 0
					? effectiveHighlightLines.join(",")
					: undefined
			}
			data-mantle-line-number-start={
				isPreRendered && effectiveShowLineNumbers ? String(effectiveLineNumberStart) : "1"
			}
			data-mantle-line-numbers={isPreRendered && effectiveShowLineNumbers ? "true" : "false"}
			id={codeId}
			ref={composedRef}
			style={
				{
					...preStyle,
					"--mantle-line-number-start": String(effectiveLineNumberStart),
					tabSize: 2,
				} as ComponentProps<"pre">["style"]
			}
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and translated code is wrong at every call site.
			translate="no"
		>
			{lines == null ? (
				<code
					className="text-size-inherit block min-w-full w-max"
					dangerouslySetInnerHTML={innerHtmlProp}
				/>
			) : (
				<code className="text-size-inherit block min-w-full w-max">
					{lines.map((line, index) => (
						// oxlint-disable-next-line react/no-array-index-key -- Why: a line has no identity but its position, and an appended line must not remount the lines above it.
						<Fragment key={index}>
							{/* Why a newline: `textContent` keeps the line breaks, the same as pre-rendered HTML. */}
							{index > 0 && "\n"}
							<CodeLineView line={line} lineNumber={effectiveLineNumberStart + index} />
						</Fragment>
					))}
				</code>
			)}
		</pre>
	);
};

/**
 * The (optional) header slot of the `CodeBlock`. This is where
 * `CodeBlock.Icon` and `CodeBlock.Title` are rendered.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockheader
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Header = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-header")}
			className={cx(
				"flex items-center gap-1 border-b border-gray-300 bg-base px-4 py-2 text-gray-700",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
};

/**
 * The (optional) title of the `CodeBlock`. Renders as `h3` by default;
 * use `asChild` to render a different element.
 *
 * The heading carries `translate="no"` by default, because the title usually names
 * a file (`example.ts`), and a translated filename names a file that does not
 * exist. The slot takes arbitrary children though, so pass `translate="yes"` when
 * the title is prose rather than a filename. `CodeBlock.Code` takes no such
 * override: a block of code is never translatable.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblocktitle
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const Title = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ComponentProps<"h3"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "h3";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "code-block-title")}
			ref={ref}
			className={cx("m-0 font-sans text-xs font-medium", className)}
			translate="no"
			{...props}
		/>
	);
};

/** The motion of the copy and check paths of `CopyButton` as they swap. */
const COPY_PATH_CLASS =
	"origin-center transform-fill motion-safe:transition-[opacity,scale] motion-safe:duration-200 motion-safe:ease-out-strong";

type CodeBlockCopyButtonProps = Omit<ComponentProps<"button">, "aria-label" | "children" | "type"> &
	SelfClosingWithAsChild & {
		/**
		 * Not part of the API: `label` is the single way to name the button.
		 * Typed `never` rather than only omitted because TypeScript skips
		 * excess-attribute checks for hyphenated JSX attributes; the `never`
		 * type makes the JSX call site a compile error.
		 */
		"aria-label"?: never;
		/**
		 * The accessible name for the copy button, rendered as its `aria-label` (like the `alt` text on an `<img>`).
		 *
		 * @default "Copy code"
		 */
		label?: string;
		/**
		 * Callback fired when the copy button is clicked, passes the copied text as an argument.
		 */
		onCopy?: (value: string) => void;
		/**
		 * Callback fired when an error occurs during copying.
		 */
		onCopyError?: (error: unknown) => void;
	};

/**
 * The optional copy button. Copies the raw source of the mounted
 * `CodeBlock.Code` to the clipboard (in a tabbed block, the active tab's code).
 * Omit it to render the code block without a copy control.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-copied` | present after a copy | Presence-only. Set when a copy succeeds and cleared a moment later. The check icon shows while it is present. |
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockcopybutton
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const CopyButton = ({
	className,
	label = "Copy code",
	onCopy,
	onCopyError,
	onClick,
	ref,
	...props
}: CodeBlockCopyButtonProps) => {
	const { copyTextRef } = useCodeBlockContext();
	const copyToClipboard = useCopyToClipboard();
	const [wasCopied, setWasCopied] = useState(false);
	const composedRef = useComposedRefs(ref, mountSharedStatus);
	const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (timeoutHandle.current != null) {
				clearTimeout(timeoutHandle.current);
			}
		};
	}, []);

	return (
		<span
			data-slot="code-block-copy-button"
			className="absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-(--icon-button-border-radius,0.375rem) bg-base"
		>
			<IconButton
				type="button"
				appearance="ghost"
				intent="neutral"
				size="sm"
				label={label}
				// Why one svg with both paths, and not `IconSwap`: CSS swaps the paths on
				// `data-copied`, so a copy button renders 3 components fewer. Why a named
				// group: an ancestor with its own `data-copied` must not swap them.
				icon={
					<svg viewBox="0 0 256 256" fill="currentColor">
						<path
							className={clsx(
								COPY_PATH_CLASS,
								"group-data-copied/copy:scale-50 group-data-copied/copy:opacity-0",
							)}
							d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"
						/>
						<path
							className={clsx(
								COPY_PATH_CLASS,
								"not-group-data-copied/copy:scale-50 not-group-data-copied/copy:opacity-0",
							)}
							d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
						/>
					</svg>
				}
				data-copied={wasCopied ? "" : undefined}
				className={cx("group/copy bg-base not-disabled:hover:bg-neutral-500/15", className)}
				ref={composedRef}
				onClick={async (event) => {
					// Why if-guards: the React Compiler cannot lower `?.()` inside a `try`
					// body, and the bail-out ships `CopyButton` uncompiled.
					try {
						if (onClick != null) {
							onClick(event);
						}
						if (event.defaultPrevented) {
							// Why reset: the cleared timeout no longer returns the copy icon.
							if (timeoutHandle.current != null) {
								clearTimeout(timeoutHandle.current);
							}
							setWasCopied(false);
							return;
						}
						// Why read it before the await: React clears `currentTarget` after the handler returns.
						const button = event.currentTarget;
						const text = copyTextRef.current;
						await copyToClipboard(text);
						if (onCopy != null) {
							onCopy(text);
						}
						// Why one shared region: the icon swap is silent to a screen reader,
						// and an answer with many code blocks must not hold a region for each.
						announce(button, "Copied", { repeat: true });
						setWasCopied(true);
						if (timeoutHandle.current != null) {
							clearTimeout(timeoutHandle.current);
						}
						timeoutHandle.current = setTimeout(() => {
							setWasCopied(false);
						}, 2000);
					} catch (error) {
						onCopyError?.(error);
					}
				}}
				{...props}
			/>
		</span>
	);
};

type CodeBlockExpanderButtonProps = Omit<
	ComponentProps<"button">,
	"children" | "aria-controls" | "aria-expanded"
> &
	WithDataSlot;

/**
 * The (optional) expander button of the `CodeBlock`. Toggles the expanded
 * state of the code block. When present, the code block is collapsible.
 *
 * It carries `aria-expanded` and `aria-controls` that points at the `<pre>`.
 * It does not take `asChild`: it renders its own label and caret, so there is
 * no single child to clone. Style it with `className`.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockexpanderbutton
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
const ExpanderButton = ({
	"data-slot": dataSlot,
	className,
	onClick,
	ref,
	...props
}: CodeBlockExpanderButtonProps) => {
	const { codeId, isCodeExpanded, setIsCodeExpanded, setHasCodeExpander } = useCodeBlockContext();

	// Why a layout effect: `Code` collapses to its max height from this flag,
	// and a passive registration paints one frame at full height first.
	useIsomorphicLayoutEffect(() => {
		setHasCodeExpander(true);
		return () => {
			setHasCodeExpander(false);
		};
	}, [setHasCodeExpander]);

	return (
		<button
			{...props}
			data-slot={joinDataSlot(dataSlot, "code-block-expander-button")}
			aria-controls={codeId}
			aria-expanded={isCodeExpanded}
			className={cx(
				"flex w-full items-center justify-center gap-0.5 border-t border-gray-300 bg-base px-4 py-2 font-sans text-gray-700 hover:bg-base-hover",
				// Why inset: the button meets three edges of the root's `overflow-hidden`, which
				// clips a ring or a forced-colors outline drawn outside the button.
				"focus-visible:focus-ring focus-visible:ring-inset focus-visible:-outline-offset-2",
				className,
			)}
			ref={ref}
			type="button"
			onClick={(event) => {
				setIsCodeExpanded((prev) => !prev);
				onClick?.(event);
			}}
		>
			{isCodeExpanded ? "Show less" : "Show more"}{" "}
			<MantleIcon
				svg={<CaretDownIcon weight="bold" />}
				className={cx(
					"size-4",
					isCodeExpanded && "rotate-180",
					"transition-transform duration-200 ease-out-strong motion-reduce:transition-none",
				)}
			/>
		</button>
	);
};

type CodeBlockIconProps = Omit<SvgAttributes, "children"> &
	(
		| {
				/**
				 * A custom icon SVG to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				svg: ReactNode;
				/**
				 * A preset icon to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				preset?: undefined;
		  }
		| {
				/**
				 * A custom icon SVG to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				svg?: undefined;
				/**
				 * A preset icon to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				preset: Mode;
		  }
	) &
	WithDataSlot;

/**
 * A small icon for the `CodeBlock` header. Pass either a custom `svg`
 * or a `preset` value (not both).
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblockicon
 *
 * @example
 * ```tsx
 * <CodeBlock.Root>
 *   <CodeBlock.Header>
 *     <CodeBlock.Icon preset="file" />
 *     <CodeBlock.Title>example.ts</CodeBlock.Title>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.Code value={mantleCode("typescript")`const x = "hello";`} />
 *   </CodeBlock.Body>
 *   <CodeBlock.ExpanderButton />
 * </CodeBlock.Root>
 * ```
 */
function CodeBlockIconComponent({
	"data-slot": dataSlot,
	className,
	preset,
	svg: _svgProp,
	...props
}: CodeBlockIconProps) {
	let svg = _svgProp;
	if (preset != null) {
		switch (preset) {
			case "file":
				svg = <FileTextIcon weight="fill" />;
				break;
			case "cli":
				svg = <TerminalIcon weight="fill" />;
				break;
			case "traffic-policy":
				svg = <TrafficPolicyFileIcon />;
				break;
		}
	}
	return (
		<MantleIcon
			data-slot={joinDataSlot(dataSlot, "code-block-icon")}
			className={cx("size-5", className)}
			svg={svg}
			{...props}
		/>
	);
}

type CodeBlockTabListProps = ComponentProps<"div"> & WithDataSlot;

/**
 * A tab list for the `CodeBlock` header. Renders pill-styled tab triggers
 * that switch which code is displayed. It follows the WAI-ARIA tabs pattern.
 *
 * Place this inside `CodeBlock.Header` and pair with `CodeBlock.TabContent`
 * in `CodeBlock.Body` to conditionally render code based on the active tab.
 * `CodeBlock.Root` owns the tab state via `defaultTab` / `activeTab` / `onActiveTabChange`.
 *
 * When the tabs exceed the available width they scroll horizontally with an edge
 * fade (`scroll-fade-x`) instead of wrapping to a second row.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblocktablist
 *
 * @example
 * ```tsx
 * <CodeBlock.Root defaultTab="yml">
 *   <CodeBlock.Header>
 *     <CodeBlock.TabList>
 *       <CodeBlock.TabTrigger value="yml">policy.yml</CodeBlock.TabTrigger>
 *       <CodeBlock.TabTrigger value="json">policy.json</CodeBlock.TabTrigger>
 *     </CodeBlock.TabList>
 *   </CodeBlock.Header>
 *   <CodeBlock.Body>
 *     <CodeBlock.CopyButton />
 *     <CodeBlock.TabContent value="yml">
 *       <CodeBlock.Code value={ymlValue} />
 *     </CodeBlock.TabContent>
 *     <CodeBlock.TabContent value="json">
 *       <CodeBlock.Code value={jsonValue} />
 *     </CodeBlock.TabContent>
 *   </CodeBlock.Body>
 * </CodeBlock.Root>
 * ```
 */
const TabList = ({
	"data-slot": dataSlot,
	className,
	onFocus,
	onMouseDown,
	ref,
	...props
}: CodeBlockTabListProps) => {
	const listProps = getTabListProps(useCodeBlockTabs("CodeBlock.TabList"));
	return (
		// oxlint-disable-next-line jsx-a11y/interactive-supports-focus -- Why: a focus on the list moves to a tab; the list is only the entry point for a Tab forward (WAI-ARIA tabs pattern).
		<div
			{...listProps}
			role="tablist"
			data-slot={joinDataSlot(dataSlot, "code-block-tab-list")}
			className={cx(
				"scroll-fade-x flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-none",
				// Reserve room inside the scroll box for each trigger's focus ring: `overflow-x-auto`
				// promotes `overflow-y` to `auto`, which would otherwise clip the `ring-4` box-shadow.
				// The negative margin cancels the padding so the header layout is unchanged. `min-w-0`
				// lets the list shrink (and thus scroll) inside the flex `CodeBlock.Header`.
				"-m-1 p-1",
				className,
			)}
			ref={ref}
			{...props}
			onFocus={composeHandlers(onFocus, listProps.onFocus)}
			onMouseDown={composeHandlers(onMouseDown, listProps.onMouseDown)}
		/>
	);
};

type CodeBlockTabTriggerProps = ComponentProps<"button"> &
	WithDataSlot & {
		/** The value that joins the trigger to its `CodeBlock.TabContent`. */
		value: string;
	};

/**
 * A pill-styled tab trigger for the `CodeBlock` header.
 * Must be rendered within a `CodeBlock.TabList`.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblocktabtrigger
 *
 * @example
 * ```tsx
 * <CodeBlock.TabList>
 *   <CodeBlock.TabTrigger value="yml">policy.yml</CodeBlock.TabTrigger>
 *   <CodeBlock.TabTrigger value="json">policy.json</CodeBlock.TabTrigger>
 * </CodeBlock.TabList>
 * ```
 */
const TabTrigger = ({
	"data-slot": dataSlot,
	className,
	disabled = false,
	onBlur,
	onClick,
	onFocus,
	onKeyDown,
	onMouseDown,
	ref,
	value,
	...props
}: CodeBlockTabTriggerProps) => {
	const tabProps = getTabProps(useCodeBlockTabs("CodeBlock.TabTrigger"), { value, disabled });
	return (
		<button
			type="button"
			{...tabProps}
			data-slot={joinDataSlot(dataSlot, "code-block-tab-trigger")}
			className={cx(
				"shrink-0 cursor-pointer rounded px-1.5 py-0.5 font-sans text-xs font-medium whitespace-nowrap",
				"text-gray-600 outline-hidden",
				"hover:text-gray-900",
				"aria-selected:bg-neutral-500/15 aria-selected:text-strong",
				"focus-visible:focus-ring",
				className,
			)}
			{...props}
			onClick={onClick}
			onBlur={composeHandlers(onBlur, tabProps.onBlur)}
			onFocus={composeHandlers(onFocus, tabProps.onFocus)}
			onKeyDown={composeHandlers(onKeyDown, tabProps.onKeyDown)}
			onMouseDown={composeHandlers(onMouseDown, tabProps.onMouseDown)}
			ref={useComposedRefs(ref, tabProps.ref)}
		/>
	);
};

type CodeBlockTabContentProps = ComponentProps<"div"> &
	WithDataSlot & {
		/** The value of the trigger that shows this content. */
		value: string;
	};

/**
 * Conditionally renders its children when the associated tab is active.
 * Pair with `CodeBlock.TabList` and `CodeBlock.TabTrigger` in the header,
 * and set `defaultTab` / `activeTab` on `CodeBlock.Root`.
 *
 * @see https://mantle.ngrok.com/components/data-display/code-block#codeblocktabcontent
 *
 * @example
 * ```tsx
 * <CodeBlock.Body>
 *   <CodeBlock.CopyButton />
 *   <CodeBlock.TabContent value="yml">
 *     <CodeBlock.Code value={ymlValue} />
 *   </CodeBlock.TabContent>
 *   <CodeBlock.TabContent value="json">
 *     <CodeBlock.Code value={jsonValue} />
 *   </CodeBlock.TabContent>
 * </CodeBlock.Body>
 * ```
 */
const TabContent = ({
	children,
	"data-slot": dataSlot,
	value,
	...props
}: CodeBlockTabContentProps) => {
	const { shown, panelProps } = getTabPanelProps(useCodeBlockTabs("CodeBlock.TabContent"), {
		value,
	});
	return (
		<div {...panelProps} data-slot={joinDataSlot(dataSlot, "code-block-tab-content")} {...props}>
			{shown && children}
		</div>
	);
};

export {
	//,
	Root,
	Body,
	Code,
	CopyButton,
	ExpanderButton,
	Header,
	CodeBlockIconComponent,
	TabContent,
	TabList,
	TabTrigger,
	Title,
};
