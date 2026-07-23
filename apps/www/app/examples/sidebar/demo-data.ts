/**
 * Shared dummy data used by all Sidebar examples. Keeps the demos themselves
 * focused on Sidebar composition rather than reinventing fixtures each time.
 */

type DemoAccount = {
	id: string;
	name: string;
	plan: "free" | "pro" | "enterprise";
};

type DemoUser = {
	name: string;
	email: string;
	pictureUrl?: string;
};

const demoAccounts: ReadonlyArray<DemoAccount> = [
	{ id: "acc_acme", name: "Acme Corporation", plan: "pro" },
	{ id: "acc_skunkworks", name: "Skunkworks", plan: "free" },
	{ id: "acc_atlas", name: "Atlas Industries", plan: "enterprise" },
];

const demoUser: DemoUser = {
	name: "Jane Doe",
	email: "jane@acme.com",
};

export type {
	//,
	DemoAccount,
	DemoUser,
};

export {
	//,
	demoAccounts,
	demoUser,
};
