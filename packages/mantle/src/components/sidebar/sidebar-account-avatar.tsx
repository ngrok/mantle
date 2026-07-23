import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

const colors = [
	"bg-emerald-500",
	"bg-gray-500",
	"bg-red-500",
	"bg-violet-500",
	"bg-cyan-500",
	"bg-rose-500",
	"bg-purple-500",
	"bg-fuchsia-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-indigo-500",
	"bg-teal-500",
	"bg-yellow-500",
	"bg-sky-500",
	"bg-pink-500",
	"bg-blue-500",
	"bg-amber-500",
] as const;

/**
 * djb2 is a stable, fast string hashing function. We use it to deterministically
 * pick a background color from `colors` for a given account ID, so the same
 * account always gets the same swatch.
 */
function djb2Hash(value: string): number {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	// Convert to unsigned 32-bit so the modulo below stays positive.
	return hash >>> 0;
}

function pickColorClass(accountId: string | undefined): string {
	const hash = djb2Hash(accountId ?? "");
	const index = hash % colors.length;
	// `colors` is a non-empty `as const` tuple; the fallback satisfies the
	// strict-mode index-access type without resorting to a non-null assertion.
	return colors[index] ?? "bg-neutral-500";
}

function getInitials(accountName: string | undefined): string {
	const stripped = (accountName ?? "")
		.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, "")
		.trim();
	const initials = stripped
		.split(" ")
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.slice(0, 2)
		.map((part) => part.substring(0, 1))
		.join("")
		.toLocaleUpperCase();
	return initials || "?";
}

type AccountAvatarProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
	/**
	 * The account's stable identifier. Used to deterministically select a
	 * background swatch from the design system's palette so the same account
	 * always gets the same color.
	 */
	accountId: string | undefined;
	/**
	 * The account's display name. The first one or two letters become the
	 * avatar's initials. Falls back to `?` when the name is empty.
	 */
	accountName: string | undefined;
};

/**
 * A small rounded-square avatar that represents an account (workspace,
 * organization, etc.). The background color is derived deterministically from
 * the `accountId` so an account's swatch is stable across renders, sessions,
 * and devices.
 *
 * Accounts are rendered as squares to differentiate them visually from users,
 * which use a circular `Sidebar.UserAvatar`.
 *
 * @example
 * ```tsx
 * <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 * ```
 */
const SidebarAccountAvatar = forwardRef<ComponentRef<"div">, AccountAvatarProps>(
	({ accountId, accountName, className, ...props }, ref) => (
		<div
			ref={ref}
			className={cx(
				"text-static-white flex size-6 items-center justify-center rounded-md text-xs font-medium",
				pickColorClass(accountId),
				className,
			)}
			aria-hidden="true"
			{...props}
		>
			{getInitials(accountName)}
		</div>
	),
);
SidebarAccountAvatar.displayName = "SidebarAccountAvatar";

export {
	//,
	SidebarAccountAvatar,
};
