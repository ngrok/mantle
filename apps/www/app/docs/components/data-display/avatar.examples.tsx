import { Avatar } from "@ngrok/mantle/avatar";
import { MediaObject } from "@ngrok/mantle/media-object";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";

import { PreviewCanvas } from "~/components/preview-canvas";

export const accounts = [
	{ id: "acc_acme", name: "Acme Corp" },
	{ id: "acc_atlas", name: "Atlas Industries" },
	{ id: "acc_globex", name: "Globex" },
	{ id: "acc_initech", name: "Initech" },
	{ id: "acc_umbrella", name: "Umbrella Group" },
];

export function AvatarExample() {
	return (
		<div className="flex items-center gap-4">
			<Avatar.Root appearance="square" colorSeed="acc_acme">
				<Avatar.Fallback name="Acme Corp" />
			</Avatar.Root>
			<Avatar.Root>
				<Avatar.Image alt="Jane Doe" src="/example-avatar.svg" />
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>
			<Avatar.Root aria-label="Your account" className="text-muted" role="img">
				<Avatar.Fallback>
					<UserIcon className="size-4" />
				</Avatar.Fallback>
			</Avatar.Root>
		</div>
	);
}

export function AvatarAppearanceExample() {
	return (
		<div className="flex items-center gap-6">
			<div className="flex items-center gap-2">
				<Avatar.Root appearance="circle" colorSeed="usr_jane">
					<Avatar.Fallback name="Jane Doe" />
				</Avatar.Root>
				<span className="text-sm">Jane Doe</span>
			</div>
			<div className="flex items-center gap-2">
				<Avatar.Root appearance="square" colorSeed="acc_acme">
					<Avatar.Fallback name="Acme Corp" />
				</Avatar.Root>
				<span className="text-sm">Acme Corp</span>
			</div>
		</div>
	);
}

export function AvatarSeedExample() {
	return (
		<div className="flex flex-wrap items-center gap-4">
			{accounts.map((account) => (
				<div key={account.id} className="flex items-center gap-2">
					<Avatar.Root appearance="square" colorSeed={account.id}>
						<Avatar.Fallback name={account.name} />
					</Avatar.Root>
					<span className="text-sm">{account.name}</span>
				</div>
			))}
		</div>
	);
}

export function AvatarSizeExample() {
	return (
		<div className="flex items-end gap-4">
			<Avatar.Root className="size-5 text-[0.625rem]" colorSeed="usr_jane">
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>
			<Avatar.Root colorSeed="usr_jane">
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>
			<Avatar.Root className="size-10 text-sm" colorSeed="usr_jane">
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>
			<Avatar.Root className="size-16 text-lg" colorSeed="usr_jane">
				<Avatar.Fallback name="Jane Doe" />
			</Avatar.Root>
		</div>
	);
}

export function AvatarMediaObjectExample() {
	return (
		<MediaObject.Root className="max-w-sm">
			<MediaObject.Media>
				<Avatar.Root className="size-9" colorSeed="usr_jane">
					<Avatar.Fallback name="Jane Doe" />
				</Avatar.Root>
			</MediaObject.Media>
			<MediaObject.Content>
				<p className="text-strong text-sm font-medium">Jane Doe</p>
				<p className="text-muted text-sm">jane@acme.com</p>
			</MediaObject.Content>
		</MediaObject.Root>
	);
}

export function AvatarLinkExample() {
	return (
		<Avatar.Root asChild appearance="square" colorSeed="acc_acme">
			<a href="/components/data-display/avatar" target="_top" title="Acme Corp">
				<Avatar.Fallback name="Acme Corp" />
			</a>
		</Avatar.Root>
	);
}

/** The first example on the Avatar docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarExample />
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Avatar docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarLinkExample />
		</PreviewCanvas>
	);
}

/** The "Appearance" example on the Avatar docs page. */
export function AppearanceExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarAppearanceExample />
		</PreviewCanvas>
	);
}

/** The "Deterministic color" example on the Avatar docs page. */
export function DeterministicColorExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarSeedExample />
		</PreviewCanvas>
	);
}

/** The "Sizing" example on the Avatar docs page. */
export function SizingExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarSizeExample />
		</PreviewCanvas>
	);
}

/** The "Composing with MediaObject" example on the Avatar docs page. */
export function ComposingWithMediaobjectExample() {
	return (
		<PreviewCanvas className="p-4 md:p-8">
			<AvatarMediaObjectExample />
		</PreviewCanvas>
	);
}
