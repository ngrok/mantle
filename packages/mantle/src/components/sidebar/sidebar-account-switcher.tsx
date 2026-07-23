import { CaretUpDownIcon } from "@phosphor-icons/react/CaretUpDown";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef, ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import { SidebarAccountAvatar } from "./sidebar-account-avatar.js";

type AccountSwitcherTriggerProps = Omit<ComponentPropsWithoutRef<"button">, "children" | "type"> & {
	/**
	 * The currently-active account's ID. Drives the avatar swatch.
	 */
	accountId: string | undefined;
	/**
	 * The currently-active account's display name. Shown next to the avatar.
	 */
	accountName: string | undefined;
	/**
	 * Optional content rendered after the account name and before the chevron.
	 * Use this for a user avatar or other persistent indicator.
	 */
	trailing?: ReactNode;
};

/**
 * The visual trigger row for an account switcher. Renders an avatar, the
 * account name, an optional `trailing` slot, and a chevron. Designed to be
 * used as a `DropdownMenu.Trigger` via `asChild`, so the consumer composes
 * the full menu content themselves with the design system's `DropdownMenu`.
 *
 * Splitting the trigger from the menu lets consumers wire arbitrary actions
 * (account settings, switch accounts, logout, etc.) using their own router and
 * permission rules — Mantle stays out of that business logic.
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Sidebar.AccountSwitcherTrigger
 *       accountId={account.id}
 *       accountName={account.name}
 *       trailing={<Sidebar.UserAvatar src={user.pictureUrl} />}
 *     />
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item asChild>
 *       <Link to="/settings">Account settings</Link>
 *     </DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SidebarAccountSwitcherTrigger = forwardRef<
	ComponentRef<"button">,
	AccountSwitcherTriggerProps
>(({ accountId, accountName, className, trailing, ...props }, ref) => (
	<button
		ref={ref}
		className={cx(
			"text-strong hover:bg-popover-hover ring-focus-accent flex w-full items-center justify-between gap-1.5 rounded-lg px-1.5 py-1.5 transition-none focus:outline-hidden focus-visible:ring-4",
			className,
		)}
		{...props}
		type="button"
	>
		<span className="flex min-w-0 flex-1 items-center gap-1.5">
			<SidebarAccountAvatar accountId={accountId} accountName={accountName} className="shrink-0" />
			<span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
				{accountName ?? accountId ?? "—"}
			</span>
		</span>
		<span className="flex shrink-0 items-center gap-1">
			{trailing}
			<CaretUpDownIcon className="text-muted size-4" aria-hidden="true" />
		</span>
	</button>
));
SidebarAccountSwitcherTrigger.displayName = "SidebarAccountSwitcherTrigger";

type SwitchAccountsRadioGroupAccount = {
	/**
	 * Stable account identifier. Used as the radio item value and the avatar
	 * color seed.
	 */
	id: string;
	/**
	 * Display name for the account. Empty strings fall back to the ID.
	 */
	name: string;
	/**
	 * Optional trailing content for this account row. Useful for plan badges
	 * (e.g. "Free") or any other inline indicator.
	 */
	trailing?: ReactNode;
};

type SwitchAccountsRadioGroupProps = Omit<
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>,
	"children"
> & {
	/**
	 * The list of accounts the current user can switch into. Consumer-supplied;
	 * Mantle does not fetch or shape this data.
	 */
	accounts: ReadonlyArray<SwitchAccountsRadioGroupAccount>;
};

/**
 * A pre-styled radio group of accounts for use inside a `DropdownMenu.SubContent`.
 * Pairs an account avatar and name (and optional trailing badge) per row, and
 * delegates value-change handling to the consumer.
 *
 * Works on top of `@radix-ui/react-dropdown-menu` directly so it can be slotted
 * into either the design system's `DropdownMenu` namespace or a consumer's own
 * Radix-based menu.
 *
 * @example
 * ```tsx
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>Switch accounts</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <Sidebar.SwitchAccountsRadioGroup
 *       accounts={accounts}
 *       value={currentAccountId}
 *       onValueChange={(id) => switchAccount(id)}
 *     />
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 * ```
 */
const SidebarSwitchAccountsRadioGroup = forwardRef<
	ComponentRef<typeof DropdownMenuPrimitive.RadioGroup>,
	SwitchAccountsRadioGroupProps
>(({ accounts, className, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioGroup ref={ref} className={cx("space-y-px", className)} {...props}>
		{accounts.map((account) => (
			<DropdownMenuPrimitive.RadioItem
				key={account.id}
				value={account.id}
				className={cx(
					"group/sidebar-switch-account-item",
					"text-strong relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal outline-none",
					"data-highlighted:bg-active-menu-item",
					"aria-checked:bg-selected-menu-item",
					"data-highlighted:aria-checked:bg-active-selected-menu-item!",
					"data-disabled:pointer-events-none data-disabled:opacity-50",
				)}
			>
				<SidebarAccountAvatar
					accountId={account.id}
					accountName={account.name}
					className="shrink-0"
				/>
				<span className="min-w-0 flex-1 truncate">{account.name.trim() || account.id}</span>
				{account.trailing}
			</DropdownMenuPrimitive.RadioItem>
		))}
	</DropdownMenuPrimitive.RadioGroup>
));
SidebarSwitchAccountsRadioGroup.displayName = "SidebarSwitchAccountsRadioGroup";

export type {
	//,
	SwitchAccountsRadioGroupAccount,
};

export {
	//,
	SidebarAccountSwitcherTrigger,
	SidebarSwitchAccountsRadioGroup,
};
