"use client";

import type { ComponentProps, HTMLAttributes, MouseEventHandler } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { Slot } from "../slot/index.js";

type BaseProps = {
	/**
	 * Whether the click keeps its default behavior. When `false`, the `onClick`
	 * handler calls `event.preventDefault()`; propagation stops either way.
	 *
	 * Set it to `true` for links or buttons that must navigate or run an action
	 * on click.
	 *
	 * @default false
	 */
	allowClickEventDefault?: boolean;
};

type EventProps = BaseProps & {
	/**
	 * The click event handler.
	 */
	onClick?: MouseEventHandler<HTMLElement>;
};

/**
 * Props for the sandboxed onClick container. Spread this on the element you want
 * to prevent the click event from bubbling out of.
 *
 * @see https://mantle.ngrok.com/components/primitives/sandboxed-on-click
 */
const sandboxedOnClickProps = ({ allowClickEventDefault = false, onClick }: EventProps = {}) =>
	({
		/**
		 * Marking an element with the role presentation indicates to assistive
		 * technology that this element should be ignored; it exists to support the
		 * web application and is not meant for humans to interact with directly.
		 *
		 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/65be35b0f6c6cf8b79e9a748cb657a64b78c6535/docs/rules/no-noninteractive-element-interactions.md#case-this-element-is-catching-bubbled-events-from-elements-that-it-contains
		 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/presentation_role
		 */
		role: "presentation",
		onClick: (event) => {
			/**
			 * _Always_ stop propagation, so the click cannot bubble out of the
			 * sandboxed container.
			 */
			event.stopPropagation();

			/**
			 * `allowClickEventDefault` lets a link or button inside the sandbox keep
			 * its own navigation or action on click.
			 */
			if (!allowClickEventDefault) {
				event.preventDefault();
			}
			onClick?.(event);
		},
	}) as const satisfies HTMLAttributes<HTMLElement>;

type Props = ComponentProps<"div"> & WithAsChild & BaseProps;

/**
 * A container that prevents the click event from bubbling out of it.
 *
 * @see https://mantle.ngrok.com/components/primitives/sandboxed-on-click
 *
 * @example
 * ```tsx
 * <TableRow onClick={() => navigate("/somewhere")}>
 *   <TableRowCell>
 *     <SandboxedOnClick allowClickEventDefault>
 *       <Anchor href="https://ngrok.com/docs">
 *         See ngrok docs
 *       </Anchor>
 *     </SandboxedOnClick>
 *   </TableRowCell>
 * </TableRow>
 * ```
 */
const SandboxedOnClick = ({
	//,
	allowClickEventDefault = false,
	asChild = false,
	children,
	onClick,
	ref,
	...props
}: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component ref={ref} {...props} {...sandboxedOnClickProps({ allowClickEventDefault, onClick })}>
			{children}
		</Component>
	);
};

export {
	//,
	SandboxedOnClick,
	sandboxedOnClickProps,
};
