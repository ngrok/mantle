import { Button } from "@ngrok/mantle/button";
import { Dialog } from "@ngrok/mantle/dialog";
import { Sheet } from "@ngrok/mantle/sheet";

declare const canDelete: boolean;

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
