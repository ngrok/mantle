import { Children, Fragment, isValidElement, type ReactNode } from "react";

/**
 * A validation message accepted by `Field.Errors`. Non-string absence values
 * are allowed so consumers can pass mapped validator output directly while
 * still rendering only real strings.
 */
type FieldErrorMessage = string | null | undefined | false;

type RenderableContentProps = { children?: ReactNode };

/**
 * Options for checking a manual `Field.ErrorList` subtree.
 */
type HasRenderableErrorListChildrenOptions = {
	/**
	 * The list children to inspect before rendering or wiring ARIA IDs.
	 */
	children: ReactNode;
	/**
	 * The local `Field.ErrorItem` component type from `field.tsx`. Passed in
	 * (rather than imported) to avoid a circular dependency between
	 * `field.tsx` and this helpers module.
	 */
	errorItemType: unknown;
};

/**
 * Normalizes validator output into display-ready message strings without
 * coupling `Field.Errors` to a specific form library's error object shape.
 */
const normalizeErrorMessages = (messages: readonly FieldErrorMessage[] | undefined) => {
	const normalizedMessages: string[] = [];
	const seenMessages = new Set<string>();

	for (const message of messages ?? []) {
		if (typeof message !== "string") {
			continue;
		}

		const normalizedMessage = message.trim();
		if (normalizedMessage.length === 0 || seenMessages.has(normalizedMessage)) {
			continue;
		}

		seenMessages.add(normalizedMessage);
		normalizedMessages.push(normalizedMessage);
	}

	return normalizedMessages;
};

/**
 * Returns `true` when the supplied children would produce visible content in
 * a `Field.ErrorItem` — i.e. they are not `null`, `undefined`, `false`, or a
 * whitespace-only string. Used by both `Field.ErrorItem`'s render guard and
 * the `Field.ErrorList` walker so an empty item is identified consistently.
 */
const isErrorItemRenderable = (children: ReactNode): boolean => {
	// Booleans (including `true`) render nothing in React, so a `cond && expr`
	// pattern that resolves to `true` would otherwise count as renderable here.
	if (children == null || typeof children === "boolean") {
		return false;
	}
	if (typeof children === "string" && children.trim().length === 0) {
		return false;
	}
	return true;
};

/**
 * Empty-detection walker for `Field.ErrorList`. Recurses through Fragments so
 * error items wrapped in conditional `<>…</>` still register, applies
 * `Field.ErrorItem`'s render guard so empty items do not count as content,
 * and treats any other child (custom component, host element, etc.) as
 * opaque-and-therefore-renderable.
 */
const hasRenderableErrorListChildren = ({
	children,
	errorItemType,
}: HasRenderableErrorListChildrenOptions): boolean => {
	let found = false;

	Children.forEach(children, (child) => {
		if (found || child == null || typeof child === "boolean") {
			return;
		}

		if (typeof child === "string") {
			if (child.trim().length > 0) {
				found = true;
			}
			return;
		}

		if (!isValidElement<RenderableContentProps>(child)) {
			found = true;
			return;
		}

		if (child.type === errorItemType) {
			found = isErrorItemRenderable(child.props.children);
			return;
		}

		if (child.type === Fragment) {
			found = hasRenderableErrorListChildren({
				children: child.props.children,
				errorItemType,
			});
			return;
		}

		found = true;
	});

	return found;
};

export {
	//,
	hasRenderableErrorListChildren,
	isErrorItemRenderable,
	normalizeErrorMessages,
};
export type {
	//,
	FieldErrorMessage,
};
