---
"@ngrok/mantle": patch
---

Modernize the `Sidebar` and `AppLayout` class strings to Tailwind v4 syntax. The compiled CSS is unchanged —
these are the shorthands v4 added for what the bracket forms already expressed:

| Before                                        | After                                     |
| --------------------------------------------- | ----------------------------------------- |
| `w-[var(--sidebar-width,16rem)]`              | `w-(--sidebar-width,16rem)`               |
| `m-[var(--app-layout-card-gutter,0.5rem)]`    | `m-(--app-layout-card-gutter,0.5rem)`     |
| `group-data-[hydrated]/sidebar-nav:`          | `group-data-hydrated/sidebar-nav:`        |
| `group-has-[[data-slot~=sidebar-header]]/…`   | `group-has-data-[slot~=sidebar-header]/…` |
| `[border-radius:0.625rem]`                    | `rounded-[0.625rem]`                      |
| `[&>:first-child]:size-7`                     | `*:first:size-7`                          |

The CSS variables, their fallbacks, and the selectors they compile to are identical — the variable shorthand
carries its fallback (`w-(--sidebar-width,16rem)` still emits `width: var(--sidebar-width,16rem)`), and both
`:has()` forms match the same `data-slot` token. Only the class strings on the elements changed, so update any
test or stylesheet that matches them literally.
