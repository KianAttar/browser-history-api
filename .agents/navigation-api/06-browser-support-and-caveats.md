# Browser support, limitations, and prior art

## Support status (as of 2026-07-08)

- **Baseline "Newly Available" since January 2026.**
- Chrome / Edge: shipped since Chrome 102 (2022) — long-standing, mature implementation.
- Firefox: shipped in Firefox 147.
- Safari: shipped in Safari 26.2. **Missing `precommitHandler` support** (the
  `commit: 'after-transition'` + `NavigationPrecommitController.redirect()` flow) as of
  this writing — treat that feature as Chrome/Edge-only for now and design the library
  so it degrades gracefully (skip precommit redirect capability, or polyfill it by just
  not committing until an internal check resolves, done manually before calling
  `intercept()`).
- "Newly Available" (not yet "Widely Available") means: don't assume it's safe without
  a feature check / fallback for a few more years of long-tail browser versions,
  especially older mobile WebViews and enterprise-pinned browsers.

## Feature detection

```js
const hasNavigationAPI = typeof window !== 'undefined' && 'navigation' in window;
```

No official polyfill exists that fully replicates behavior (the semantics — centralized
event, entry list, key/id stability — aren't expressible in terms of the old History
API without approximation). Realistic strategy for a library:

- Build the public router API against the Navigation API's mental model.
- Ship a **fallback adapter** implemented with `history.pushState`/`popstate`/global
  click-and-submit interception for browsers lacking `window.navigation`, translating
  to/from the same internal event shape the Navigation-API adapter produces. This is
  exactly the "two implementations, feature-detected" tradeoff that made the React
  Router team hesitant to adopt it early (see below) — it's real added maintenance
  surface, not just a shim.

## Known API limitations (things a router cannot rely on this API for)

- **Does not fire on the very first (initial) page load** — only on subsequent
  navigations. Initial render/route-matching must still be done from
  `location.pathname` (or `navigation.currentEntry.url`, which is available
  immediately) on startup, not from a `navigate` event.
- **Frame-scoped only** — no cross-iframe coordination; a top-level router can't
  observe or drive navigations inside a same-origin iframe through this API.
- **Cannot reorder or programmatically delete arbitrary history entries** — you can
  prune the future ones (via a push) or traverse, but there's no `entries.remove(key)`.
  (This was under discussion upstream; not available.)
- Cross-origin navigations can never be intercepted, and once you cross origins you
  lose access to the old entries list — no "SPA that spans origins" trick is possible
  through this API alone.

## Prior art / ecosystem signal

- **react-router**: discussed adopting the Navigation API (see
  `remix-run/react-router` discussion #11046) but held off specifically because of the
  Safari-support gap and the cost of shipping two full navigation implementations
  (feature-detected) to every user. Now that Safari has shipped it (26.2), this
  objection is largely resolved — worth revisiting react-router's actual adoption
  status when this knowledge base is next updated, but as of research date they had
  not shipped Navigation-API-based routing.
- No widely-adopted standalone "Navigation-API router" library was found in this
  research pass — this is a relatively greenfield space, which is consistent with the
  API only recently reaching Baseline.
- Chrome's own devrel guide (`developer.chrome.com/docs/web-platform/navigation-api`)
  is effectively a mini router tutorial and is the best source for canonical usage
  patterns (guard function, form handling, scroll-then-fetch-more pattern) — patterns
  already folded into docs 03–05 of this knowledge base.

## Implication for this project

Given Safari support is very recent (26.2) and Firefox likewise (147), plan for:
1. A feature-detected fallback path (or, initially, just document the minimum browser
   versions required and skip the fallback for v0).
2. Treating `precommitHandler`/redirect-before-commit as a progressive enhancement,
   not a load-bearing feature of v1's public API.
