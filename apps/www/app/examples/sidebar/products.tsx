import type { Product } from "@ngrok/mantle/sidebar";
import { GearIcon } from "@phosphor-icons/react/Gear";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { SailboatIcon } from "@phosphor-icons/react/Sailboat";
import { ShareFatIcon } from "@phosphor-icons/react/ShareFat";
import { SparkleIcon } from "@phosphor-icons/react/Sparkle";
import { SpeedometerIcon } from "@phosphor-icons/react/Speedometer";
import type { ReactElement } from "react";
import { UserShieldIcon } from "./user-shield-icon";

/**
 * Rail-section identifiers used by the Sidebar examples. The Sidebar primitives
 * have no opinion about what sections exist — this list lives in the docs site
 * to demonstrate the multi-product navigation pattern.
 *
 * `account-settings` is not a product but lives alongside products in the rail
 * so that the account's admin-style nav (members, authentication, etc.) is
 * always one click away regardless of which product is active.
 */
type ProductId =
	| "account-settings"
	| "ai-gateway"
	| "codename"
	| "iam"
	| "localhost"
	| "universal-gateway"
	| "usage";

type ExampleProduct = Product & {
	id: ProductId;
	icon: ReactElement;
};

/**
 * The four core products, alphabetically ordered.
 */
const productItems: ReadonlyArray<ExampleProduct> = [
	{
		id: "localhost",
		label: "Share Localhost",
		icon: <ShareFatIcon weight="regular" />,
	},
	{
		id: "universal-gateway",
		label: "Gateway",
		icon: <GlobeIcon weight="regular" />,
	},
	{
		id: "codename",
		label: "Ship",
		icon: <SailboatIcon weight="regular" />,
	},
	{
		id: "ai-gateway",
		label: "AI Gateway",
		icon: <SparkleIcon weight="regular" />,
	},
];

/**
 * Utility rail items that sit below the products, separated by a divider.
 */
const utilityItems: ReadonlyArray<ExampleProduct> = [
	{
		id: "iam",
		label: "Identity & Access",
		icon: <UserShieldIcon />,
	},
	{
		id: "usage",
		label: "Usage & Limits",
		icon: <SpeedometerIcon weight="regular" />,
	},
	{
		id: "account-settings",
		label: "Settings",
		icon: <GearIcon weight="regular" />,
	},
];

export type {
	//,
	ExampleProduct,
	ProductId,
};

export {
	//,
	productItems,
	utilityItems,
};
