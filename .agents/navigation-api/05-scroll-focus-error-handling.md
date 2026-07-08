# Scroll restoration, focus management, and error handling

These are the UX details the Navigation API standardizes that a hand-rolled
History-API router usually gets wrong or skips. A library built on this API should
default to the platform behavior and only override deliberately.

## Scroll

- Governed by the `scroll` option of `intercept()`: `'after-transition'` (default) or
  `'manual'`.
- **Push/replace navigations**: default behavior scrolls to the URL fragment if
  present, otherwise resets scroll to top — applied automatically right after your
  `handler` promise settles.
- **Traverse/reload navigations**: default behavior restores the scroll position the
  user had at that history entry previously — also applied right after `handler`
  settles.
- `scroll: 'manual'`: you call `event.scroll()` yourself whenever you want the
  browser's default scroll behavior to kick in — e.g. after primary content paints but
  before secondary/below-the-fold content loads, so the fragment-scroll target already
  exists in the DOM:

```js
event.intercept({
  scroll: 'manual',
  async handler() {
    const primary = await getArticleContent(url.pathname);
    renderArticlePage(primary);
    event.scroll(); // now scroll to #fragment or restore position
    const secondary = await getSecondaryContent(url.pathname);
    addSecondaryContent(secondary);
  },
});
```

- If the user manually scrolls before the handler settles, automatic scroll
  restoration is suppressed (the browser assumes intentional user action wins).

## Focus

- Governed by `focusReset`: `'after-transition'` (default) or `'manual'`.
- Default: after `handler` settles, focus moves to `document.body` or the first
  `[autofocus]` element in the new content — unless the user already manually focused
  something visible during the transition, in which case the browser leaves it alone.
- `focusReset: 'manual'`: you own it entirely. Typical pattern for back/forward: store
  an identifier for the focused element in `state` before navigating away, then on a
  `traverse` navigation's `navigatesuccess` (or end of `handler`), look it up and
  restore focus to it.

## Error handling

| Scenario | Effect |
|---|---|
| `event.preventDefault()` called (navigation was cancelable) | `committed` and `finished` both reject with `AbortError`; URL never changes; `navigateerror` fires. |
| `intercept()`'s `handler` promise rejects | `navigateerror` fires with the rejection reason; if already committed, only `finished` rejects (URL stays changed — you're responsible for rendering an error state); if not yet committed (`commit: 'after-transition'` case), `committed` also rejects. |
| `traverseTo(key)` with a `key` that no longer exists | Both promises reject `InvalidStateError`; current entry unchanged. |
| Navigation superseded (user navigates again, or presses Stop, before handler settles) | `event.signal` aborts (pass it to `fetch`!), `navigateerror` fires with `AbortError`, `finished` rejects. |

## Cancelability rules (when `preventDefault()`/non-interception is even allowed)

- User-initiated **cross-document** navigations (address bar edit, external link in
  a new context, `document.open()`) are **not cancelable** — you cannot block the user
  from leaving via the URL bar. This is an intentional escape hatch so a broken router
  can never trap the user.
- **Traversals** (back/forward) are only cancelable if: the navigation is in the top
  window, is same-document, and is either user-initiated with active user activation,
  or purely programmatic. A single back-button press can always eventually get the user
  out — repeated `preventDefault()` on traversals is constrained specifically to avoid
  history-trapping patterns some sites abuse with `popstate` today.

## Practical recommendation for the router library

- Default to platform scroll/focus behavior (`'after-transition'` for both) unless a
  route explicitly opts into custom transition choreography.
- Always thread `event.signal` into any `fetch`/loader call inside `handler`.
- On `handler` rejection, render an app-level error boundary for that route rather than
  leaving the previous view stale — the URL will already have committed by default.
