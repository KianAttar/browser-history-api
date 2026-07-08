# Overview

## What it is

The **Navigation API** (`window.navigation`, interface `Navigation`) is a browser API
purpose-built for single-page application (SPA) routing. It is the intended successor
to `window.history` / `window.location` for this use case. Standardized in the
WHATWG HTML spec (not a separate WICG spec anymore — it moved into
`html.spec.whatwg.org`), originally incubated at https://github.com/WICG/navigation-api.

Status: **Baseline "Newly Available" since January 2026.** Shipped in Chrome/Edge since
Chrome 102 (2022); Firefox shipped in version 147; Safari shipped in 26.2. Safari's
implementation is missing `precommitHandler` support as of this writing.

## Why it exists — problems with the History API

- `history.pushState`/`replaceState`/`back`/`forward` have **no interception hook**.
  To build a router you must globally intercept `click` on every `<a>`, intercept
  `<form>` submits, listen to `popstate`, reconstruct what "kind" of navigation
  happened, and manually diff URLs — all bespoke, all fragile.
- `popstate` doesn't distinguish push vs. replace vs. traverse, doesn't tell you
  distance/direction of a back/forward traversal, and fires **after** the URL has
  already changed, so you can't cleanly cancel or await it.
- History `state` is a single opaque blob on `history.state`; there's no way to
  enumerate history entries, no stable identity for an entry, no per-entry `dispose`
  signal for cache cleanup.
- No standard way to intercept form submissions as SPA navigations.
- No integrated scroll-restoration or focus-management contract.
- Accessibility tooling and browser UI have no visibility into SPA navigations
  (e.g. no navigation-in-progress indicator).

## Mental model

- There is one global `navigation` object per browsing-context-scoped-to-origin
  (per frame, same-origin only — see caveats doc).
- `navigation` owns a linear **entries list** of `NavigationHistoryEntry` objects,
  plus a pointer to the `currentEntry`.
- **Every** navigation — link click, form submit, back/forward button, `navigation.navigate()`,
  `history.pushState()`, address-bar edit, `location.href =`, reload — funnels through a
  single `navigate` event fired on the `navigation` object. This centralization is the
  whole point: a router registers **one** listener instead of hooking clicks/forms/popstate
  separately.
- Inside that listener, if the navigation is same-origin and intercept-eligible, the
  router calls `event.intercept({ handler })`. The browser then treats it as an SPA
  (same-document) navigation: URL/history updates immediately, and `handler()` does the
  async work (fetch data, swap out the rendered page) while the browser manages loading
  state, scroll, and focus semantics around it.
- Navigation methods (`navigate`, `back`, `forward`, `traverseTo`, `reload`) return
  `{ committed, finished }` — two promises — so callers can await either "URL/entry
  updated" or "the whole navigation, including the intercept handler, is done."

## Scope / isolation

- Frame-scoped: each frame (main frame, each iframe) has its own `navigation` object
  and its own entries list.
- Origin-scoped: `entries()` only ever contains same-origin entries for the current
  frame. Navigate cross-origin and you leave the current entries list behind entirely
  (a fresh one starts in the destination document).
- This is deliberately narrower than `window.history`, which is not origin-filtered
  and includes iframe-driven entries — that raw exposure was itself a source of bugs
  and privacy leakage the new API avoids.
