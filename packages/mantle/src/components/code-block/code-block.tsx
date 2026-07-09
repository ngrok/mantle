"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { FileTextIcon } from "@phosphor-icons/react/FileText";
import { TerminalIcon } from "@phosphor-icons/react/Terminal";
import type {
	ComponentProps,
	ComponentRef,
	Dispatch,
	HTMLAttributes,
	ReactNode,
	SetStateAction,
} from "react";
import {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Content as RadixTabsContent,
	List as RadixTabsList,
	Root as RadixTabsRoot,
	Trigger as RadixTabsTrigger,
} from "@radix-ui/react-tabs";
import assert from "tiny-invariant";
import { useCopyToClipboard } from "../../hooks/use-copy-to-clipboard.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon as MantleIcon } from "../icon/icon.js";
import type { SvgAttributes } from "../icon/types.js";
import { TrafficPolicyFileIcon } from "../icons/traffic-policy-file.js";
import { IconButton } from "../button/icon-button.js";
import { Slot } from "../slot/index.js";
import { escapeHtml } from "./escape-html.js";
import type { Mode } from "./resolve-pre-rendered-props.js";
import type { MantleCodeBlockValue } from "./mantle-code.js";

type CodeBlockContextType = {
	codeId: string | undefined;
	copyTextRef: { current: string };
	hasCodeExpander: boolean;
	isCodeExpanded: boolean;
	registerCodeId: (id: string) => void;
	setHasCodeExpander: (value: boolean) => void;
	setIsCodeExpanded: Dispatch<SetStateAction<boolean>>;
	unregisterCodeId: (id: string) => void;
};

const CodeBlockContext = createContext<CodeBlockContextType | null>(null);

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
	};

/**
 * Shiki-powered code blocks with build-time syntax highlighting and zero browser bundle.
 * This is the root component for all CodeBlock components.
 *
 * For tabbed code blocks, pass `defaultTab` (uncontrolled) or `activeTab` / `onActiveTabChange`
 * (controlled) to enable tab switching with `CodeBlock.TabList` and `CodeBlock.TabContent`.
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
const Root = forwardRef<ComponentRef<"div">, CodeBlockRootProps>(
	({ asChild = false, className, defaultTab, activeTab, onActiveTabChange, ...props }, ref) => {
		const copyTextRef = useRef("");
		const [hasCodeExpander, setHasCodeExpander] = useState(false);
		const [isCodeExpanded, setIsCodeExpanded] = useState(false);
		const [codeId, setCodeId] = useState<string | undefined>(undefined);

		const registerCodeId = useCallback((id: string) => {
			setCodeId((old) => {
				assert(old == null, "You can only render a single CodeBlock.Code within a CodeBlock.");
				return id;
			});
		}, []);

		const unregisterCodeId = useCallback((id: string) => {
			setCodeId((old) => {
				assert(old === id, "You can only render a single CodeBlock.Code within a CodeBlock.");
				return undefined;
			});
		}, []);

		const context: CodeBlockContextType = useMemo(
			() =>
				({
					codeId,
					copyTextRef,
					hasCodeExpander,
					isCodeExpanded,
					registerCodeId,
					setHasCodeExpander,
					setIsCodeExpanded,
					unregisterCodeId,
				}) as const,
			[codeId, hasCodeExpander, isCodeExpanded, registerCodeId, unregisterCodeId],
		);

		const hasTabs = defaultTab != null || activeTab != null;
		const Component = asChild ? Slot : "div";

		const tree = (
			<Component
				data-slot="code-block"
				className={cx(
					"text-mono w-full overflow-hidden rounded-md border border-gray-300 bg-card font-mono",
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
					<RadixTabsRoot
						asChild
						defaultValue={defaultTab}
						value={activeTab}
						onValueChange={onActiveTabChange}
					>
						{tree}
					</RadixTabsRoot>
				) : (
					tree
				)}
			</CodeBlockContext.Provider>
		);
	},
);
Root.displayName = "CodeBlock";

/**
 * The body of the `CodeBlock`. This is where `CodeBlock.Code` and
 * the optional `CodeBlock.CopyButton` are rendered.
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
const Body = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild = false, className, ...props }, ref) => {
		const Component = asChild ? Slot : "div";
		return (
			<Component
				data-slot="code-block-body"
				className={cx("relative", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Body.displayName = "CodeBlockBody";

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
 * legacy `SHIKI_VAL_<n>` pattern when no token is provided.
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
function substituteTemplateVals(
	input: string,
	vals: unknown[],
	preValToken: string | undefined,
	mapValue: (value: unknown) => string,
): string {
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
	return substituteTemplateVals(html, vals, preValToken, (value) => escapeHtml(String(value)));
}

/** Substitutes placeholder tokens in plain text (for the copy button), without HTML escaping. */
function substitutePreValsPlainText(
	text: string,
	vals: unknown[],
	preValToken: string | undefined,
): string {
	return substituteTemplateVals(text, vals, preValToken, (value) => String(value));
}

type CodeBlockCodeProps = Omit<ComponentProps<"pre">, "children"> & {
	/**
	 * The code value produced by `mantleCode("lang")` tagged template.
	 * Contains pre-rendered Shiki HTML (when the Vite plugin is active) and
	 * the original code string for the copy button.
	 */
	value: MantleCodeBlockValue;
};

/**
 * The `CodeBlock` content. Renders pre-highlighted code from `mantleCode()`.
 *
 * `value["~preHtml"]` must be provided by Mantle's Vite plugin or server highlighter.
 * Runtime highlighting and runtime line decoration are intentionally unsupported.
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
const Code = forwardRef<ComponentRef<"pre">, CodeBlockCodeProps>(
	({ className, style, tabIndex, value, ...props }, ref) => {
		const id = useId();
		const { copyTextRef, hasCodeExpander, isCodeExpanded, registerCodeId, unregisterCodeId } =
			useCodeBlockContext();
		const {
			language,
			code,
			"~preValToken": __preValToken,
			"~preVals": __preVals,
			"~highlightLines": __highlightLines,
			"~lineNumberStart": __lineNumberStart,
			"~preHtml": __preHtml,
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

		useEffect(() => {
			registerCodeId(id);

			return () => {
				unregisterCodeId(id);
			};
		}, [id, registerCodeId, unregisterCodeId]);

		const renderedHtml = useMemo(() => {
			if (__preHtml == null) {
				return undefined;
			}
			return __preVals != null && __preVals.length > 0
				? substitutePreVals(__preHtml, __preVals, __preValToken)
				: __preHtml;
		}, [__preHtml, __preValToken, __preVals]);

		const isPreRendered = renderedHtml != null;
		const displayHtml = renderedHtml ?? escapeHtml(copyText);

		return (
			<pre
				data-slot="code-block-code"
				aria-expanded={hasCodeExpander ? isCodeExpanded : undefined}
				className={cx(
					"scrollbar overflow-x-auto overflow-y-hidden py-4",
					!isPreRendered && "pr-14",
					"data-[mantle-line-numbers~='false']:pl-4",
					"text-mono m-0 font-mono",
					"aria-collapsed:max-h-[13.6rem]",
					className,
				)}
				data-highlighted={isPreRendered ? "true" : "false"}
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
				id={id}
				ref={ref}
				style={
					{
						...style,
						"--mantle-line-number-start": String(effectiveLineNumberStart),
						tabSize: 2,
						MozTabSize: 2,
					} as ComponentProps<"pre">["style"]
				}
				tabIndex={tabIndex ?? -1}
				{...props}
			>
				<code
					className="text-size-inherit block min-w-full w-max"
					dangerouslySetInnerHTML={{ __html: displayHtml }}
				/>
			</pre>
		);
	},
);
Code.displayName = "CodeBlockCode";

/**
 * The (optional) header slot of the `CodeBlock`. This is where
 * `CodeBlock.Icon` and `CodeBlock.Title` are rendered.
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
const Header = forwardRef<ComponentRef<"div">, ComponentProps<"div"> & WithAsChild>(
	({ asChild = false, className, ...props }, ref) => {
		const Component = asChild ? Slot : "div";
		return (
			<Component
				data-slot="code-block-header"
				className={cx(
					"flex items-center gap-1 border-b border-gray-300 bg-base px-4 py-2 text-gray-700",
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Header.displayName = "CodeBlockHeader";

/**
 * The (optional) title of the `CodeBlock`. Renders as `h3` by default;
 * use `asChild` to render a different element.
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
const Title = forwardRef<
	HTMLHeadingElement,
	HTMLAttributes<HTMLHeadingElement> & { asChild?: boolean }
>(({ asChild = false, className, ...props }, ref) => {
	const Component = asChild ? Slot : "h3";
	return (
		<Component
			data-slot="code-block-title"
			ref={ref}
			className={cx("text-mono m-0 font-mono font-normal", className)}
			{...props}
		/>
	);
});
Title.displayName = "CodeBlockTitle";

type CodeBlockCopyButtonProps = Omit<ComponentProps<"button">, "children" | "type"> & {
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
 * The (optional) copy button of the `CodeBlock`. Copies the code content
 * to the clipboard when clicked.
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
const CopyButton = forwardRef<ComponentRef<"button">, CodeBlockCopyButtonProps>(
	({ className, onCopy, onCopyError, onClick, ...props }, ref) => {
		const { copyTextRef } = useCodeBlockContext();
		const [, copyToClipboard] = useCopyToClipboard();
		const [wasCopied, setWasCopied] = useState(false);
		const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

		useEffect(() => {
			return () => {
				if (timeoutHandle.current != null) {
					clearTimeout(timeoutHandle.current);
				}
			};
		}, []);

		return (
			<span data-slot="code-block-copy-button" className="absolute right-2.5 top-2.5 z-10 bg-card">
				<IconButton
					type="button"
					appearance="ghost"
					size="sm"
					label="Copy code"
					icon={wasCopied ? <CheckIcon /> : <CopyIcon />}
					className={className}
					ref={ref}
					onClick={async (event) => {
						try {
							onClick?.(event);
							if (event.defaultPrevented) {
								if (timeoutHandle.current != null) {
									clearTimeout(timeoutHandle.current);
								}
								return;
							}
							const text = copyTextRef.current;
							await copyToClipboard(text);
							onCopy?.(text);
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
	},
);
CopyButton.displayName = "CodeBlockCopyButton";

type CodeBlockExpanderButtonProps = Omit<
	ComponentProps<"button">,
	"children" | "aria-controls" | "aria-expanded"
> &
	WithAsChild;

/**
 * The (optional) expander button of the `CodeBlock`. Toggles the expanded
 * state of the code block. When present, the code block is collapsible.
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
const ExpanderButton = forwardRef<ComponentRef<"button">, CodeBlockExpanderButtonProps>(
	({ asChild = false, className, onClick, ...props }, ref) => {
		const { codeId, isCodeExpanded, setIsCodeExpanded, setHasCodeExpander } = useCodeBlockContext();

		useEffect(() => {
			setHasCodeExpander(true);
			return () => {
				setHasCodeExpander(false);
			};
		}, [setHasCodeExpander]);

		const Component = asChild ? Slot : "button";

		return (
			<Component
				{...props}
				data-slot="code-block-expander-button"
				aria-controls={codeId}
				aria-expanded={isCodeExpanded}
				className={cx(
					"flex w-full items-center justify-center gap-0.5 border-t border-gray-300 bg-card px-4 py-2 font-sans text-gray-700 hover:bg-gray-100",
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
					className={cx("size-4", isCodeExpanded && "rotate-180", "transition-all duration-150")}
				/>
			</Component>
		);
	},
);
ExpanderButton.displayName = "CodeBlockExpanderButton";

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
				preset?: undefined | never;
		  }
		| {
				/**
				 * A custom icon SVG to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				svg?: undefined | never;
				/**
				 * A preset icon to display in the code block header.
				 * (Pass only one of `svg` or `preset`.)
				 */
				preset: Mode;
		  }
	);

/**
 * A small icon for the `CodeBlock` header. Pass either a custom `svg`
 * or a `preset` value (not both).
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
	return <MantleIcon data-slot="code-block-icon" className={className} svg={svg} {...props} />;
}
CodeBlockIconComponent.displayName = "CodeBlockIcon";

type CodeBlockTabListProps = Omit<ComponentProps<typeof RadixTabsList>, "asChild" | "loop">;

/**
 * A tab list for the `CodeBlock` header. Renders pill-styled tab triggers
 * that switch which code is displayed. Built on Radix Tabs primitives.
 *
 * Place this inside `CodeBlock.Header` and pair with `CodeBlock.TabContent`
 * in `CodeBlock.Body` to conditionally render code based on the active tab.
 * Tab state is managed by `CodeBlock.Root` via `defaultTab` / `activeTab` / `onActiveTabChange`.
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
const TabList = forwardRef<ComponentRef<typeof RadixTabsList>, CodeBlockTabListProps>(
	({ className, ...props }, ref) => (
		<RadixTabsList
			data-slot="code-block-tab-list"
			className={cx("flex items-center gap-1", className)}
			ref={ref}
			{...props}
		/>
	),
);
TabList.displayName = "CodeBlockTabList";

type CodeBlockTabTriggerProps = Omit<ComponentProps<typeof RadixTabsTrigger>, "asChild">;

/**
 * A pill-styled tab trigger for the `CodeBlock` header.
 * Must be rendered within a `CodeBlock.TabList`.
 *
 * @example
 * ```tsx
 * <CodeBlock.TabList>
 *   <CodeBlock.TabTrigger value="yml">policy.yml</CodeBlock.TabTrigger>
 *   <CodeBlock.TabTrigger value="json">policy.json</CodeBlock.TabTrigger>
 * </CodeBlock.TabList>
 * ```
 */
const TabTrigger = forwardRef<ComponentRef<typeof RadixTabsTrigger>, CodeBlockTabTriggerProps>(
	({ className, ...props }, ref) => (
		<RadixTabsTrigger
			data-slot="code-block-tab-trigger"
			className={cx(
				"cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium",
				"text-gray-600 outline-hidden",
				"hover:text-gray-900",
				"data-[state=active]:bg-neutral-500/15 data-[state=active]:text-strong",
				"focus-visible:ring-focus-accent focus-visible:ring-4",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
TabTrigger.displayName = "CodeBlockTabTrigger";

type CodeBlockTabContentProps = Omit<
	ComponentProps<typeof RadixTabsContent>,
	"asChild" | "forceMount"
>;

/**
 * Conditionally renders its children when the associated tab is active.
 * Pair with `CodeBlock.TabList` and `CodeBlock.TabTrigger` in the header,
 * and set `defaultTab` / `activeTab` on `CodeBlock.Root`.
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
const TabContent = forwardRef<ComponentRef<typeof RadixTabsContent>, CodeBlockTabContentProps>(
	(props, ref) => <RadixTabsContent data-slot="code-block-tab-content" ref={ref} {...props} />,
);
TabContent.displayName = "CodeBlockTabContent";

/**
 * Shiki-powered code blocks with build-time syntax highlighting and zero browser bundle.
 *
 * Use `mantleCodeBlockPlugins()` to enable pre-rendering at build time.
 *
 * @example
 * Composition:
 * ```
 * # Standard
 * CodeBlock.Root
 * ├── CodeBlock.Header
 * │   ├── CodeBlock.Icon
 * │   └── CodeBlock.Title
 * ├── CodeBlock.Body
 * │   ├── CodeBlock.CopyButton
 * │   └── CodeBlock.Code
 * └── CodeBlock.ExpanderButton
 *
 * # Tabbed
 * CodeBlock.Root
 * ├── CodeBlock.Header
 * │   └── CodeBlock.TabList
 * │       └── CodeBlock.TabTrigger
 * ├── CodeBlock.Body
 * │   ├── CodeBlock.CopyButton
 * │   └── CodeBlock.TabContent
 * │       └── CodeBlock.Code
 * └── CodeBlock.ExpanderButton
 * ```
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
 *
 * // Server-highlighted HTML fetched via an action route + React Query mutation
 * const highlightMutation = useMutation({
 *   mutationFn: async () => {
 *     const response = await fetch("/api/shiki-highlight", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ code: source, language: "typescript" }),
 *     });
 *     return response.json();
 *   },
 * });
 *
 * const serverValue = createMantleCodeBlockValue({
 *   language: "typescript",
 *   code: source,
 *   preHtml: highlightMutation.data?.html,
 * });
 * ```
 */
const CodeBlock = {
	/**
	 * The root component of the `CodeBlock`.
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
	Root,
	/**
	 * The body of the `CodeBlock`. Contains `Code` and optional `CopyButton`.
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
	Body,
	/**
	 * The code content. Renders pre-highlighted Shiki HTML when the Vite plugin is active.
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
	Code,
	/**
	 * The optional copy button.
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
	CopyButton,
	/**
	 * The optional expander button for collapsible code blocks.
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
	ExpanderButton,
	/**
	 * The optional header slot for icon and title.
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
	Header,
	/**
	 * A small icon for the code block header. Use `preset` or `svg`.
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
	Icon: CodeBlockIconComponent,
	/**
	 * Conditionally renders children when the associated tab is active.
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
	TabContent,
	/**
	 * A tab list for the code block header. Renders pill-styled tabs for switching code.
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
	TabList,
	/**
	 * A pill-styled tab trigger for the code block header. Must be inside `TabList`.
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
	TabTrigger,
	/**
	 * The optional title rendered in the header.
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
	Title,
} as const;

export {
	//,
	CodeBlock,
};
