import { Button, IconButton } from "@ngrok/mantle/button";
import { Separator } from "@ngrok/mantle/separator";
import { Sheet } from "@ngrok/mantle/sheet";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/ListMagnifyingGlass";
import { TerminalWindowIcon } from "@phosphor-icons/react/TerminalWindow";
import { TrashSimpleIcon } from "@phosphor-icons/react/TrashSimple";
import { useState } from "react";

import { PaymentPopupDemo } from "~/examples/sheet/sheet-payment-popup-demo";
import { TanStackFormDemo } from "~/examples/sheet/sheet-tanstack-form-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

export function WithoutTriggerExample() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button type="button" appearance="outlined" intent="neutral" onClick={() => setIsOpen(true)}>
				Open sheet
			</Button>
			{isOpen && (
				<Sheet.Root open onOpenChange={() => setIsOpen(false)}>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.TitleGroup>
								<Sheet.Title>A controlled Sheet</Sheet.Title>
								<Sheet.Actions>
									<Sheet.CloseIconButton />
								</Sheet.Actions>
							</Sheet.TitleGroup>
							<Sheet.Description>
								This sheet is controlled by a router or state manager.
							</Sheet.Description>
						</Sheet.Header>
						<Sheet.Body>
							<p>
								Consequat do voluptate culpa fugiat consequat nostrud duis aliqua minim. Tempor
								voluptate cillum elit velit. Voluptate aliqua ipsum aliqua dolore in nisi ea fugiat
								aliqua velit proident amet.
							</p>
						</Sheet.Body>
						<Sheet.Footer>
							<Sheet.Close asChild>
								<Button type="button" appearance="outlined" intent="neutral">
									Close
								</Button>
							</Sheet.Close>
						</Sheet.Footer>
					</Sheet.Content>
				</Sheet.Root>
			)}
		</>
	);
}

/** The first example on the Sheet docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Sheet.Root>
				<Sheet.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open sheet
					</Button>
				</Sheet.Trigger>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Are you absolutely sure?</Sheet.Title>
							<Sheet.Actions>
								<IconButton
									appearance="ghost"
									intent="neutral"
									type="button"
									icon={<TerminalWindowIcon />}
									label="Start a Tunnel"
								/>
								<IconButton
									appearance="ghost"
									intent="neutral"
									type="button"
									icon={<ListMagnifyingGlassIcon />}
									label="See Traffic"
								/>
								<IconButton
									appearance="ghost"
									intent="neutral"
									type="button"
									icon={<TrashSimpleIcon />}
									label="Delete"
								/>
								<Separator orientation="vertical" className="h-[80%]" />
								<Sheet.CloseIconButton />
							</Sheet.Actions>
						</Sheet.TitleGroup>
						<Sheet.Description>
							This action cannot be undone. This will permanently delete your account and remove
							your data from our servers.
						</Sheet.Description>
					</Sheet.Header>
					<Sheet.Body className="space-y-4">
						<p>
							Consequat do voluptate culpa fugiat consequat nostrud duis aliqua minim. Tempor
							voluptate cillum elit velit. Voluptate aliqua ipsum aliqua dolore in nisi ea fugiat
							aliqua velit proident amet.
						</p>
						<p>
							Et aliquip fugiat laborum id enim velit exercitation tempor irure pariatur commodo
							dolor tempor eu. Consectetur sunt est occaecat quis eiusmod ea cillum sunt sunt labore
							consequat aute. Aute ad anim do et enim nisi adipisicing sunt culpa magna
							reprehenderit. Reprehenderit dolor elit cupidatat veniam dolore. Consectetur occaecat
							ea est elit ipsum.
						</p>
						<p>
							Est pariatur exercitation commodo in veniam enim dolor. Labore consequat cupidatat
							ipsum enim deserunt exercitation ipsum Lorem. Ea dolor adipisicing et labore Lorem.
						</p>
						<p>
							Incididunt culpa proident qui in. Nulla do quis pariatur veniam est reprehenderit
							dolore. Occaecat consectetur incididunt incididunt commodo cillum amet aliqua id
							pariatur sunt. Laborum amet magna id sunt. Nulla nisi minim et eu incididunt irure
							fugiat laboris labore nostrud eiusmod irure adipisicing. Exercitation pariatur
							voluptate occaecat anim irure ad tempor est. Do culpa culpa occaecat ut pariatur elit
							do exercitation consectetur sint aliqua voluptate.
						</p>
						<p>
							Culpa Lorem fugiat mollit est velit enim fugiat reprehenderit consequat eu. Commodo
							eiusmod irure anim culpa consequat in commodo ad nostrud amet pariatur. Eiusmod velit
							qui reprehenderit consequat proident esse amet consequat. Exercitation nostrud laborum
							labore anim nulla consequat elit quis ullamco nisi minim. Voluptate aliqua magna eu
							proident qui ipsum officia laboris. Ad veniam eiusmod mollit laborum sit pariatur do
							eu nostrud quis. Adipisicing ea labore duis laboris ex aute ea ut magna sit nisi
							dolor.
						</p>
						<p>
							Amet adipisicing quis fugiat cillum do commodo culpa deserunt minim. Fugiat enim
							veniam ex ullamco minim laboris labore culpa occaecat ut exercitation occaecat culpa
							quis. Veniam quis velit enim id veniam nisi non consequat laboris. Reprehenderit
							fugiat nostrud voluptate esse et nulla mollit eiusmod veniam sunt adipisicing. Aute
							quis mollit non quis ullamco consectetur labore quis do occaecat. Veniam id laboris
							adipisicing fugiat.
						</p>
					</Sheet.Body>
					<Sheet.Footer>
						<Sheet.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Close
							</Button>
						</Sheet.Close>
						<Button type="button" appearance="filled" intent="neutral">
							Save
						</Button>
					</Sheet.Footer>
				</Sheet.Content>
			</Sheet.Root>
		</PreviewCanvas>
	);
}

/** The "Router or state management controlled Sheet" example on the Sheet docs page. */
export function RouterOrStateManagementControlledSheetExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<WithoutTriggerExample />
		</PreviewCanvas>
	);
}

/** The "Setting a preferred width of the Sheet" example on the Sheet docs page. */
export function SettingAPreferredWidthOfTheSheetExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Sheet.Root>
				<Sheet.Trigger asChild>
					<Button type="button" appearance="filled" intent="neutral">
						Open 800px wide Sheet
					</Button>
				</Sheet.Trigger>
				<Sheet.Content preferredWidth="sm:max-w-[800px]">
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Tempor pariatur fugiat fugiat cupidatat velit.</Sheet.Title>
							<Sheet.Actions>
								<Sheet.CloseIconButton />
							</Sheet.Actions>
						</Sheet.TitleGroup>
					</Sheet.Header>
					<Sheet.Body className="space-y-4">
						<p>
							Consequat do voluptate culpa fugiat consequat nostrud duis aliqua minim. Tempor
							voluptate cillum elit velit. Voluptate aliqua ipsum aliqua dolore in nisi ea fugiat
							aliqua velit proident amet.
						</p>
					</Sheet.Body>
					<Sheet.Footer>
						<Sheet.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Close
							</Button>
						</Sheet.Close>
						<Button type="button" appearance="filled" intent="neutral">
							Save
						</Button>
					</Sheet.Footer>
				</Sheet.Content>
			</Sheet.Root>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Sheet docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<TanStackFormDemo />
		</PreviewCanvas>
	);
}

/** The "Third-party popups" example on the Sheet docs page. */
export function ThirdPartyPopupsExample() {
	return (
		<PreviewCanvas className="min-h-160 w-full">
			<PaymentPopupDemo />
		</PreviewCanvas>
	);
}
