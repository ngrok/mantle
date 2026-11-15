import { HorizontalSeparatorGroup, Separator } from "@ngrok/mantle/separator";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Separator docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-sm">
				<div className="space-y-1">
					<h4 className="text-sm font-medium leading-none">mantle</h4>
					<p className="text-muted-foreground text-sm">An open-source UI component library.</p>
				</div>
				<Separator className="my-4" />
				<p className="text-sm">Build ngrok interfaces with shared components.</p>
			</div>
		</PreviewCanvas>
	);
}

/** The "Vertical" example on the Separator docs page. */
export function VerticalExample() {
	return (
		<PreviewCanvas>
			<div className="flex h-5 items-center gap-4 text-sm">
				Blog
				<Separator orientation="vertical" />
				Docs
				<Separator orientation="vertical" />
				Source
			</div>
		</PreviewCanvas>
	);
}

/** The "Semantic" example on the Separator docs page. */
export function SemanticExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-sm text-sm">
				<p>Account settings</p>
				<Separator className="my-4" semantic />
				<p>Danger zone</p>
			</div>
		</PreviewCanvas>
	);
}

/** The "Labeled divider" example on the Separator docs page. */
export function LabeledDividerExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-sm space-y-4">
				<HorizontalSeparatorGroup>
					<Separator />
					<h3>ngrok mantle</h3>
					<Separator />
				</HorizontalSeparatorGroup>
				<HorizontalSeparatorGroup>
					<h3>ngrok mantle</h3>
					<Separator />
				</HorizontalSeparatorGroup>
				<HorizontalSeparatorGroup>
					<Separator />
					<h3>ngrok mantle</h3>
				</HorizontalSeparatorGroup>
			</div>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Separator docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<div className="flex w-full max-w-96 flex-col space-y-16">
				<form>
					<fieldset className="space-y-4">
						<HorizontalSeparatorGroup className="w-full" asChild>
							<legend>
								Choose your favorite fruit!
								<Separator asChild>
									<span />
								</Separator>
							</legend>
						</HorizontalSeparatorGroup>
						<div className="space-y-2">
							<div className="space-x-2">
								<input type="radio" id="apple" name="monster" value="apple" />
								<label htmlFor="apple">Apple</label>
							</div>
							<div className="space-x-2">
								<input type="radio" id="mango" name="monster" value="mango" />
								<label htmlFor="mango">Mango</label>
							</div>
							<div className="space-x-2">
								<input type="radio" id="pear" name="monster" value="pear" />
								<label htmlFor="pear">Pear</label>
							</div>
						</div>
					</fieldset>
				</form>
				<div className="flex h-5 items-center space-x-4 text-sm">
					<div>Blog</div>
					<Separator orientation="vertical" asChild>
						<span />
					</Separator>
					<div>Docs</div>
					<Separator orientation="vertical" asChild>
						<span />
					</Separator>
					<div>Source</div>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Color" example on the Separator docs page. */
export function ColorExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<div className="border-separator w-full border-b" />
			<ul className="divide-separator w-full divide-y">
				<li className="py-1">Blog</li>
				<li className="py-1">Docs</li>
				<li className="py-1">Source</li>
			</ul>
			<span className="bg-separator h-px w-full" />
		</PreviewCanvas>
	);
}
