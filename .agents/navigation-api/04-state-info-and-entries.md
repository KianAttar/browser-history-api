# State, info, and the entries list

## `state` vs `info` — the distinction a router must respect

| | `state` | `info` |
|---|---|---|
| Where set | `navigate(url, { state })`, `reload({ state })`, `updateCurrentEntry({ state })` | `navigate(url, { info })`, `back({ info })`, `forward({ info })`, `traverseTo(key, { info })`, `reload({ info })` |
| Where read | `entry.getState()` (any entry, any time) | `navigateEvent.info` (only inside the `navigate` listener for *that* navigation) |
| Lifetime | Persists on the entry; survives session restore; carried forward through `replaceState`-style updates | Transient — exists only for the single in-flight navigation, never stored |
| Structured-clone constraint | Yes — must be structured-cloneable | Yes |
| Typical use | Route params/loader data snapshot, scroll anchor id, form draft | "Why is this navigation happening" context: which UI triggered it, what transition/animation to play |

Concretely: if a photo gallery's "next" button and the browser back button can land on
the same URL, `state` can't distinguish *why* you got there but `info` can — e.g. pass
`{ direction: 'forward' }` as `info` from the "next" button's `navigate()` call to pick
a slide-in animation, vs. a back-navigation (which won't have that `info`) restoring
without animation.

## Reading/writing state

```js
// read (always a fresh structured-clone — mutating it is a no-op until written back)
const state = navigation.currentEntry.getState();

// write via navigation (creates/updates an entry, fires `navigate`)
navigation.navigate(url, { state: { scrollY: 0 } });

// write in place, no navigation, no `navigate` event — just `currententrychange`
navigation.updateCurrentEntry({ state: { ...state, scrollY: window.scrollY } });
```

`updateCurrentEntry` is the tool for "I want to stash something on the current history
entry without navigating" — e.g. persisting scroll position just before the user clicks
away, so that on `traverse` back you can read it from `getState()`.

## `key` / `id` / `index` semantics (recap with router implications)

- `key`: stable identity of a history **slot**. A router can use this as a cache key
  for "the rendered output that belongs at this position in history," independent of
  whatever URL/state currently occupies that slot. `traverseTo(key)` is the reliable
  way to jump back to a specific prior slot (e.g. a "back to search results" button
  that should work even if the user navigated deeper afterward and the slot's state
  changed).
- `id`: identity of the slot's **current content version** — changes on every
  replace/update. Use as a cache-invalidation key: if you cached rendered output keyed
  by `id`, a `replaceState`-style update naturally invalidates it because `id` changes
  even though `key` doesn't.
- `index`: position in `entries()`. `-1` once disposed. Useful for computing "how many
  steps back" a given `key` is, e.g. to implement `go(-2)`-style relative navigation
  by combining with `traverseTo`.

## The entries list

```js
const all = navigation.entries(); // NavigationHistoryEntry[], snapshot, same-origin only
```

- Snapshot, not live — re-call after navigations.
- Only same-origin, current-frame entries. No visibility into other frames or
  cross-origin history.
- On a **push** navigation: everything after the current index is pruned (forward
  history cleared), and each pruned entry fires `dispose`.
- On **replace**: current entry mutated in place (`key` same, `id` new), nothing pruned.
- On **reload**: entries list unchanged; current entry's state/URL may update if you
  passed `{ state }` to `reload()`.
- On **cross-origin navigation**: the whole entries list is left behind; a fresh one
  starts in the destination document. Cannot be un-done — there's no way to see the old
  origin's entries again from the new document.

## Router implications

A router library can use `entries()` + `dispose` to maintain a route-level LRU cache:
key cache entries by `NavigationHistoryEntry.key`, evict on `dispose`, and invalidate
individual cached renders when `id` changes. This gives "instant back/forward" (serve
cached render) without needing a separate cache-invalidation scheme layered on top of
plain History API state, which is what libraries like react-router currently have to
hand-roll with in-memory route loader caches.
