import { cx } from "@ngrok/mantle/cx";
import { useCopyToClipboard } from "@ngrok/mantle/hooks";
import { Icon } from "@ngrok/mantle/icon";
import { Slot } from "@ngrok/mantle/slot";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { LinkIcon } from "@phosphor-icons/react/Link";
import {
	Children,
	type ComponentProps,
	cloneElement,
	isValidElement,
	useEffect,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { StyledLink } from "./styled-link";

type Props = ComponentProps<"h1" | "h2" | "h3" | "h4" | "h5" | "h6">;

/**
 * A heading component that automatically renders an anchored hash link with
 * copy-to-clipboard behavior.
 *
 * Wraps a single heading element (`h1`–`h6`) and injects:
 * - A link icon that slides in on hover, positioned to the left of the heading text.
 * - Click copies the full URL (with `#id` hash) to the clipboard and shows a
 *   check icon for 2 seconds as confirmation.
 *
 * @example
 * ```tsx
 * <HashLinkHeading id="installation">
 *   <h2>Installation</h2>
 * </HashLinkHeading>
 * ```
 */
function HashLinkHeading({ id, className, children, ...props }: Props) {
	const copyToClipboard = useCopyToClipboard();
	const [wasCopied, setWasCopied] = useState(false);
	const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (timeoutHandle.current != null) {
				clearTimeout(timeoutHandle.current);
			}
		};
	}, []);

	const singleChild = Children.only(children);
	invariant(
		isValidElement<Props>(singleChild),
		"HashLinkHeading must be passed a single heading element child (`h1`-`h6`).",
	);
	const grandchildren = singleChild.props?.children;

	return (
		<Slot id={id} {...props}>
			{cloneElement(
				singleChild,
				{
					className: cx(
						"group relative w-fit font-family scroll-mt-24 [@media(hover:hover)]:w-auto [@media(hover:hover)]:pl-5 [@media(hover:hover)]:-ml-5",
						className,
						singleChild.props.className,
					),
				},
				<>
					<StyledLink
						to={{ hash: id }}
						aria-label="Jump to section"
						className={cx(
							"float-right ml-0.5 inline-flex h-lh px-1 items-center justify-center [@media(hover:hover)]:float-none [@media(hover:hover)]:ml-0 [@media(hover:hover)]:h-auto [@media(hover:hover)]:p-2 [@media(hover:hover)]:absolute [@media(hover:hover)]:-left-4 [@media(hover:hover)]:top-1/2 [@media(hover:hover)]:-translate-y-1/2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:translate-x-5 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:translate-x-0 hover:scale-103 active:scale-94 focus:opacity-100 focus:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 transition-all duration-200 ease-out rounded shrink-0",
							wasCopied ? "text-success-600" : "text-muted hover:text-strong",
						)}
						onClick={() => {
							copyToClipboard(`${window.location.origin}${window.location.pathname}#${id}`);
							setWasCopied(true);
							if (timeoutHandle.current != null) {
								clearTimeout(timeoutHandle.current);
							}
							timeoutHandle.current = setTimeout(() => {
								setWasCopied(false);
							}, 2000);
						}}
					>
						<Icon svg={wasCopied ? <CheckIcon weight="bold" /> : <LinkIcon weight="bold" />} />
					</StyledLink>
					{grandchildren}
				</>,
			)}
		</Slot>
	);
}

export {
	//,
	HashLinkHeading,
};
