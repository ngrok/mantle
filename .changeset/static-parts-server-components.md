---
"@ngrok/mantle": patch
---

These components are now React Server Components: `Anchor`, `Badge`, `Card`, `CenteredLayout`, `Code`, `DescriptionList`, `Empty`, `Flag`, `Icon`, `SvgOnly`, `Kbd`, `LiveRegion`, `Main`, `MediaObject`, `Skeleton`, `Slot`, `Strata`, `VisuallyHidden`, and `Well`. They hold no state, so the React Compiler no longer compiles them, and their chunks no longer start with `"use client"`. A server component renders them to HTML and sends no JavaScript for them to the browser.

On a page that renders only these components, the browser gets no mantle JavaScript, where it got about 18 KB (gzip) before. A client bundle of each component is 150 to 1,400 bytes (gzip) smaller. Each client component that renders `Slot` or `Icon`, such as `Button`, is also smaller.

The rendered HTML does not change. Their props, refs, and `asChild` work the same in client components.
