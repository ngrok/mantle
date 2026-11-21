import type { ComponentProps, PropsWithChildren } from "react";

import { MDXProvider as MdxProviderPrimitive } from "@mdx-js/react";
import { Alert } from "@ngrok/mantle/alert";
import { Anchor } from "@ngrok/mantle/anchor";
import { Code } from "@ngrok/mantle/code";
import {
	CodeBlock,
	createMantleCodeBlockValue,
	hasMoreThanNLines,
	resolvePreRenderedCodeBlockProps,
	type CodeBlockPreElementInput,
} from "@ngrok/mantle/code-block";
import { cx } from "@ngrok/mantle/cx";
import { Table } from "@ngrok/mantle/table";
import { Typography } from "@ngrok/mantle/typography";
import { Link } from "react-router";
import { isSafeLocalPath } from "../utilities/is-safe-local-path";
import { isStaticResourcePath } from "../utilities/is-static-resource-path";
import { HashLinkHeading } from "./hash-link-heading";

// import { FigCaption, Figure } from "./figure";
// import { Img } from "./img";

type Props = PropsWithChildren;

type MDXComponents = Parameters<typeof MdxProviderPrimitive>[0]["components"];

let hasWarnedMalformedPreRenderedCodeBlock = false;

/** Logs a one-time dev warning when a pre-rendered code block payload is incomplete. */
function warnMalformedPreRenderedCodeBlock(rawLanguage: unknown) {
	if (!import.meta.env.DEV || hasWarnedMalformedPreRenderedCodeBlock) {
		return;
	}
	hasWarnedMalformedPreRenderedCodeBlock = true;
	console.warn(
		`[MdxProvider] Ignoring malformed pre-rendered code block payload (language=${String(rawLanguage)}). ` +
			"Falling back to plain <pre> rendering.",
	);
}

const components = {
	a: (props) => {
		const { node: _node, className, href, ...rest } = props;
		const mergedClassName = cx("hyphens-auto", className);

		if (isSafeLocalPath(href) && !isStaticResourcePath(href)) {
			return (
				<Anchor asChild className={mergedClassName}>
					<Link to={href} {...rest} />
				</Anchor>
			);
		}

		return <Anchor className={mergedClassName} href={href} {...rest} />;
	},
	blockquote: (props) => {
		const { node: _node, className, ...rest } = props;
		return (
			<blockquote
				className={cx(
					"border-l-4 border-accent-500 text-strong p-4 italic mb-6 [&_p]:mb-0",
					className,
				)}
				{...rest}
			/>
		);
	},
	caption: (props) => {
		const { node: _node, className, ...rest } = props;
		return (
			<Table.Caption className={cx("px-4 py-2 text-sm text-muted italic", className)} {...rest} />
		);
	},
	code: (props) => {
		const { node: _node, className, ...rest } = props;
		// Why break-word: in prose, a token wider than the line breaks, so a phone
		// never scrolls the page sideways. Unlike `anywhere`, it keeps a table
		// cell's minimum width, and a table cell keeps the code on one line.
		return (
			<Code
				className={cx(
					"wrap-break-word text-strong in-[td]:whitespace-nowrap in-[th]:whitespace-nowrap",
					className,
				)}
				{...rest}
			/>
		);
	},
	hr: (props) => {
		const { node: _node, className, ...rest } = props;
		return <hr className={cx("my-12 border-t border-gray-300", className)} {...rest} />;
	},
	h1: (props) => <MdxHeading as="h1" {...props} />,
	h2: (props) => <MdxHeading as="h2" {...props} />,
	h3: (props) => <MdxHeading as="h3" {...props} />,
	h4: (props) => <MdxHeading as="h4" {...props} />,
	h5: (props) => <MdxHeading as="h5" {...props} />,
	h6: (props) => <MdxHeading as="h6" {...props} />,
	// img: (props) => {
	// 	const { node: _node, ...rest } = props;
	// 	return <Img {...rest} />;
	// },
	li: (props) => {
		const { node: _node, className, ...rest } = props;
		return <li className={cx("wrap-break-word text-body", className)} {...rest} />;
	},
	ol: (props) => {
		const { node: _node, className, ...rest } = props;
		return <ol className={cx("mb-4 list-decimal pl-6 text-body", className)} {...rest} />;
	},
	p: (props) => {
		const { node: _node, className, ...rest } = props;
		return <Typography.P className={cx("mb-4 md:text-wrap", className)} {...rest} />;
	},
	pre: (props: ComponentProps<"pre"> & CodeBlockPreElementInput) => {
		const { children, className, indentation: _indentation, ...rawProps } = props;
		const { mantleCode: preRendered, props: rest } = resolvePreRenderedCodeBlockProps(rawProps);

		// Why overflow-x-auto: a fence in a language without highlighting renders
		// here, and a long line must scroll in the block, not widen the page.
		const fallbackClassName = cx(
			"scrollbar overflow-x-auto focus-visible:ring-2 focus-visible:focus-ring",
			className,
		);

		if (!preRendered) {
			return (
				// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Safari does not put a scroll container in the Tab order, so a keyboard could not scroll a long line into view
				<pre className={fallbackClassName} tabIndex={0} {...rest}>
					{children}
				</pre>
			);
		}

		const { code, language, preHtml } = preRendered;
		if (!code || !language || !preHtml) {
			warnMalformedPreRenderedCodeBlock(preRendered.rawLanguage);
			return (
				// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the same Safari gap as above
				<pre className={fallbackClassName} tabIndex={0} {...rest}>
					{children}
				</pre>
			);
		}

		const isLong = code.length > 400 && hasMoreThanNLines(code, 40);
		const collapsible = preRendered.collapsible ?? isLong;
		const disableCopy = preRendered.disableCopy ?? false;
		const mode = preRendered.mode;
		const title = preRendered.title;
		const shouldRenderHeader = mode != null || Boolean(title);

		const value = createMantleCodeBlockValue({
			language,
			code,
			highlightLines: preRendered.highlightLines,
			lineNumberStart: preRendered.lineNumberStart,
			preHtml,
			showLineNumbers: preRendered.showLineNumbers ?? true,
		});

		return (
			<CodeBlock.Root className={cx("mb-6", className)}>
				{shouldRenderHeader && (
					<CodeBlock.Header>
						{mode != null && <CodeBlock.Icon preset={mode} />}
						{title != null && title.length > 0 && <CodeBlock.Title>{title}</CodeBlock.Title>}
					</CodeBlock.Header>
				)}
				<CodeBlock.Body>
					{!disableCopy && <CodeBlock.CopyButton />}
					<CodeBlock.Code value={value} />
				</CodeBlock.Body>
				{collapsible && <CodeBlock.ExpanderButton />}
			</CodeBlock.Root>
		);
	},
	table: (props) => {
		const { node: _node, children, ...rest } = props;
		return (
			<Table.Root className="my-8">
				<Table.Element {...rest}>{children}</Table.Element>
			</Table.Root>
		);
	},
	tbody: (props) => {
		const { node: _node, ...rest } = props;
		return <Table.Body {...rest} />;
	},
	td: (props) => {
		const { node: _node, className, ...rest } = props;
		return (
			<Table.Cell className={cx("px-4 py-3 align-top font-sans text-sm", className)} {...rest} />
		);
	},
	tfoot: (props) => {
		const { node: _node, ...rest } = props;
		return <Table.Foot {...rest} />;
	},
	th: (props) => {
		const { node: _node, className, ...rest } = props;
		// `px-4` must equal the `px-4` on the `td` above, which widens prose tables past
		// the 12px component default.
		return <Table.Header className={cx("px-4", className)} {...rest} />;
	},
	thead: (props) => {
		const { node: _node, ...rest } = props;
		return <Table.Head {...rest} />;
	},
	tr: (props) => {
		const { node: _node, ...rest } = props;
		return <Table.Row {...rest} />;
	},
	ul: (props) => {
		const { node: _node, className, ...rest } = props;
		return <ul className={cx("mb-4 not-first:mt-4 list-disc pl-6", className)} {...rest} />;
	},

	// Custom components, these are globally available in MDX files
	GithubAlert,
} as const satisfies MDXComponents;

/**
 * MDX provider that maps common Markdown elements to Mantle UI components.
 *
 * @example
 * <MdxProvider>
 *   <PostContent /> // MDX-compiled React content
 * </MdxProvider>
 */
function MdxProvider({ children }: Props) {
	return <MdxProviderPrimitive components={components}>{children}</MdxProviderPrimitive>;
}

export {
	//,
	MdxProvider,
};

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type MdxHeadingProps = ComponentProps<"h1"> & {
	/**
	 * MDX passes the AST node as a prop, but we don't use it.
	 */
	node?: unknown;
	/**
	 * The HTML heading tag to render.
	 */
	as: HeadingTag;
};

/**
 * MDX heading component that delegates to {@link HashLinkHeading} for the
 * copy-to-clipboard anchor link behavior, applying MDX-specific sizing and
 * spacing classes.
 */
function MdxHeading({ as: Component, children, className, id, ...props }: MdxHeadingProps) {
	if (!id) {
		return (
			<Component className={className} {...props}>
				{children}
			</Component>
		);
	}

	const Heading = typographyHeadings[Component];

	return (
		<HashLinkHeading id={id}>
			<Heading
				className={cx(
					"mt-12 mb-4 [:is(h1,h2,h3,h4,h5,h6)+&]:mt-6",
					Component === "h1" && "mt-0",
					className,
				)}
				{...props}
			>
				{children}
			</Heading>
		</HashLinkHeading>
	);
}

/** The `Typography` part that renders each heading tag in its type role. */
const typographyHeadings = {
	h1: Typography.H1,
	h2: Typography.H2,
	h3: Typography.H3,
	h4: Typography.H4,
	h5: Typography.H5,
	h6: Typography.H6,
} as const satisfies Record<HeadingTag, unknown>;

type GitHubAlertTypes = "note" | "tip" | "important" | "warning" | "caution";

type AlertIntent = ComponentProps<typeof Alert.Root>["intent"];

const alertTypeIntents: Record<GitHubAlertTypes, AlertIntent> = {
	note: "info",
	tip: "success",
	important: "important",
	warning: "warning",
	caution: "danger",
};

/**
 * Whether a remark-github-alerts `type` string is one of the known GitHub
 * alert types (and therefore a key of {@link alertTypeIntents}).
 *
 * @example
 * ```ts
 * isGitHubAlertType("note"); // true
 * isGitHubAlertType("shrug"); // false
 * ```
 */
function isGitHubAlertType(type: string): type is GitHubAlertTypes {
	return type in alertTypeIntents;
}

type GithubAlertProps = ComponentProps<"div"> & {
	type: GitHubAlertTypes | (string & {});
};

/**
 * Renders a GitHub-style alert blockquote (e.g. `> [!NOTE]`).
 * Used as a custom MDX component mapped from the `remarkGithubAlerts` remark plugin.
 */
function GithubAlert({ className, type, children, ...props }: GithubAlertProps) {
	const intent = isGitHubAlertType(type) ? alertTypeIntents[type] : "info";

	return (
		<Alert.Root intent={intent} className={cx("mb-6", className)} {...props}>
			<Alert.Icon />
			<Alert.Content>
				<Alert.Title asChild>
					<p className="first-letter:uppercase">{type}</p>
				</Alert.Title>
				<Alert.Description className="[&>p:last-child]:mb-0">{children}</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	);
}
