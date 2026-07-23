import type { ComponentPropsWithoutRef } from "react";

/**
 * Inline User Shield icon used by the dashboard for Identity & Access.
 */
export function UserShieldIcon(props: ComponentPropsWithoutRef<"svg">) {
	return (
		<svg fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em" {...props}>
			<path d="M2.87 3.5c.23-.24.55-.38.88-.38h12.5a1.25 1.25 0 0 1 1.25 1.25v4.38a9.9 9.9 0 0 1-3.67 7.98 11.49 11.49 0 0 1-3.64 1.99h-.02l-.17-.6-.17.6H9.8a3.51 3.51 0 0 1-.31-.1 11.49 11.49 0 0 1-3.33-1.89A9.9 9.9 0 0 1 2.5 8.75V4.37c0-.33.13-.64.37-.88ZM10 17.46a7.52 7.52 0 0 0 .82-.32 10.24 10.24 0 0 0 3.08-2.18 5 5 0 0 0-7.78.02A10.24 10.24 0 0 0 10 17.47ZM5.31 14a6.25 6.25 0 0 1 2.38-1.69 3.74 3.74 0 1 1 4.65 0 6.24 6.24 0 0 1 2.36 1.67 8.91 8.91 0 0 0 1.55-5.24V4.37H3.75v4.38a8.9 8.9 0 0 0 1.56 5.26Zm4.6-2.14a5.67 5.67 0 0 1 .2 0 2.5 2.5 0 1 0-.2 0Z" />
			<path d="m10 18.13.17.6a.63.63 0 0 1-.34 0l.17-.6Z" />
		</svg>
	);
}
