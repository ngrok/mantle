import { useId } from "react";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Field } from "@ngrok/mantle/field";
import { Input, PasswordInput } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";

export const PasswordField = (
	<Field.Item name="password">
		<Field.Label>Password</Field.Label>
		<Field.Control>
			<PasswordInput autoComplete="current-password" />
		</Field.Control>
	</Field.Item>
);

export function TermsField() {
	const termsId = useId();
	return (
		<Field.Item name="terms">
			<Field.Label className="flex items-center gap-2">
				<Checkbox id={termsId} />
				Accept terms and conditions
			</Field.Label>
		</Field.Item>
	);
}

// Negative cases: a bare Label keeps htmlFor, and Field.Item keeps its id.
export const Untouched = (
	<>
		<Label htmlFor="search">Search</Label>
		<Input id="search" />
		<Field.Item name="email" id="email">
			<Field.Label>Email</Field.Label>
			<Field.Control>
				<Input type="email" />
			</Field.Control>
		</Field.Item>
	</>
);
