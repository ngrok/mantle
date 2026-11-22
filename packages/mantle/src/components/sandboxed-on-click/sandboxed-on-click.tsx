"use client";

import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { Slot } from "../slot/index.js";
import { type BaseProps, sandboxedOnClickProps } from "./sandboxed-on-click-props.js";

type Props = ComponentProps<"div"> & WithAsChild & BaseProps;

/**
 * A container that prevents the click event from bubbling out of it.
 *
 * The default `<div>` carries `role="presentation"`, because it exists only to
 * catch bubbled clicks. With `asChild`, the child keeps its own role and gets
 * only the sandboxed `onClick`: a presentational role on a link or button is a
 * conflict that user agents ignore.
 *
 * @useWhen Stop a click inside a region, such as a menu in a clickable table row, from reaching a
 * click handler on an ancestor.
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
	const { role, ...sandboxProps } = sandboxedOnClickProps({ allowClickEventDefault, onClick });

	return (
		<Component ref={ref} {...props} {...sandboxProps} {...(!asChild && { role })}>
			{children}
		</Component>
	);
};

export { SandboxedOnClick };
