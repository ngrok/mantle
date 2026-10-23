import type { ComponentProps, ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon } from "./icon.js";

type IconSwapProps<Key extends string> = Omit<ComponentProps<"span">, "children"> &
	WithDataSlot & {
		/**
		 * The key of the icon to show.
		 */
		active: NoInfer<Key>;
		/**
		 * The icons to swap between, by key. Each value is a single SVG icon element.
		 */
		icons: Record<Key, ReactNode>;
	};

/**
 * Stacks icons in one grid cell and shows the `active` icon. The outgoing icon
 * fades, shrinks, and blurs out while the next icon comes into focus.
 *
 * Each icon stays mounted, so a CSS transition carries the swap, and a second
 * swap during the motion reverses it from its current value. Under reduced
 * motion, the swap is instant. Each icon is in a `data-slot="icon-swap-item"`
 * span. The span of the active icon has `data-state="active"`; the others have
 * `data-state="inactive"` and `aria-hidden`.
 *
 * @example
 * ```tsx
 * <IconSwap
 *   active={wasCopied ? "check" : "copy"}
 *   icons={{ check: <CheckIcon />, copy: <CopyIcon /> }}
 * />
 * ```
 */
const IconSwap = <Key extends string>({
	"data-slot": dataSlot,
	active,
	className,
	icons,
	...props
}: IconSwapProps<Key>) => (
	<span
		data-slot={joinDataSlot(dataSlot, "icon-swap")}
		className={cx("inline-grid shrink-0 place-items-center", className)}
		{...props}
	>
		{Object.entries<ReactNode>(icons).map(([key, svg]) => {
			const isActive = key === active;

			// Why a wrapper per icon: the swap owns the wrapper's `transition`, so
			// an icon keeps its own (a rotating caret), and a non-host icon such as
			// `BrowserOnly` still swaps.
			return (
				<span
					key={key}
					data-slot="icon-swap-item"
					data-state={isActive ? "active" : "inactive"}
					aria-hidden={isActive ? undefined : true}
					className={cx(
						"col-start-1 row-start-1 grid place-items-center",
						"motion-safe:transition-[opacity,scale,filter] motion-safe:duration-200 motion-safe:ease-out-strong",
						"data-state-inactive:opacity-0 motion-safe:data-state-inactive:scale-50 motion-safe:data-state-inactive:blur-[2px] motion-safe:data-state-inactive:duration-150",
						// Why paused: a spinner that is not shown must not keep a running animation.
						"data-state-inactive:*:[animation-play-state:paused]",
					)}
				>
					<Icon svg={svg} />
				</span>
			);
		})}
	</span>
);

export {
	//,
	IconSwap,
};
