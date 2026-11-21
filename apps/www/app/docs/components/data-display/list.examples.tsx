import { cx } from "@ngrok/mantle/cx";
import { MediaObject } from "@ngrok/mantle/media-object";
import { List } from "@ngrok/mantle/list";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const accounts = Array.from({ length: 14 }, (_, index) => {
	const names = [
		"Cody Price",
		"cody@ngrok.com",
		"corp@ngrok.com",
		"dogfood@ngrok.com",
		"ngrok eng (dev)",
		"acme corp",
		"globex",
	];
	const plans = ["All Subscription", "Enterprise Subscription", "Free"];
	const name = names[index % names.length];
	return {
		id: `account-${index}`,
		name: index < names.length ? name : `${name} ${Math.floor(index / names.length) + 1}`,
		plan: plans[index % plans.length],
		memberCount: (index * 7 + 1) % 120,
	};
});

export function ListExample() {
	const [activeId, setActiveId] = useState("account-2");
	return (
		<div className="w-full max-w-md">
			<List.Root aria-label="Your accounts" className="max-h-80">
				{accounts.map((account) => (
					<List.Item
						key={account.id}
						current={account.id === activeId}
						onClick={() => setActiveId(account.id)}
					>
						<List.ItemTitle>{account.name}</List.ItemTitle>
						<List.ItemDescription>
							{account.plan} · {account.memberCount} members
						</List.ItemDescription>
					</List.Item>
				))}
			</List.Root>
		</div>
	);
}

export function ListVirtualExample() {
	const [activeId, setActiveId] = useState("account-2");
	return (
		<div className="w-full max-w-md">
			<List.VirtualRoot aria-label="Your accounts" className="max-h-80">
				{accounts.map((account) => (
					<List.Item
						key={account.id}
						current={account.id === activeId}
						onClick={() => setActiveId(account.id)}
					>
						<List.ItemTitle>{account.name}</List.ItemTitle>
						<List.ItemDescription>
							{account.plan} · {account.memberCount} members
						</List.ItemDescription>
					</List.Item>
				))}
			</List.VirtualRoot>
		</div>
	);
}

export const simpleAccounts = [
	{ id: "personal", name: "Cody Price", plan: "All Subscription" },
	{ id: "corp", name: "corp@ngrok.com", plan: "Enterprise Subscription" },
	{ id: "dogfood", name: "dogfood@ngrok.com", plan: "Free" },
];

export function ListMinimalExample() {
	return (
		<div className="w-full max-w-md">
			<List.Root aria-label="Switch account" className="max-h-80">
				{simpleAccounts.map((account) => (
					<List.Item key={account.id} onClick={() => {}}>
						<List.ItemTitle>{account.name}</List.ItemTitle>
						<List.ItemDescription>{account.plan}</List.ItemDescription>
					</List.Item>
				))}
			</List.Root>
		</div>
	);
}

export const providers = [
	{
		id: "okta",
		name: "Okta Workforce",
		owner: "ngrok eng (dev)",
		Icon: ShieldCheckIcon,
		tint: "text-blue-600",
	},
	{
		id: "entra",
		name: "Microsoft Entra ID",
		owner: "corp@ngrok.com",
		Icon: BuildingsIcon,
		tint: "text-sky-500",
	},
	{
		id: "onelogin",
		name: "OneLogin",
		owner: "Cody Price",
		Icon: FingerprintIcon,
		tint: "text-orange-500",
	},
	{
		id: "google",
		name: "Google Workspace",
		owner: "platform@ngrok.com",
		Icon: KeyIcon,
		tint: "text-red-500",
	},
	{
		id: "auth0",
		name: "Auth0",
		owner: "security@ngrok.com",
		Icon: LockKeyIcon,
		tint: "text-violet-600",
	},
];

export function ListLinkExample() {
	return (
		<div className="w-full max-w-md">
			<List.Root aria-label="Identity providers" className="max-h-72">
				{providers.map((provider) => (
					<List.Item key={provider.id} asChild className="py-2.5">
						<a href={`#${provider.id}`}>
							<MediaObject.Root className="items-center gap-3">
								<MediaObject.Media>
									<provider.Icon weight="duotone" className={cx("size-8", provider.tint)} />
								</MediaObject.Media>
								<MediaObject.Content className="flex flex-col gap-0.5">
									<List.ItemTitle>{provider.name}</List.ItemTitle>
									<List.ItemDescription>{provider.owner}</List.ItemDescription>
								</MediaObject.Content>
							</MediaObject.Root>
						</a>
					</List.Item>
				))}
			</List.Root>
		</div>
	);
}

/** The first example on the List docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<ListMinimalExample />
		</PreviewCanvas>
	);
}

/** The "Current row" example on the List docs page. */
export function CurrentRowExample() {
	return (
		<PreviewCanvas>
			<ListExample />
		</PreviewCanvas>
	);
}

/** The "Virtualization" example on the List docs page. */
export function VirtualizationExample() {
	return (
		<PreviewCanvas>
			<ListVirtualExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the List docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<ListLinkExample />
		</PreviewCanvas>
	);
}
