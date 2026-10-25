import { Alert } from "@ngrok/mantle/alert";
import { AlertDialog } from "@ngrok/mantle/alert-dialog";
import { Badge } from "@ngrok/mantle/badge";
import { Button, Button as MantleButton, IconButton } from "@ngrok/mantle/button";
import { Toast } from "@ngrok/mantle/toast";
import { Button as AntButton } from "antd";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { XIcon } from "@phosphor-icons/react/X";

declare const tone: "neutral" | "danger";
declare const legacyTone: "default" | "danger";
declare const look: "filled" | "ghost";
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

// The literal reads the same in any spelling, and the aliased import is the same part.
export const Spellings = (
	<>
		<Button priority='default'>Single quotes</Button>
		<Button priority = "default">Spaces</Button>
		<Button priority={"default"}>Braces</Button>
		<Button appearance='filled'>Filled</Button>
		<MantleButton priority="default">Aliased</MantleButton>
	</>
);

export const IconButtons = (
	<>
		<IconButton label="Copy" icon={<CopyIcon />} />
		<IconButton appearance="ghost" size="sm" label="Dismiss" icon={<XIcon />} />
		<IconButton appearance={look} label="Copy" icon={<CopyIcon />} />
	</>
);

export const Feedback = (
	<>
		<Alert.Root priority="warning">…</Alert.Root>
		<Toast.Root priority="success">…</Toast.Root>
		<AlertDialog.Root priority="danger">…</AlertDialog.Root>
		<AlertDialog.Action priority="default">Continue</AlertDialog.Action>
		<AlertDialog.Cancel priority="default">Cancel</AlertDialog.Cancel>
	</>
);

// Negative cases: a migrated button, a Badge, a non-mantle prop, and another
// library's Button stay as written. A Button whose appearance is dynamic gets
// no intent, and a value that can produce "default" keeps it.
export const Untouched = (
	<>
		<Button appearance="ghost" intent="neutral">
			Already migrated
		</Button>
		<Badge appearance="muted" color="green">
			ok
		</Badge>
		<img src="/hero.png" alt="" width={1200} height={630} fetchPriority="high" />
		<AntButton priority="danger">Foreign</AntButton>
		<AntButton>Foreign bare</AntButton>
		<Button appearance={look}>Dynamic appearance</Button>
		<Button appearance="outlined" priority={legacyTone}>
			Legacy tone
		</Button>
	</>
);

// Negative case: a parameter under the import's name shadows it, so neither
// the rename nor the stamp reaches the element.
export function Shadowed({ Button }: { Button: typeof AntButton }) {
	return (
		<>
			<Button priority="danger">Shadowed</Button>
			<Button>Shadowed bare</Button>
		</>
	);
}
