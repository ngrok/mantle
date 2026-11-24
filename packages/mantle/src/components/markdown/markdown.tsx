"use client";

import type { Token, Tokens } from "marked";
import {
	createContext,
	createElement,
	memo,
	use,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ComponentProps,
	type ReactNode,
} from "react";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { Anchor } from "../anchor/anchor.js";
import * as CodeBlock from "../code-block/code-block-parts.js";
import { defaultShowLineNumbers } from "../code-block/mantle-code.js";
import { parseLanguage } from "../code-block/supported-languages.js";
import { useCodeBlockStream } from "../code-block/use-code-block-stream.js";
import * as Table from "../table/table-parts.js";
import { INLINE_TAGS } from "./close-markdown.js";
import { decodeEntities } from "./decode-entities.js";
import type { MarkdownMathToken } from "./markdown-math.js";
import {
	createMarkdownParser,
	type MarkdownExtension,
	type MarkdownLinks,
} from "./markdown-parser.js";
import { safeUrl } from "./safe-url.js";
import { useFrameValue } from "./use-frame-value.js";

/** The token that each built-in component renders, by component name. */
type MarkdownTokens = {
	blockquote: Tokens.Blockquote;
	br: Tokens.Br;
	code: Tokens.Code;
	codespan: Tokens.Codespan;
	del: Tokens.Del;
	em: Tokens.Em;
	heading: Tokens.Heading;
	hr: Tokens.Hr;
	html: Tokens.HTML;
	image: Tokens.Image;
	link: Tokens.Link;
	list: Tokens.List;
	list_item: Tokens.ListItem;
	math: MarkdownMathToken;
	paragraph: Tokens.Paragraph;
	strong: Tokens.Strong;
	table: Tokens.Table;
};

/**
 * The props of one Markdown component: its token, and its content as mantle
 * renders it. `children` is empty for a token with no inline content, such as
 * `code`, `hr`, or `math`.
 */
type MarkdownComponentProps<T> = { token: T; children: ReactNode };

/**
 * The components that render each kind of token. A component you set
 * replaces the built-in one for its token. `extension` renders each token of
 * an extension that has no component of its own. Keep the object stable,
 * such as at module scope: a new object renders each block again.
 */
type MarkdownComponents = {
	[Name in keyof MarkdownTokens]?: (
		props: MarkdownComponentProps<MarkdownTokens[Name]>,
	) => ReactNode;
} & {
	extension?: (props: MarkdownComponentProps<Tokens.Generic>) => ReactNode;
};

const OPEN_TAG = /^<([a-z]+)\s*>$/i;
const CLOSE_TAG = /^<\/([a-z]+)\s*>$/i;
const BREAK_TAG = /^<br\s*\/?>$/i;
/** The inline HTML tags of code, keys, output, and variables. */
const CODE_TAGS = new Set(["kbd", "samp", "tt", "var"]);

/** Narrows a token to one kind. Why a guard: marked's token union holds a generic token whose `type` is any string, so a `switch` cannot narrow it. */
function isTokenOf<Name extends keyof MarkdownTokens | "table" | "list">(
	token: Token,
	type: Name,
): token is (MarkdownTokens & { table: Tokens.Table; list: Tokens.List })[Name] {
	return token.type === type;
}

function hasTokens(token: Token): token is Token & { tokens: Token[] } {
	return "tokens" in token && Array.isArray(token.tokens) && token.tokens.length > 0;
}

/**
 * Pairs each allowed inline opening tag in `tokens` with the tag that closes
 * it, by index. Why one pass: a scan for each opening tag is quadratic in an
 * answer with many unclosed tags.
 */
function pairInlineTags(tokens: readonly Token[]): Map<number, number> {
	const pairs = new Map<number, number>();
	const open = new Map<string, number[]>();
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token?.type !== "html") {
			continue;
		}
		const opening = OPEN_TAG.exec(token.raw)?.[1]?.toLowerCase();
		if (opening != null && INLINE_TAGS.has(opening)) {
			const stack = open.get(opening) ?? [];
			stack.push(index);
			open.set(opening, stack);
			continue;
		}
		const closing = CLOSE_TAG.exec(token.raw)?.[1]?.toLowerCase();
		const start = closing == null ? undefined : open.get(closing)?.pop();
		if (start !== undefined) {
			pairs.set(start, index);
		}
	}
	return pairs;
}

/**
 * Returns a run of nodes that a browser translation engine cannot break. A
 * lone node stays as it is, so React writes lone text through `textContent`.
 * In a run, each text is wrapped in a `span`. Why: the engine reparents a text
 * node, and React then throws when it removes the text or inserts before it.
 */
function translationSafeRun(nodes: ReactNode[]): ReactNode {
	// Why without `null`: a blank line or a definition renders nothing, and must not cost lone text its fast path.
	const rendered = nodes.filter((node) => node != null);
	if (rendered.length === 1) {
		return rendered[0];
	}
	// Why a `text-` key: an element's key is its token index, and a text must not take the same key.
	return nodes.map((node, index) =>
		// oxlint-disable-next-line react/no-array-index-key -- Why: a text has no identity but its position, as each token's key is.
		typeof node === "string" ? <span key={`text-${index}`}>{node}</span> : node,
	);
}

/** The deepest inline HTML tag that renders as an element. Why: each level recurses, and deep nesting overflows the stack. */
const MAX_TAG_DEPTH = 32;

/**
 * Renders a run of inline tokens, with the inline HTML tags that an answer
 * may use as elements. `depth` counts the tags around the run.
 */
function renderInline(
	tokens: readonly Token[],
	components: MarkdownComponents,
	depth = 0,
): ReactNode {
	const nodes: ReactNode[] = [];
	let pairs: Map<number, number> | undefined;
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token == null) {
			continue;
		}
		// Why only without an `html` component: a component replaces the built-in tags too.
		if (token.type === "html" && !token.block && components.html == null) {
			const tag = OPEN_TAG.exec(token.raw)?.[1]?.toLowerCase();
			const close =
				tag != null && INLINE_TAGS.has(tag) && depth < MAX_TAG_DEPTH
					? (pairs ??= pairInlineTags(tokens)).get(index)
					: undefined;
			if (tag != null && close !== undefined) {
				nodes.push(
					createElement(
						tag === "tt" ? "code" : tag,
						// Why: a browser translation must not change a key name, code, output, or a variable.
						{ key: index, translate: CODE_TAGS.has(tag) ? "no" : undefined },
						renderInline(tokens.slice(index + 1, close), components, depth + 1),
					),
				);
				index = close;
				continue;
			}
			nodes.push(BREAK_TAG.test(token.raw) ? <br key={index} /> : token.raw);
			continue;
		}
		nodes.push(renderToken(token, index, components));
	}
	return translationSafeRun(nodes);
}

/**
 * The plain text of inline tokens, as the text renders: formatting markers
 * and inline HTML tags drop, and character references decode.
 */
function plainText(tokens: readonly Token[]): string {
	let text = "";
	for (const token of tokens) {
		if (hasTokens(token)) {
			text += plainText(token.tokens);
		} else if (token.type === "text" || token.type === "escape") {
			text += decodeEntities(token.text);
		} else if (token.type === "codespan") {
			text += token.text;
		}
	}
	return text;
}

/** Renders the block tokens inside a blockquote or a list item. */
function renderBlocks(tokens: readonly Token[], components: MarkdownComponents): ReactNode {
	return translationSafeRun(tokens.map((token, index) => renderToken(token, index, components)));
}

/** Renders the content of a token: blocks for a blockquote or a list item, else inline tokens. */
function renderChildren(token: Token, components: MarkdownComponents): ReactNode {
	if (!hasTokens(token)) {
		return null;
	}
	return token.type === "blockquote" || token.type === "list_item"
		? renderBlocks(token.tokens, components)
		: renderInline(token.tokens, components);
}

function cellClassName(align: "center" | "left" | "right" | null | undefined): string {
	// Why inherit: a `Table` cell is set in mono for data, and a cell of an answer is prose.
	return cx(
		"font-[inherit] text-[length:inherit] leading-[inherit]",
		align === "center" && "text-center",
		align === "right" && "text-right",
	);
}

/** The fence of a code token, rendered as a mantle `CodeBlock` that highlights as the code streams. */
function MarkdownCodeBlock({ token }: { token: Tokens.Code }) {
	const label = token.lang?.trim().split(/\s/, 1)[0] ?? "";
	const language = parseLanguage(label);
	const value = useCodeBlockStream({
		code: token.text,
		language,
		showLineNumbers: defaultShowLineNumbers(language, token.text),
	});
	return (
		<CodeBlock.Root>
			{label !== "" && (
				<CodeBlock.Header>
					<CodeBlock.Title>{label}</CodeBlock.Title>
				</CodeBlock.Header>
			)}
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code value={value} />
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** A list item. A task item labels its checkbox with the item's text. */
function MarkdownListItemContent({ token, children }: MarkdownComponentProps<Tokens.ListItem>) {
	const labelId = useId();
	if (!token.task) {
		return <li>{children}</li>;
	}
	return (
		<li data-task="">
			<input
				type="checkbox"
				checked={token.checked === true}
				disabled
				readOnly
				aria-labelledby={labelId}
			/>
			{/* Why a wrapper: it names the checkbox, and it keeps the item's text off the checkbox's side. */}
			<span id={labelId}>{children}</span>
		</li>
	);
}

const defaultComponents: Required<Omit<MarkdownComponents, "extension" | "table">> = {
	blockquote: ({ children }) => <blockquote>{children}</blockquote>,
	br: () => <br />,
	code: ({ token }) => <MarkdownCodeBlock token={token} />,
	codespan: ({ token }) => <code translate="no">{token.text}</code>,
	del: ({ children }) => <del>{children}</del>,
	em: ({ children }) => <em>{children}</em>,
	heading: ({ token, children }) => createElement(`h${token.depth}`, null, children),
	hr: () => <hr />,
	// Why text: an answer's raw HTML never reaches the DOM as markup.
	html: ({ token }) => <p>{token.text}</p>,
	image: ({ token }) => {
		// Why no decode here: the lexer decodes character references, so a `&#106;avascript:` meets the check.
		const src = safeUrl(token.href, "image");
		// Why the tokens: `text` is the label's Markdown source, with its markers.
		const alt = plainText(token.tokens ?? []);
		if (src == null) {
			return alt === "" ? null : <span>{alt}</span>;
		}
		return (
			// oxlint-disable-next-line mantle/img-dimensions -- Why: Markdown carries no image size. A `components.image` that knows the size can set it.
			<img src={src} alt={alt} title={token.title ?? undefined} loading="lazy" decoding="async" />
		);
	},
	link: ({ token, children }) => {
		const href = safeUrl(token.href, "link");
		if (href == null) {
			return <span>{children}</span>;
		}
		// Why a new tab for an absolute or protocol-relative URL: an answer lives in a panel or a chat, and a full page load loses it.
		const isAbsolute = /^(?:[a-z][a-z\d+.-]*:|[/\\]{2})/i.test(href);
		return (
			<Anchor
				href={href}
				title={token.title ?? undefined}
				target={isAbsolute ? "_blank" : undefined}
			>
				{children}
			</Anchor>
		);
	},
	list: ({ token, children }) =>
		token.ordered ? (
			<ol start={token.start === "" || token.start === 1 ? undefined : token.start}>{children}</ol>
		) : (
			<ul>{children}</ul>
		),
	list_item: ({ token, children }) => (
		<MarkdownListItemContent token={token}>{children}</MarkdownListItemContent>
	),
	// Why a block `code` and not a `pre`: `$$…$$` can sit inside a paragraph, and a `pre` there breaks hydration.
	math: ({ token }) => (
		<code translate="no" className={cx(token.display && "block overflow-x-auto whitespace-pre")}>
			{token.text}
		</code>
	),
	paragraph: ({ children }) => <p>{children}</p>,
	strong: ({ children }) => <strong>{children}</strong>,
};

/** Renders a GitHub table as mantle's `Table`, with each column's alignment. */
function renderTable(token: Tokens.Table, components: MarkdownComponents) {
	return (
		<Table.Root>
			<Table.Element>
				<Table.Head>
					<Table.Row>
						{token.header.map((cell, column) => (
							<Table.Header
								// oxlint-disable-next-line react/no-array-index-key -- Why: a column has no identity but its position.
								key={column}
								className={cellClassName(cell.align)}
							>
								{renderInline(cell.tokens, components)}
							</Table.Header>
						))}
					</Table.Row>
				</Table.Head>
				<Table.Body>
					{token.rows.map((row, rowIndex) => (
						// oxlint-disable-next-line react/no-array-index-key -- Why: a row has no identity but its position, and streamed rows only append.
						<Table.Row key={rowIndex}>
							{row.map((cell, column) => (
								<Table.Cell
									// oxlint-disable-next-line react/no-array-index-key -- Why: a column has no identity but its position.
									key={column}
									className={cellClassName(cell.align)}
								>
									{renderInline(cell.tokens, components)}
								</Table.Cell>
							))}
						</Table.Row>
					))}
				</Table.Body>
			</Table.Element>
		</Table.Root>
	);
}

/** Renders one token with its component, and its content as children. */
function renderToken(token: Token, key: number, components: MarkdownComponents): ReactNode {
	if (token.type === "space" || token.type === "def" || token.type === "checkbox") {
		return null;
	}
	if (token.type === "text" || token.type === "escape") {
		if (hasTokens(token)) {
			return renderInline(token.tokens, components);
		}
		// Why `text`: an escape token's `text` drops its backslash.
		return decodeEntities(
			"text" in token && typeof token.text === "string" ? token.text : token.raw,
		);
	}
	if (isTokenOf(token, "table")) {
		return <TableBlock key={key} token={token} components={components} />;
	}
	if (isTokenOf(token, "list")) {
		return <MarkdownList key={key} token={token} components={components} />;
	}
	if (isComponentName(token.type)) {
		const component: (props: MarkdownComponentProps<never>) => ReactNode =
			components[token.type] ?? defaultComponents[token.type];
		return renderComponent(component, { key, token, children: renderChildren(token, components) });
	}
	if (components.extension != null) {
		return renderComponent(components.extension, { key, token, children: null });
	}
	return token.raw;
}

const componentNames = new Set<string>([
	"blockquote",
	"br",
	"code",
	"codespan",
	"del",
	"em",
	"heading",
	"hr",
	"html",
	"image",
	"link",
	"list_item",
	"math",
	"paragraph",
	"strong",
]);

function isComponentName(type: string): type is Exclude<keyof MarkdownTokens, "list" | "table"> {
	return componentNames.has(type);
}

/**
 * Renders `component` as an element, so a component with hooks, such as the
 * code block, keeps its state. Why the loose type: each caller pairs a
 * component with the token type it renders.
 */
function renderComponent(
	component: (props: MarkdownComponentProps<never>) => ReactNode,
	{ key, token, children }: { key: number; token: Token; children: ReactNode },
): ReactNode {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Why: `renderToken` picks the component by `token.type`, which the token union cannot narrow through a lookup.
	return createElement(component as (props: MarkdownComponentProps<Token>) => ReactNode, {
		key,
		token,
		// oxlint-disable-next-line react/no-children-prop -- Why: `MarkdownComponentProps` requires `children`, and `createElement` checks the props object.
		children,
	});
}

/** A table block. Why a component: it renders `components.table` when set, and mantle's `Table` when not. */
function TableBlock({
	token,
	components,
}: {
	token: Tokens.Table;
	components: MarkdownComponents;
}) {
	if (components.table != null) {
		return renderComponent(components.table, { key: 0, token, children: null });
	}
	return renderTable(token, components);
}

const noComponents: MarkdownComponents = {};

/** Props of a memoized block. `links` changes only when a reference definition can change what the block reads. */
type BlockProps = { token: Token; components: MarkdownComponents; links: MarkdownLinks };

/**
 * Two renders of a block with the same source and context render the same
 * thing. Why compare `raw`: each update lexes the unfinished block again, so
 * its tokens are new objects even where its text did not change.
 */
function isSameBlock(previous: BlockProps, next: BlockProps): boolean {
	return (
		previous.components === next.components &&
		previous.links === next.links &&
		(previous.token === next.token ||
			(previous.token.raw === next.token.raw &&
				looseness(previous.token) === looseness(next.token)))
	);
}

/** Whether a list item is loose. Why: a blank line later in the list makes each item loose, with no change to its source. */
function looseness(token: Token): boolean | undefined {
	return isTokenOf(token, "list_item") ? token.loose : undefined;
}

/**
 * One top-level block. Why `memo`: a finished block keeps its token, so it
 * never renders again while the answer streams. Why a `<p>` for text: the
 * blocks of a group have no parent element of their own.
 */
const MarkdownBlock = memo(function MarkdownBlock({ token, components }: BlockProps) {
	const node = renderToken(token, 0, components);
	return typeof node === "string" ? <p>{node}</p> : node;
}, isSameBlock);

/** How many blocks render in one group. */
const GROUP_SIZE = 16;

/** Props of a group of blocks. `start` is the index of its first block in the answer. */
type GroupProps = {
	blocks: readonly Token[];
	start: number;
	components: MarkdownComponents;
	links: MarkdownLinks;
};

/**
 * Two renders of a group show the same blocks. Why the ends only: a block
 * in a full group has finished, and a finished block keeps its token object.
 */
function isSameGroup(previous: GroupProps, next: GroupProps): boolean {
	return (
		previous.components === next.components &&
		previous.links === next.links &&
		previous.blocks.length === next.blocks.length &&
		previous.blocks[0] === next.blocks[0] &&
		previous.blocks.at(-1) === next.blocks.at(-1)
	);
}

/**
 * A run of blocks, with no element of its own. Why groups: each update then
 * compares one group for each 16 blocks, and renders only the last group,
 * which holds the unfinished block. That block stays in its group when it
 * finishes, so it keeps its parent and its key, and never remounts.
 */
const MarkdownGroup = memo(function MarkdownGroup({
	blocks,
	start,
	components,
	links,
}: GroupProps) {
	return blocks.map((token, index) => (
		<MarkdownBlock
			// oxlint-disable-next-line react/no-array-index-key -- Why: a block keeps its index from when it starts to stream to when it finishes, so it never remounts.
			key={start + index}
			token={token}
			components={components}
			links={links}
		/>
	));
}, isSameGroup);

/**
 * The reference definitions of the answer. Why a context: a list can sit
 * deep in a block, and its items compare `links` to render again when a
 * definition resolves one of their reference links.
 */
const LinksContext = createContext<MarkdownLinks>(Object.create(null));

/** One list item. Why `memo`: a long list streams one item at a time, and the items above it keep their source. */
const MarkdownListItem = memo(function MarkdownListItem({ token, components }: BlockProps) {
	return renderToken(token, 0, components);
}, isSameBlock);

/** A list, with each item memoized. */
function MarkdownList({
	token,
	components,
}: {
	token: Tokens.List;
	components: MarkdownComponents;
}) {
	const links = use(LinksContext);
	return renderComponent(components.list ?? defaultComponents.list, {
		key: 0,
		token,
		children: token.items.map((item, index) => (
			<MarkdownListItem
				// oxlint-disable-next-line react/no-array-index-key -- Why: an item has no identity but its position, and streamed items only append.
				key={index}
				token={item}
				components={components}
				links={links}
			/>
		)),
	});
}

/** One block that finished, for `onBlockComplete`. */
type MarkdownBlockEvent = {
	/** The block's index in the answer. */
	index: number;
	/** The block's marked token, such as `{ type: "paragraph", raw, tokens }`. */
	token: Token;
};

/** Props for {@link Markdown}. Other props go to the root `div`. */
type MarkdownProps = Omit<ComponentProps<"div">, "children"> &
	WithDataSlot & {
		/** The Markdown so far. While it streams, each update appends to it. */
		children: string;
		/**
		 * Whether more Markdown can arrive. While `true`, unfinished syntax at the
		 * end renders closed, updates render at most once per frame, and a caret
		 * shows at the end. When it turns `false`, the whole answer parses once
		 * more, so a reference link that comes before its definition resolves.
		 *
		 * @default false
		 */
		streaming?: boolean;
		/** The components that replace the built-in one for a token. Keep the object stable. */
		components?: MarkdownComponents;
		/**
		 * Extensions that read more kinds of tokens, such as `markdownMath()`. Keep the array stable: a new
		 * array parses the whole answer again.
		 */
		extensions?: readonly MarkdownExtension[];
		/** Called once for each block that finishes after mount, in order, after the render that shows it. */
		onBlockComplete?: (block: MarkdownBlockEvent) => void;
		/** Called once when `streaming` turns from `true` to `false`, after the final render. */
		onStreamEnd?: () => void;
	};

/**
 * Renders Markdown from a model, as it streams. Mantle parts render it out
 * of the box: `CodeBlock` for a fence, highlighted as the code arrives,
 * `Table` for a table, and `Anchor` for a link.
 *
 * Each update lexes only the unfinished block at the end, so a long answer
 * costs the same for each update as a short one. A finished block never
 * renders again. Unfinished syntax, such as `**bol` or an open fence, renders
 * closed. Updates render at most once per animation frame.
 *
 * The output is React elements, never `innerHTML`. Raw HTML shows as text,
 * except inline tags such as `<sub>`, `<kbd>`, and `<br>`. A link or an image
 * with a scheme other than `http:`, `https:`, `mailto:`, or `tel:` renders as
 * text, so `javascript:` URLs never reach the DOM. An absolute link opens in a
 * new tab.
 *
 * While `streaming`, the root is `aria-busy`. The answer is not a live region:
 * a screen reader does not read it as it streams. Announce the start and the
 * end of an answer from one status region that the chat owns.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"markdown"` | The root. The prose styles in `mantle.css` match it. |
 * | `data-streaming` | `""` | Present while `streaming`. Shows the caret. |
 * | `data-streamed` | `""` | Present once the answer has streamed on this page. A new block fades in. |
 * | `data-task` | `""` | On a task-list item, which holds a checkbox. |
 *
 * @useWhen Render Markdown that arrives at runtime, such as a model's answer, as it streams or after.
 *
 * @siblings
 * - `CodeBlock`: the content is one block of code.
 * - `Typography`: you write the prose in the source.
 *
 * @see https://mantle.ngrok.com/components/data-display/markdown
 *
 * @example
 * ```tsx
 * import { Markdown } from "@ngrok/mantle/markdown";
 *
 * function Answer({ text, isStreaming }: { text: string; isStreaming: boolean }) {
 *   return <Markdown streaming={isStreaming}>{text}</Markdown>;
 * }
 * ```
 */
function Markdown({
	children,
	streaming = false,
	components,
	extensions,
	onBlockComplete,
	onStreamEnd,
	className,
	"data-slot": dataSlot,
	...props
}: MarkdownProps) {
	const source = useFrameValue(children, { throttle: streaming });
	const parser = useMemo(() => createMarkdownParser({ extensions }), [extensions]);
	const snapshot = useMemo(() => parser.parse(source, { streaming }), [parser, source, streaming]);

	const isHydrated = useIsHydrated();
	const [hasStreamed, setHasStreamed] = useState(streaming);
	if (streaming && !hasStreamed) {
		setHasStreamed(true);
	}

	const completeEvent = useCallbackRef((count: number, from: number) => {
		for (let index = from; index < count; index += 1) {
			const token = snapshot.blocks[index];
			if (token != null) {
				onBlockComplete?.({ index, token });
			}
		}
	});
	const endEvent = useCallbackRef(() => {
		onStreamEnd?.();
	});
	const reportedRef = useRef(snapshot.completeCount);
	const wasStreamingRef = useRef(streaming);
	useEffect(() => {
		if (snapshot.completeCount > reportedRef.current) {
			completeEvent(snapshot.completeCount, reportedRef.current);
		}
		reportedRef.current = snapshot.completeCount;
		if (wasStreamingRef.current && !streaming) {
			endEvent();
		}
		wasStreamingRef.current = streaming;
	}, [snapshot, streaming, completeEvent, endEvent]);

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "markdown")}
			data-streaming={streaming ? "" : undefined}
			// Why apart from `data-streaming`: the fade rule restyles each block when its attribute changes,
			// so it turns on once, while the answer is short. Why after hydration: a block that the server
			// rendered must not fade in.
			data-streamed={hasStreamed && isHydrated ? "" : undefined}
			aria-busy={streaming || undefined}
			className={cx("min-w-0 wrap-break-word", className)}
			{...props}
		>
			<LinksContext value={snapshot.links}>
				{Array.from({ length: Math.ceil(snapshot.blocks.length / GROUP_SIZE) }, (_, group) => (
					<MarkdownGroup
						// oxlint-disable-next-line react/no-array-index-key -- Why: a group holds the same blocks for the life of the answer.
						key={group}
						blocks={snapshot.blocks.slice(group * GROUP_SIZE, (group + 1) * GROUP_SIZE)}
						start={group * GROUP_SIZE}
						components={components ?? noComponents}
						links={snapshot.links}
					/>
				))}
			</LinksContext>
		</div>
	);
}

export {
	//,
	Markdown,
};

export type {
	//,
	MarkdownBlockEvent,
	MarkdownComponentProps,
	MarkdownComponents,
	MarkdownProps,
	MarkdownTokens,
};
