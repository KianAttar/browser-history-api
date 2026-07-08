# Interface reference

Full surface area of the API. This is the file to grep when you need an exact
method signature or property name while writing code.

## `Navigation` (the `window.navigation` singleton)

Properties:
- `currentEntry: NavigationHistoryEntry` — the entry for the current document.
- `transition: NavigationTransition | null` — non-null while a navigation initiated
  via `intercept()` is in flight.
- `canGoBack: boolean`
- `canGoForward: boolean`

Methods:
- `entries(): NavigationHistoryEntry[]` — snapshot array, same-origin, current frame
  only, ordered by position. Re-call after navigations; it's not live.
- `navigate(url: string, options?: { state?: any, history?: 'auto'|'push'|'replace', info?: any }): { committed: Promise<NavigationHistoryEntry>, finished: Promise<NavigationHistoryEntry> }`
- `reload(options?: { state?: any, info?: any }): { committed, finished }`
- `back(options?: { info?: any }): { committed, finished }`
- `forward(options?: { info?: any }): { committed, finished }`
- `traverseTo(key: string, options?: { info?: any }): { committed, finished }`
- `updateCurrentEntry(options: { state: any }): void` — synchronous, in-place state
  update on the current entry, **no navigation occurs**, no `navigate` event fires.
  Fires `currententrychange`.

Events (all on `navigation`, use `addEventListener`):
- `navigate` — cancelable (usually), fires for every navigation type; see doc 03.
- `navigatesuccess` — fires after a navigation (and its intercept handler, if any)
  completes successfully.
- `navigateerror` — fires on failure; event is an `ErrorEvent`-like object exposing
  `.message`, `.error`.
- `currententrychange` — fires whenever `currentEntry` changes, including from
  `updateCurrentEntry()`. Event type `NavigationCurrentEntryChangeEvent` exposes
  `navigationType: NavigationType | null` and `from: NavigationHistoryEntry`.

## `NavigationHistoryEntry`

Represents one slot in the entries list.

- `url: string`
- `key: string` — UA-generated UUID identifying the history **slot**. Stable across
  `replaceState`/`updateCurrentEntry`/reloads. Use this for `traverseTo(key)` to
  reliably return to "the same place" (e.g. a back-to-list button). Resets on
  cross-origin navigation. Persists across session restore.
- `id: string` — UA-generated UUID identifying this entry's **current state**.
  Changes every time the entry's state/URL is modified (replace, updateCurrentEntry).
  Good for cache-keying content associated with an entry (invalidate cache when `id`
  changes even if `key` is the same).
- `index: number` — position in `navigation.entries()`; `-1` if the entry has been
  disposed (pruned from history).
- `sameDocument: boolean` — whether this entry's document is the currently active one.
- `getState(): any` — returns a **structured-clone copy** of the entry's state every
  call (never a live reference — mutate the returned object all you want, it won't
  persist until you explicitly write it back via `navigate`/`reload`/`updateCurrentEntry`).

Events:
- `dispose` — fires on the entry object itself when it's permanently pruned from the
  entries list (e.g. a new push navigation truncates forward history). Good hook for
  cleaning up per-entry caches.

## `NavigateEvent` (extends `Event`)

Fired on `navigation` for every navigation. Full property/method list is in doc 03
since it's the crux of building a router — this file just indexes it.

## `NavigationDestination`

Info about where a navigation is headed, exposed as `NavigateEvent.destination` and
`NavigationTransition.to`.

- `url: string`
- `sameDocument: boolean`
- `key: string | null` — only populated for traversals to an existing same-origin entry.
- `id: string | null` — ditto.
- `index: number` — `-1` if not a traversal to a known entry.
- `getState(): any` — clone of the state the destination entry *will* have.

## `NavigationTransition`

Exposed as `navigation.transition` while an intercepted navigation is in flight.

- `navigationType: NavigationType` (`'push'|'replace'|'reload'|'traverse'`)
- `from: NavigationHistoryEntry`
- `to`: (per spec text also referenced as destination info; in practice consult
  `finished` + `from` — treat `to` as the destination entry/description)
- `finished: Promise<void>` — resolves/rejects when the transition (handler) completes.

## `NavigationActivation`

Represents a recent **cross-document** navigation (i.e. not something a same-document
router cares about day to day, but relevant for measuring initial-load navigation type,
e.g. distinguishing a hard reload from a back-navigation that landed on a fresh document).
Exposes navigation type plus current/destination `NavigationHistoryEntry`-like info.

## `NavigationPrecommitController`

Passed into a `precommitHandler` (see doc 03) — lets you `redirect(url, options)` the
navigation to a different destination *before* the URL commits, enabling client-side
"post-redirect-get"-style flows (e.g. auth gate that redirects to `/login` without ever
flashing the original URL in the address bar).

## Method return shape: `{ committed, finished }`

Every navigation-initiating method (`navigate`, `reload`, `back`, `forward`,
`traverseTo`) returns this pair of promises:

- `committed` resolves once the URL/entry has updated (i.e. `currentEntry` now reflects
  the destination), or rejects if the navigation was aborted/prevented before committing.
- `finished` resolves once any `intercept()` handler has fully settled, or rejects with
  the handler's rejection reason (or `AbortError`/`InvalidStateError` — see doc 05).

For a router, `committed` is "safe to consider the URL changed"; `finished` is "safe to
consider the page fully rendered."
