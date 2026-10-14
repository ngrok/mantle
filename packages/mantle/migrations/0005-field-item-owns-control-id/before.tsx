import { useId } from "react";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Field, Field as FormField } from "@ngrok/mantle/field";
import { Input, PasswordInput } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Field as FormikField } from "formik";

export const PasswordField = (
	<Field.Item name="password">
		<Field.Label htmlFor="password">Password</Field.Label>
		<Field.Control id="password">
			<PasswordInput autoComplete="current-password" />
		</Field.Control>
	</Field.Item>
);

export function TermsField() {
	const termsId = useId();
	return (
		<Field.Item name="terms">
			<Field.Label htmlFor={termsId} className="flex items-center gap-2">
				<Checkbox id={termsId} />
				Accept terms and conditions
			</Field.Label>
		</Field.Item>
	);
}

// A self-closing label and the aliased import are the same part.
export const AliasedField = (
	<FormField.Item name="name">
		{/* oxlint-disable-next-line react/no-children-prop -- a self-closing part is the shape under test */}
		<FormField.Label htmlFor="name" children="Name" />
		<FormField.Control id="name">
			<Input />
		</FormField.Control>
	</FormField.Item>
);

// Negative cases: a bare Label keeps htmlFor, Field.Item keeps its id, and
// another library's Field.Label is not the part.
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
		<FormikField.Label htmlFor="other">Other</FormikField.Label>
	</>
);

// Negative case: a parameter under the import's name shadows it.
export function ShadowedField({ Field }: { Field: typeof FormikField }) {
	return (
		<Field.Item name="shadowed">
			<Field.Label htmlFor="shadowed">Shadowed</Field.Label>
			<Field.Control id="shadowed">
				<Input />
			</Field.Control>
		</Field.Item>
	);
}
