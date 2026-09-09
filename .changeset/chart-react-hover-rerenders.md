---
"@ngrok/mantle": patch
---

Hovering or keyboard-stepping a chart no longer re-renders the sr-only data table or the legend. Both parts read only the registered series, which a hover publish carries unchanged, so they now subscribe to the series alone. Before this change a dense line chart reconciled up to 150 table rows on every index change under the pointer, which competed with the canvas overlay for the frame. The tooltip and the live region still update on every hover.
