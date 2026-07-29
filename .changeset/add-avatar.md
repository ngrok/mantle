---
"@ngrok/mantle": minor
---

Add **`Avatar`** — a small image representing a person or an account, with a text or icon fallback for when
there is no picture, or before one loads. Import from `@ngrok/mantle/avatar`.

```tsx
import { Avatar } from "@ngrok/mantle/avatar";

// an account: a rounded square whose color is derived from its id
<Avatar.Root appearance="square" colorSeed={account.id}>
	<Avatar.Fallback name={account.name} />
</Avatar.Root>

// a person: a circle, with the fallback covering the load and any failure
<Avatar.Root>
	<Avatar.Image src={user.avatarUrl} alt="Jane Doe" />
	<Avatar.Fallback name="Jane Doe" />
</Avatar.Root>
```

- **`Avatar.Root`** owns the shape, size and surface. `appearance="circle"` (default) is a person;
  `appearance="square"` is a rounded square for the things people belong to — an account, workspace, or team.
  Keeping the two shapes distinct is what lets a row showing both stay legible without labels. It is `size-7`
  and `shrink-0`, so the flex rows an avatar usually sits in cannot squeeze it; `className` merges last, so
  `className="size-10"` wins.
- **`colorSeed`** hashes a stable id into one of 17 swatches and switches the foreground to
  `text-static-white`, so a subject keeps its color across renders, sessions, devices and the server with
  nothing stored. Seed it with an **id, not a display name** — a rename would otherwise recolor the avatar.
  Omit it for a neutral surface.
- **`Avatar.Image`** renders only once the image has actually loaded, so a slow or dead URL degrades to the
  fallback instead of flashing a broken-image icon. That is knowable only in a browser, so server-rendered
  markup always carries the fallback; the docs page shows the plain-`<img>` escape hatch for an above-the-fold
  avatar whose URL is known good. Its **`alt` is required** — stricter than both the `<img>` element and Radix,
  because an avatar is the one image everyone forgets and an `<img>` with no `alt` announces its URL. Pass
  `alt=""` when adjacent text already names the subject, which is the common case.
- **`Avatar.Fallback`** takes either `children` (an icon, a monogram) or `name`, which renders at most two
  uppercase initials — punctuation stripped, code points kept whole so an emoji-leading name survives, casing
  locale-invariant so SSR and the client agree. The two are mutually exclusive in the type. Derived initials
  are `aria-hidden`, because they abbreviate a name the page already carries beside the avatar; announcing them
  would read it twice ("A C Acme Corp"). Name the root (`role="img"` + `aria-label`) when the avatar is the only
  thing identifying its subject.
- Every part takes `asChild`, forwarded to Radix's own composition, and stamps `data-slot` (`avatar`,
  `avatar-image`, `avatar-fallback`), joining an ancestor-forwarded chain rather than replacing it.

**`Sidebar.AccountAvatar` and `Sidebar.UserAvatar` are removed.** They were the same component twice, scoped to
a place an avatar has no reason to be scoped to — the sidebar — which is why the ngrok dashboard had already
hand-rolled its own copy of the initials and swatch logic beside them. Migration:

```tsx
// before
<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
// after
<Avatar.Root appearance="square" colorSeed={account.id}>
	<Avatar.Fallback name={account.name} />
</Avatar.Root>

// before
<Sidebar.UserAvatar alt="Jane Doe" />
// after
<Avatar.Root aria-label="Jane Doe" className="text-muted" role="img">
	<Avatar.Fallback>
		<UserIcon className="size-4" />
	</Avatar.Fallback>
</Avatar.Root>

// before — with a photo
<Sidebar.UserAvatar src={user.avatarUrl} alt="Jane Doe" />
// after
<Avatar.Root>
	<Avatar.Image src={user.avatarUrl} alt="Jane Doe" />
	<Avatar.Fallback name="Jane Doe" />
</Avatar.Root>
```

The swatch palette and its hash are unchanged, so accounts keep the colors they already have. Two behavior
notes: the person silhouette is gone in favor of any icon you compose (the docs use Phosphor's `UserIcon`), and
`data-slot="sidebar-account-avatar"` / `"sidebar-user-avatar"` become `"avatar"` — update any selector or test
matching them.

Docs: https://mantle.ngrok.com/components/data-display/avatar
