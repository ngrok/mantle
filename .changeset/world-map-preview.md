---
"@ngrok/mantle": minor
---

Add `WorldMap` (preview) at `@ngrok/mantle/world-map`: a canvas-rendered world map that plots points by longitude and latitude on the Robinson projection, such as agents placed by their IP address.

- `WorldMap.Root` takes `data`, `longitudeKey`, an optional `labelKey` that names each point, an optional `sizeKey` that makes a point's area follow a count, and an optional `bounds` that zooms the map to one region.
- `WorldMap.Point` adds one series, reads its latitudes from `latitudeKey`, and takes a required `color`.
- `WorldMap.Graticule` draws meridians and parallels every 30°.
- `WorldMap.Connector` draws a great-circle line between two places, such as from a client to the ngrok edge.
- `WorldMap.Callout` keeps a card over one place without a hover. It carries `data-slot="world-map-callout"` and `data-side`. `data-side` names the side the callout sits on after placement, so it changes when the callout flips to the side with room.
- `WorldMap.Tooltip` customizes the readout. `WorldMap.Legend` names the series.

The map has the same interaction contract as the other charts. It is one Tab stop, and the arrow keys step from west to east. With `bounds`, the keyboard skips a point outside the plot, and the data table still lists it. The tooltip and the announcements name each point, and give its size value when `sizeKey` is set. Focus mounts an sr-only data table that lists the first 150 points from west to east. When new rows arrive, a point at a new place pulses once, except under reduced motion. Set `--world-map-land-color` and `--world-map-ocean-color` on the Root to restyle the map. Only `WorldMap` loads the projection and the land outline. The other charts grow by less than 1 KB gzip for the shared readout support.

Docs: https://mantle.ngrok.com/components/preview/world-map
