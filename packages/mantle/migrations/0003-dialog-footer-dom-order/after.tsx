import { Button } from "@ngrok/mantle/button";
import { Dialog, Dialog as Modal } from "@ngrok/mantle/dialog";
import { Sheet } from "@ngrok/mantle/sheet";
import { Dialog as LegacyDialog } from "@acme/ui";

declare const canDelete: boolean;
declare function secondaryAction(): null;

export const TwoActions = (
	<Dialog.Footer className="gap-3">
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
	</Dialog.Footer>
);

export const ConditionalAction = (
	<Dialog.Footer>
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
		{canDelete && (
			<Button type="button" appearance="filled" intent="danger">
				Delete
			</Button>
		)}
	</Dialog.Footer>
);

// The aliased import is the same part.
export const AliasedActions = (
	<Modal.Footer>
		<Button type="button" appearance="outlined" intent="neutral">
			Cancel
		</Button>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
	</Modal.Footer>
);

// Negative case: one child renders the same before and after.
export const SingleAction = (
	<Dialog.Footer>
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Close
			</Button>
		</Dialog.Close>
	</Dialog.Footer>
);

// Negative case: three children need a human to reverse them.
export const ThreeActions = (
	<Dialog.Footer>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Button type="button" appearance="outlined" intent="neutral">
			Save draft
		</Button>
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
	</Dialog.Footer>
);

// Negative case: a footer with its own text would lose it in a swap.
export const TextAndActions = (
	<Dialog.Footer>
		Unsaved changes
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Button type="button" appearance="outlined" intent="neutral">
			Cancel
		</Button>
	</Dialog.Footer>
);

// Negative case: Sheet.Footer always rendered in DOM order.
export const SheetActions = (
	<Sheet.Footer>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Button type="button" appearance="outlined" intent="neutral">
			Cancel
		</Button>
	</Sheet.Footer>
);

// Negative case: another library's Dialog.Footer is not the part.
export const ForeignActions = (
	<LegacyDialog.Footer>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Button type="button" appearance="outlined" intent="neutral">
			Cancel
		</Button>
	</LegacyDialog.Footer>
);

// Two expressions are two actions.
export const ExpressionActions = (
	<Dialog.Footer>
		{secondaryAction()}
		{canDelete ? (
			<Button type="button" appearance="filled" intent="danger">
				Delete
			</Button>
		) : (
			<Button type="button" appearance="filled" intent="neutral">
				Save
			</Button>
		)}
	</Dialog.Footer>
);

// A comment between the actions stays where it is.
export const CommentedActions = (
	<Dialog.Footer>
		{/* Footer actions */}
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
	</Dialog.Footer>
);

// Negative case: a parameter under the import's name shadows it.
export function ShadowedActions({ Dialog }: { Dialog: typeof LegacyDialog }) {
	return (
		<Dialog.Footer>
			<Button type="button" appearance="filled" intent="neutral">
				Save
			</Button>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Footer>
	);
}
