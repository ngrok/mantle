/**
 * Re-exports for the CenteredLayout component.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 */

import * as CenteredLayoutParts from "./centered-layout-parts.js";

/**
 * A viewport-filling centered page flow for sign-in, sign-up, onboarding,
 * 404, checkout, and other focused full-page states. It owns structure only:
 * the flex/overflow skeleton and region ordering. App state (routing,
 * sessions) never enters it, and landmark semantics stay compositional:
 * brand marks, links, and the `Main` landmark arrive as composed JSX.
 *
 * @useWhen Center one focused full-page flow, such as sign-in, sign-up, onboarding, checkout, or a
 * 404 page.
 *
 * @siblings
 * - `AppLayout`: the page sits in a signed-in app, with a sidebar and a header that persist across routes.
 *
 * @see https://mantle.ngrok.com/layouts/centered-layout
 *
 * @example
 * Composition:
 * ```
 * CenteredLayout.Root
 * ├── CenteredLayout.Notice
 * ├── CenteredLayout.Header
 * ├── CenteredLayout.Body
 * └── CenteredLayout.Footer
 * ```
 *
 * @example
 * ```tsx
 * <CenteredLayout.Root>
 *   <SkipToMainLink />
 *   <CenteredLayout.Body>
 *     <a href="https://ngrok.com">
 *       <NgrokWordmarkIcon className="h-auto w-24" />
 *     </a>
 *     <Main>
 *       <SignInCard />
 *     </Main>
 *   </CenteredLayout.Body>
 *   <CenteredLayout.Footer>
 *     <ThemeSwitcher />
 *   </CenteredLayout.Footer>
 * </CenteredLayout.Root>
 * ```
 */
const CenteredLayout = CenteredLayoutParts;

export {
	//,
	CenteredLayout,
};
