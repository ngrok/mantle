---
"@ngrok/mantle": patch
---

`OtpInput.Slot` now renders `translate="no"`, so a browser translation engine skips the passcode character
inside it.

A one-time passcode is never translatable. An engine that treats the character as prose shows the reader a
character the code does not contain, and the reader types it back.

The attribute also protects the render. Google Translate wraps each text node in a `<font>`, which detaches
the node React holds. The next keystroke then makes React remove a node its parent no longer owns, and the
DOM raises `NotFoundError` — which tears down the root when no error boundary sits above it. Backspacing a
digit on a translated page hit this. `translate="no"` prevents it, because the engine never enters the slot.

The slot omits `translate` from its props type, so passing it is a compile error, and it stamps the attribute
after the props spread, so a wider props object cannot carry a value past the type either. `Kbd` and
`CodeBlock.Code` already lock the attribute the same way.

```tsx
import { OtpInput } from "@ngrok/mantle/otp-input";

// <div data-slot="otp-input-slot" … translate="no">4</div>
<OtpInput.Root maxLength={6}>
	<OtpInput.Group>
		<OtpInput.Slot index={0} />
	</OtpInput.Group>
</OtpInput.Root>;
```
