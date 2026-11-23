import { DropdownMenu, DropdownMenu as MantleMenu } from "@ngrok/mantle/dropdown-menu";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";

export const Actions = (
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" className="max-h-(--available-height) w-(--anchor-width)">
			<DropdownMenu.Item>Rename</DropdownMenu.Item>
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent sideOffset={4}>
					<DropdownMenu.Item>Copy link</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<MantleMenu.Root>
		<MantleMenu.Content loop={false} />
	</MantleMenu.Root>
);

// Negative cases: another library's menu keeps its props and its variable.
export const Untouched = (
	<RadixMenu.Root>
		<RadixMenu.Content collisionPadding={16} className="w-(--radix-dropdown-menu-trigger-width)" />
	</RadixMenu.Root>
);

// Negative case: an element in a prop of the content owns its own variable.
export const InProp = (
	<DropdownMenu.Content
		// oxlint-disable-next-line react/no-children-prop -- the case is an element in a prop
		children={<RadixMenu.Content className="w-(--radix-dropdown-menu-trigger-width)" />}
	/>
);

// Negative case: a parameter under the import's name shadows it.
export function Shadowed({ DropdownMenu }: { DropdownMenu: typeof RadixMenu }) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Content
				collisionPadding={16}
				className="max-h-(--radix-dropdown-menu-content-available-height)"
			/>
		</DropdownMenu.Root>
	);
}

// Negative cases: a loop binding, a `var` in a nested block, a `var` loop or
// destructured `var`, and a named class expression under the import's name
// shadow it too.
export function ForOfShadow(menus: Array<typeof RadixMenu>) {
	const content = [];
	for (const DropdownMenu of menus) {
		content.push(<DropdownMenu.Content collisionPadding={12} />);
	}
	return content;
}

export function VarShadow(flag: boolean) {
	if (flag) {
		// oxlint-disable-next-line no-var, vars-on-top -- the case is a hoisted `var`
		var DropdownMenu = RadixMenu;
	}
	// oxlint-disable-next-line block-scoped-var -- the case reads the hoisted `var`
	return <DropdownMenu.Content className="w-(--radix-dropdown-menu-trigger-width)" />;
}

export function VarForOfShadow(menus: Array<typeof RadixMenu>) {
	// oxlint-disable-next-line no-var, vars-on-top -- the case is a hoisted `var`
	for (var DropdownMenu of menus) {
		break;
	}
	// oxlint-disable-next-line block-scoped-var -- the case reads the hoisted `var`
	return <DropdownMenu.Content collisionPadding={15} />;
}

export function VarDestructureShadow(flag: boolean) {
	if (flag) {
		// oxlint-disable-next-line no-var, vars-on-top -- the case is a hoisted `var`
		var { menu: DropdownMenu } = { menu: RadixMenu };
	}
	// oxlint-disable-next-line block-scoped-var -- the case reads the hoisted `var`
	return <DropdownMenu.Content className="w-(--radix-dropdown-menu-trigger-width)" />;
}

export function VarDestructureLoopShadow(menus: Array<{ menu: typeof RadixMenu }>) {
	// oxlint-disable-next-line no-var, vars-on-top -- the case is a hoisted `var`
	for (var { menu: DropdownMenu } of menus) {
		break;
	}
	// oxlint-disable-next-line block-scoped-var -- the case reads the hoisted `var`
	return <DropdownMenu.Content collisionPadding={16} />;
}

export function VarArrayLoopShadow(menus: Array<[typeof RadixMenu]>) {
	// oxlint-disable-next-line no-var, vars-on-top -- the case is a hoisted `var`
	for (var [DropdownMenu] of menus) {
		break;
	}
	// oxlint-disable-next-line block-scoped-var -- the case reads the hoisted `var`
	return <DropdownMenu.Content className="w-(--radix-dropdown-menu-trigger-width)" />;
}

export const NamedClassShadow = class DropdownMenu {
	static Content = RadixMenu.Content;
	render() {
		return <DropdownMenu.Content collisionPadding={14} />;
	}
};
