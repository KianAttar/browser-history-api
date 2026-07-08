# The `navigate` event and interception — the core mechanism

This is what a router library is actually built on. Everything else in the API is
support machinery around this one event.

## `NavigateEvent` full property/method list

Extends `Event`.

| Member | Type | Notes |
|---|---|---|
| `navigationType` | `'push'\|'replace'\|'reload'\|'traverse'` | What kind of navigation this is. |
| `canIntercept` | `boolean` | `false` for cross-origin navigations, or other cases where `intercept()` is disallowed. **Always check this first.** |
| `userInitiated` | `boolean` | `true` only for genuine user interaction (link click, form submit, browser back/forward UI). Programmatic `navigation.navigate()` is `false` even if called from inside a click handler. Useful for analytics / gesture-gated behavior. |
| `hashChange` | `boolean` | `true` for a same-document fragment-only navigation. Typically you `return` early on this and let the browser do its default same-document fragment scroll — unless you want custom in-page anchor handling. |
| `formData` | `FormData \| null` | Present for a `POST` form submission navigation. |
| `downloadRequest` | `string \| null` | Non-null (holds the suggested filename) if this is a link with a `download` attribute — never intercept these. |
| `destination` | `NavigationDestination` | Target URL/state/key info. |
| `signal` | `AbortSignal` | Aborts if this navigation gets superseded/canceled — pass to `fetch()` so in-flight requests die when the user navigates again mid-load. |
| `info` | `any \| undefined` | Whatever was passed as `{ info }` to the triggering `navigate()`/`back()`/etc. call. Transient, not persisted. |
| `sourceElement` | `Element \| null` | The `<a>` or `<form>` that triggered this, if any. |
| `hasUAVisualTransition` | `boolean` | Whether the browser already ran a built-in visual transition before dispatching (relevant to View Transitions interplay). |
| `cancelable` | `boolean` (inherited) | Whether `preventDefault()` is allowed. |
| `intercept(options?)` | method | Converts this into a same-document (SPA) navigation; see below. |
| `preventDefault()` | method | Cancels the navigation outright (blocks it from happening at all). Not always allowed — see doc 05 for traversal restrictions. |
| `scroll()` | method | Manually trigger the browser's default scroll behavior (fragment scroll / restore) at a time of your choosing — only meaningful when you set `scroll: 'manual'` in `intercept()`. |

## `intercept(options)`

```ts
event.intercept({
  handler?: () => Promise<void>,               // default: no-op
  precommitHandler?: (controller: NavigationPrecommitController) => Promise<void>,
  commit?: 'immediate' | 'after-transition',    // default: 'immediate'
  scroll?: 'after-transition' | 'manual',       // default: 'after-transition'
  focusReset?: 'after-transition' | 'manual',   // default: 'after-transition'
});
```

- Calling `intercept()` is what makes the navigation same-document: URL bar updates,
  a new/updated `NavigationHistoryEntry` is created, but no full page load occurs.
- **Only legal when `canIntercept` is `true`**, and the destination URL differs from
  the current URL only in path/query/fragment (same-origin, same-document-eligible) —
  same constraint as `history.pushState()`.
- `handler` does your async work: fetch data, mount/unmount views. The
  `navigation.transition` object is populated while it runs. When it resolves,
  `navigatesuccess` fires and the transition's `finished` promise resolves; the
  `finished` promise returned by the *triggering* call (`navigate()`, `back()`, etc)
  also resolves then.
- `commit: 'immediate'` (default): URL/entry commits right away, before `handler` runs.
  `commit: 'after-transition'`: navigation stays uncommitted while `precommitHandler`
  runs; you get a `controller` you can call `controller.redirect(url, options)` on to
  change the destination before anything commits (client-side redirect gate, e.g. auth
  checks) — Safari does not support this option yet (as of Safari 26.2).
- `scroll` / `focusReset`: control when the browser applies its default scroll
  restoration / focus reset relative to your handler. `'after-transition'` (default)
  applies it right after handler settles; `'manual'` means you call `event.scroll()`
  yourself at the right moment (e.g. after first paint but before secondary content
  loads) and you own focus management entirely. See doc 05.

## Deciding whether to intercept — canonical guard pattern

```js
function shouldNotIntercept(navigateEvent) {
  return (
    !navigateEvent.canIntercept ||
    navigateEvent.hashChange ||
    navigateEvent.downloadRequest !== null ||
    navigateEvent.formData // unless you specifically want to handle POST forms
  );
}

navigation.addEventListener('navigate', (event) => {
  if (shouldNotIntercept(event)) return;

  const url = new URL(event.destination.url);
  event.intercept({
    async handler() {
      // route match + render
    },
  });
});
```

This guard function is effectively the first line of any router built on this API —
it's the equivalent of react-router's "is this a same-app path, and should we hijack
it" logic that today requires manual `<a>` click interception.

## Handling forms

```js
navigation.addEventListener('navigate', (event) => {
  if (event.formData && event.canIntercept) {
    event.intercept({
      focusReset: 'manual',
      scroll: 'manual',
      async handler() {
        const res = await fetch(event.destination.url, {
          method: 'POST',
          body: event.formData,
          signal: event.signal,
        });
        if (!res.ok) throw new Error('submit failed');
        // render result, then event.scroll() when ready
      },
    });
  }
});
```

`event.destination.url` for a form submit reflects the form's resolved action URL
(query string included for GET; for POST it's the action URL with the body in
`formData`).

## Distinguishing navigation types in the handler

```js
navigation.addEventListener('navigate', (event) => {
  if (shouldNotIntercept(event)) return;

  if (event.navigationType === 'traverse') {
    // back/forward — prefer restoring from an in-memory cache keyed by
    // event.destination.key over refetching
  }

  event.intercept({ handler: () => renderForRoute(event) });
});
```

## Error propagation

- If `handler` throws / its returned promise rejects: `navigateerror` fires on
  `navigation`, and the `finished` promise (both the transition's and the triggering
  call's) rejects with that reason. `committed` still resolves if commit already
  happened (default `commit: 'immediate'`).
- If you call `event.preventDefault()` instead of intercepting: both `committed` and
  `finished` reject with `AbortError`, URL never changes, `navigateerror` fires.
