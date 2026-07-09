import { Children, type ComponentProps, type ReactNode, cloneElement, isValidElement } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import type { Color } from "../../utils/color/index.js";
import { cx } from "../../utils/cx/cx.js";
import { SvgOnly } from "../icon/svg-only.js";
import { Slot } from "../slot/index.js";

const appearances = ["muted" /*"strong" */] as const;
type Appearance = (typeof appearances)[number];

type BadgeProps = ComponentProps<"span"> &
	WithAsChild & {
		/**
		 * The color variant of the badge. Accepts named colors and functional colors from the mantle color palette.
		 */
		color?: Color;
		/**
		 * The icon to render inside the badge.
		 */
		icon?: ReactNode;
		/**
		 * The visual style of the badge.
		 */
		appearance: Appearance;
	};

/**
 * A non-interactive label used to highlight short, scannable information —
 * a status, a category tag, or a count — in the smallest possible footprint.
 *
 * **When to use**
 * - Status indicators: `Succeeded`, `Failed`, `Pending`, `Beta`.
 * - Category or tag chips alongside list items, table rows, or cards.
 * - Counts (e.g. `12 new`) when paired with brief context.
 *
 * **When not to use**
 * - For interactive UI. Badges are not buttons or links — use {@link https://mantle.ngrok.com/components/actions/button Button}
 *   or {@link https://mantle.ngrok.com/components/navigation/anchor Anchor} (optionally with `asChild` styling) instead.
 * - For long-form text. Keep labels to one or two short words.
 * - As the sole signal of meaning. Pair color with a label or icon so the
 *   distinction works without color (color blindness, monochrome themes).
 *
 * **Choosing a `color`.** Prefer functional colors (`success`, `warning`,
 * `danger`, `info`, `accent`, `neutral`) for status meaning so theming
 * stays coherent. Reach for named hues only when the badge's semantic role
 * isn't already covered.
 *
 * **Polymorphism.** Pass `asChild` to render the badge as a single child
 * element — useful when the badge wraps a link or other semantic element
 * while keeping the badge styling.
 *
 * @see https://mantle.ngrok.com/components/data-display/badge
 *
 * @example
 * ```tsx
 * import { Badge } from "@ngrok/mantle/badge";
 * import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
 *
 * <Badge appearance="muted" color="success" icon={<CheckCircleIcon />}>
 *   Succeeded
 * </Badge>
 *
 * // Polymorphic — render the badge as a link, preserving its styling.
 * <Badge appearance="muted" color="info" asChild>
 *   <a href="/status">Operational</a>
 * </Badge>
 * ```
 */
const Badge = ({
	appearance,
	asChild = false,
	children,
	className,
	color = "neutral",
	icon,
	...props
}: BadgeProps) => {
	const bgColor = computeBgColor(color, appearance);
	const textColor = computeTextColor(color, appearance);

	const badgeClasses = cx(
		"inline-flex w-fit shrink-0 cursor-default items-center gap-1 rounded px-1.5 py-0.5 font-medium text-xs font-sans",
		icon && "ps-1",
		bgColor,
		textColor,
		className,
	);

	if (asChild) {
		const singleChild = Children.only(children);
		invariant(
			isValidElement<BadgeProps>(singleChild),
			"When using `asChild`, Badge must be passed a single child as a JSX tag.",
		);
		const grandchildren = singleChild.props?.children;

		return (
			<Slot data-slot="badge" className={badgeClasses} {...props}>
				{cloneElement(
					singleChild,
					{},
					<>
						{icon && <SvgOnly className="size-4" svg={icon} />}
						{grandchildren}
					</>,
				)}
			</Slot>
		);
	}

	return (
		<span data-slot="badge" className={badgeClasses} {...props}>
			{icon && <SvgOnly className="size-4" svg={icon} />}
			{children}
		</span>
	);
};
Badge.displayName = "Badge";

// MARK: - Exports

export {
	//,
	Badge,
};

export type {
	//,
	BadgeProps,
};

// MARK: - Private

const mutedBgColorLookup = {
	amber: "bg-amber-500/20",
	blue: "bg-blue-500/20",
	cyan: "bg-cyan-500/20",
	emerald: "bg-emerald-500/20",
	fuchsia: "bg-fuchsia-500/20",
	gray: "bg-gray-500/20",
	green: "bg-green-500/20",
	indigo: "bg-indigo-500/20",
	lime: "bg-lime-500/20",
	orange: "bg-orange-500/20",
	pink: "bg-pink-500/20",
	purple: "bg-purple-500/20",
	red: "bg-red-500/20",
	rose: "bg-rose-500/20",
	sky: "bg-sky-500/20",
	teal: "bg-teal-500/20",
	violet: "bg-violet-500/20",
	yellow: "bg-yellow-500/20",
	accent: "bg-accent-500/20",
	danger: "bg-danger-500/20",
	important: "bg-important-500/20",
	info: "bg-info-500/20",
	neutral: "bg-neutral-500/20",
	success: "bg-success-500/20",
	warning: "bg-warning-500/20",
} satisfies Record<Color, string>;

function computeBgColor(color: Color, appearance: Appearance) {
	switch (appearance) {
		case "muted":
			return mutedBgColorLookup[color];
		default:
			invariant(false, `Invalid appearance: ${String(appearance)}`);
	}
}

const textColorMutedLookup = {
	amber: "text-amber-700",
	blue: "text-blue-700",
	cyan: "text-cyan-700",
	emerald: "text-emerald-700",
	fuchsia: "text-fuchsia-700",
	gray: "text-gray-700",
	green: "text-green-700",
	indigo: "text-indigo-700",
	lime: "text-lime-700",
	orange: "text-orange-700",
	pink: "text-pink-700",
	purple: "text-purple-700",
	red: "text-red-700",
	rose: "text-rose-700",
	sky: "text-sky-700",
	teal: "text-teal-700",
	violet: "text-violet-700",
	yellow: "text-yellow-700",
	accent: "text-accent-700",
	danger: "text-danger-700",
	important: "text-important-700",
	info: "text-info-700",
	neutral: "text-neutral-700",
	success: "text-success-700",
	warning: "text-warning-700",
} satisfies Record<Color, string>;

function computeTextColor(color: Color, appearance: Appearance) {
	switch (appearance) {
		case "muted":
			return textColorMutedLookup[color];
		default:
			invariant(false, `Invalid appearance: ${String(appearance)}`);
	}
}
