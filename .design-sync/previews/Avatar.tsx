import { Avatar, UserIcon } from "@ngrok/mantle";

export const AccountAndUser = () => (
	<div className="flex items-center gap-4">
		<Avatar.Root appearance="square" colorSeed="acc_acme">
			<Avatar.Fallback name="Acme Corp" />
		</Avatar.Root>
		<Avatar.Root colorSeed="usr_jane">
			<Avatar.Fallback name="Jane Doe" />
		</Avatar.Root>
		<Avatar.Root aria-label="Your account" className="text-muted" role="img">
			<Avatar.Fallback>
				<UserIcon className="size-4" />
			</Avatar.Fallback>
		</Avatar.Root>
	</div>
);

export const Appearances = () => (
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

const accounts = [
	{ id: "acc_acme", name: "Acme Corp" },
	{ id: "acc_atlas", name: "Atlas Industries" },
	{ id: "acc_globex", name: "Globex" },
	{ id: "acc_initech", name: "Initech" },
	{ id: "acc_umbrella", name: "Umbrella Group" },
];

export const SeededColors = () => (
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

export const Sizes = () => (
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

export const MemberRow = () => (
	<div className="flex max-w-sm items-center gap-3">
		<Avatar.Root className="size-9" colorSeed="usr_jane">
			<Avatar.Fallback name="Jane Doe" />
		</Avatar.Root>
		<div>
			<p className="text-strong text-sm font-medium">Jane Doe</p>
			<p className="text-muted text-sm">jane@acme.com · Admin</p>
		</div>
	</div>
);
