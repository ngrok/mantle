import { Alert } from "@ngrok/mantle/alert";
import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Badge } from "@ngrok/mantle/badge";
import { Button, IconButton } from "@ngrok/mantle/button";
import { Toast } from "@ngrok/mantle/toast";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { XIcon } from "@phosphor-icons/react/X";

declare const tone: "neutral" | "danger";
declare const isPending: boolean;
declare function save(): void;

export const Buttons = (
	<>
		<Button onClick={save}>Details</Button>
		<Button appearance="filled" onClick={save}>
			Save
		</Button>
		<Button type="submit" appearance="filled" priority="default" isLoading={isPending}>
			Save
		</Button>
		<Button appearance="outlined" priority="neutral">
			Cancel
		</Button>
		<Button priority="danger">Delete</Button>
		<Button appearance="ghost" onClick={save}>
			Dismiss
		</Button>
		<Button appearance="outlined" priority={tone}>
			Dynamic
		</Button>
	</>
);

export const IconButtons = (
	<>
		<IconButton label="Copy" icon={<CopyIcon />} />
		<IconButton appearance="ghost" size="sm" label="Dismiss" icon={<XIcon />} />
	</>
);

export const Feedback = (
	<>
		<Alert.Root priority="warning">…</Alert.Root>
		<Toast.Root priority="success">…</Toast.Root>
		<AlertDialog.Root priority="danger">…</AlertDialog.Root>
		<AlertDialog.Action priority="default">Continue</AlertDialog.Action>
	</>
);

// Negative cases: a migrated button, a Badge, and a non-mantle prop stay as written.
export const Untouched = (
	<>
		<Button appearance="ghost" intent="neutral">
			Already migrated
		</Button>
		<Badge appearance="muted" color="green">
			ok
		</Badge>
		<img src="/hero.png" alt="" fetchPriority="high" />
	</>
);
