import { Button } from "@ngrok/mantle/button";
import { Dialog, Dialog as Modal } from "@ngrok/mantle/dialog";
import { Sheet } from "@ngrok/mantle/sheet";
import { Dialog as LegacyDialog } from "@acme/ui";

declare const canDelete: boolean;

export const TwoActions = (
	<Dialog.Footer className="gap-3">
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
	</Dialog.Footer>
);

export const ConditionalAction = (
	<Dialog.Footer>
		{canDelete && (
			<Button type="button" appearance="filled" intent="danger">
				Delete
			</Button>
		)}
		<Dialog.Close asChild>
			<Button type="button" appearance="outlined" intent="neutral">
				Cancel
			</Button>
		</Dialog.Close>
	</Dialog.Footer>
);

// The aliased import is the same part.
export const AliasedActions = (
	<Modal.Footer>
		<Button type="button" appearance="filled" intent="neutral">
			Save
		</Button>
		<Button type="button" appearance="outlined" intent="neutral">
			Cancel
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
