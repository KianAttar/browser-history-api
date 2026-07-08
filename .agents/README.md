# .agents knowledge base

Reference material gathered for building a react-router-like routing library on
top of the browser's **Navigation API** (`window.navigation`).

Read order for anyone (agent or human) picking up this project cold:

1. `navigation-api/01-overview.md` — what the API is, why it exists, mental model
2. `navigation-api/02-interfaces-reference.md` — full interface/method/property reference
3. `navigation-api/03-navigate-event-and-interception.md` — the core mechanism a router is built on
4. `navigation-api/04-state-info-and-entries.md` — state vs info, entries list, keys/ids
5. `navigation-api/05-scroll-focus-error-handling.md` — the UX details routers must not break
6. `navigation-api/06-browser-support-and-caveats.md` — what to polyfill/guard against, prior art
7. `navigation-api/07-router-library-design-notes.md` — how these pieces map to a react-router-style API

Sources are primary: MDN, the WHATWG HTML spec, the WICG navigation-api explainer/README,
and the Chrome for Developers guide. Last verified 2026-07-08.
