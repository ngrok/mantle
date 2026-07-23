import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A neutral person silhouette rendered with `currentColor` so it picks up the
 * surrounding text color and adapts to any theme. Used as the default visual
 * when no `src` is provided to `Sidebar.UserAvatar`.
 */
const UserSilhouetteIcon = ({ className, ...props }: ComponentPropsWithoutRef<"svg">) => (
	<svg
		className={cx("block size-full", className)}
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		{...props}
	>
		<circle cx="12" cy="12" r="12" opacity={0.15} />
		<circle cx="12" cy="10" r="3.5" />
		<path d="M5.25 19.5C6.6 16.7 9.1 15 12 15s5.4 1.7 6.75 4.5A12 12 0 0 1 12 22a12 12 0 0 1-6.75-2.5Z" />
	</svg>
);

type UserAvatarProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
	/**
	 * Optional URL of the user's profile picture. When provided, the image is
	 * rendered to fill the avatar with `object-cover`. When omitted (or while
	 * loading), a neutral person silhouette is shown.
	 */
	src?: string;
	/**
	 * Accessible label for the avatar. Used as the image's `alt` text and as
	 * the container's `aria-label` when no image is rendered.
	 *
	 * @default "Your account"
	 */
	alt?: string;
};

/**
 * A circular avatar that represents the currently signed-in user. Renders the
 * user's profile picture when `src` is provided, otherwise falls back to a
 * neutral, theme-aware person silhouette.
 *
 * Users are rendered as circles to differentiate them visually from accounts,
 * which use a square `Sidebar.AccountAvatar`.
 *
 * @example
 * ```tsx
 * <Sidebar.UserAvatar src={user.pictureUrl} alt={user.name} />
 * ```
 *
 * @example
 * ```tsx
 * // With no src, renders the silhouette fallback.
 * <Sidebar.UserAvatar alt="Jane Doe" />
 * ```
 */
const SidebarUserAvatar = forwardRef<ComponentRef<"div">, UserAvatarProps>(
	({ alt = "Your account", className, src, ...props }, ref) => (
		<div
			ref={ref}
			className={cx(
				"text-muted bg-neutral-500/15 relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full",
				className,
			)}
			aria-label={src ? undefined : alt}
			{...props}
		>
			{src ? (
				<img src={src} alt={alt} className="size-full object-cover" />
			) : (
				<UserSilhouetteIcon />
			)}
		</div>
	),
);
SidebarUserAvatar.displayName = "SidebarUserAvatar";

export {
	//,
	SidebarUserAvatar,
};
