# Claude Code — project memory for Nitro-V3

This file is read automatically by Claude Code at session start. It captures
the conventions and current state of this branch so a new session can hit
the ground running.

## TL;DR

This branch — **`feat/react19-modernization`** — is a long-running modernization
of the Nitro V3 client: bump to React 19.2 idioms, add the supporting
infrastructure (TanStack Query, Zustand, Vitest, React Compiler, error
boundaries), split a few god-hooks, and audit logic bugs along the way.
PR is **#2** on `simoleo89/Nitro-V3`.

Detailed status, decisions, and next steps live in **`docs/ARCHITECTURE.md`** —
read that before starting anything non-trivial.

## Commands

| Goal | Command |
|---|---|
| Dev server | `yarn start` |
| Production build | `yarn build` |
| Lint | `yarn eslint` |
| Type-check (TS 7 native, fast) | `yarn typecheck` |
| Test (Vitest, once) | `yarn test` |
| Test (watch) | `yarn test:watch` |

The renderer SDK (`@nitrots/nitro-renderer`) is consumed via a filesystem
link to a sibling working tree — `../Nitro_Render_V3` (preferred) or
`../renderer` (legacy). Without it, `yarn typecheck` reports TS2307 across
the codebase — that's expected on a sandbox without the renderer, not a
regression.

## Stack snapshot

- React 19.2.5, `react-dom` 19.2.5, `@types/react` 19.2.x.
- TypeScript: TS 6 for build, **TS 7 native preview** (`@typescript/native-preview`,
  invoked via `tsgo`) for the `typecheck` script.
- Vite 8 + `@vitejs/plugin-react` 6 + `babel-plugin-react-compiler` 1.0.
- ESLint 10 + `typescript-eslint` 8 + `eslint-plugin-react-hooks@7` +
  `eslint-plugin-react-compiler`.
- TanStack Query 5 (`@tanstack/react-query` + devtools).
- Zustand 5.
- Vitest 3 + jsdom + `@testing-library/react` + `@testing-library/jest-dom`.
- `react-error-boundary` 6.

## Layout convention (DO NOT CHANGE)

Established by the team and recorded in `docs/ARCHITECTURE.md` proposal #3
(rejected the `src/features/` alternative). Stay on this layout — every PR
that violates it will need to be reworked.

```
src/components/<area>/<feature>/         → views (.tsx only)
  e.g. src/components/room/widgets/doorbell/DoorbellWidgetView.tsx

src/hooks/<area>/<feature?>/             → hooks, FLAT files, no per-feature subfolder
  e.g. src/hooks/rooms/widgets/useDoorbellState.ts
       src/hooks/rooms/widgets/useDoorbellActions.ts
       src/hooks/rooms/widgets/useDoorbellWidget.ts (deprecated shim)

src/api/                                 → cross-cutting helpers (LocalizeText, composers, formatters)
src/common/                              → reusable UI primitives + error boundary
src/state/                               → Zustand stores (cross-feature only)
tests/                                   → Vitest suites (mirror filename of subject)
```

When splitting a god-hook the convention is **3 files, all flat in the
hooks barrel directory**:

- `use<Feature>State.ts` — state + event subscriptions + derived values
- `use<Feature>Actions.ts` — pure imperative actions (no state writes)
- `use<Feature>Widget.ts` — deprecated wrapper that composes the two and
  preserves the old return shape so existing consumers don't break

See `useDoorbellState`/`useDoorbellActions`/`useDoorbellWidget` as the
canonical pattern.

## Patterns to use

### `useNitroEventState` / `useMessageEventState`

For "derived state from a single event" replace the two-step
`useState + useNitroEvent(e => setState(...))` with a single call:

```ts
const foo = useNitroEventState(SomeEvent, e => e.payload, initial);
const data = useMessageEventState(SomeParser, e => e.getParser()?.field ?? null, null);
```

The selector is held in a `useLayoutEffect`-refreshed ref so the listener
stays registered across renders. Both hooks are exported from
`src/hooks/events`.

### `useNitroQuery`

For composer/parser request-response pairs:

```ts
const { data } = useNitroQuery<SomeParser, SomeData>({
    key: ['nitro', 'domain', 'request', ...args],
    request: () => new SomeComposer(args),
    parser: SomeParser,
    select: e => e.getParser()?.data,
    accept: e => e.getParser()?.correlationKey === args, // optional, for shared event bus
    staleTime: 60_000,
});
```

Already wired up; `QueryClientProvider` is mounted in `src/index.tsx`.
Adopted on `OfferView`, `CatalogLayoutRoomAdsView`, `ModToolsChatlogView`,
`CfhChatlogView`.

### Zustand stores

For cross-feature UI state (avoid module-level `let`):

```ts
import { createNitroStore } from '@/state/createNitroStore';

export const useFooStore = createNitroStore<FooState>()((set) => ({
    ...
}));
```

Components subscribe to slices, not the whole store:

```ts
const value = useFooStore(s => s.value);
```

First adoption: `src/components/navigator/views/navigatorRoomCreatorStore.ts`.

### `WidgetErrorBoundary`

Wrap any in-room widget tree so a crash degrades gracefully (logs to
NitroLogger, falls back to `null`). Already applied at `RoomWidgetsView`
as an umbrella; per-widget wrapping is a follow-up.

```tsx
<WidgetErrorBoundary name="ChatWidget">
    <ChatWidgetView />
</WidgetErrorBoundary>
```

### Form Actions

Login / Register / Forgot in `src/components/login/LoginView.tsx` use
`useActionState` + `useFormStatus`. The legacy non-Action versions in
`src/components/login/components/{Register,Forgot}Dialog.tsx` and
`shared.ts` have been **removed** (dead code).

## What's wired up and what isn't

| Adopted | Pilot sites |
|---|---|
| `useNitroEventState` + companions (Reducer, ExternalSnapshot) | `OfferView`, `useAvatarInfoWidget` (figure/badges/group reducer), `useInventoryFurni` (pure reducers + fragments useRef) |
| `useNitroQuery` + `useNitroEventInvalidator` | `OfferView`, `CatalogLayoutRoomAdsView`, `ModToolsChatlogView`, `CfhChatlogView`, `useGiftConfiguration`, `useUserGroups`, `useClubOffers(windowId)`, `useSellablePetPalette(breed)`, `useMarketplaceConfiguration`, `useClubGifts` (with invalidator) |
| Zustand | `NavigatorRoomCreatorView` (`useRoomCreatorStore`) |
| God-hook split (state + actions + shim) | `doorbell`, `poll`, `furni-chooser`, `user-chooser`, `friend-request`, `chat-input` |
| God-hook split (`useBetween` singleton + state filter + actions filter + shim) | `wired-tools`, `translation` |
| `WidgetErrorBoundary` | `RoomWidgetsView` umbrella |
| Vitest | 99/99 cases on pure helpers + the Zustand store |

| Not yet | Notes |
|---|---|
| Core `useCatalog` split | Session-stable secondary fetches all migrated to TanStack queries (see ARCHITECTURE.md). What's left: core `rootNode`/`offersToNodes`/`currentPage` slice + Builders Club status. Needs a dedicated `useCatalogData`/`useCatalogUiState`/`useCatalogActions` split. |
| Split `useChatWidget` / `useAvatarInfoWidget` | Both state-driven via events with no clean imperative actions to extract — skip-motivated. Already touched today for the InfoStand listener move. |
| Split `usePetPackageWidget` / `useWordQuizWidget` / `useChatCommandSelector` | Their "actions" mutate internal state or are tightly interdependent — skip-motivated. |
| Hoist Wired Creator Tools shared state to a Zustand slice | Would remove ~25 props passed to the 3 tab sub-components. (Wired-tools split done as singleton-filter; Zustand slice is the next step.) |
| Wider Vitest coverage (React components) | `@testing-library/*` is installed; needs a small renderer-SDK mock layer first. |

## Known open logic bugs

Read `docs/ARCHITECTURE.md` "Known logic bugs" section. The two still-open
ones:

- `MainView.tsx:47-48` — race between `RoomSessionEvent.CREATED` and `ENDED`
  (no session token guard).
- `LayoutFurniImageView` / `LayoutAvatarImageView` — async fetch race when
  props change twice in quick succession.

Fix shapes documented; both are reasonable PRs on their own.

## House rules

- **Commit author**: `simoleo89 <simoleo89@users.noreply.github.com>`.
  When committing, pass these via per-command overrides
  (`git -c user.name=simoleo89 -c user.email=...`) — do NOT modify the
  global git config.
- **No `claude/...` branch names** — auto-generated names should be
  renamed before pushing. Prefer `feat/<description>`.
- **Never merge a branch that violates the layout convention** above.
  The `feat/react19-hooks-adapter` branch (deleted) put hooks under
  `src/components/...`; that's wrong and a recurring temptation.
- **Skip-motivated god-hook splits are fine** — when a hook's actions
  mutate internal state, document the reason in the commit message and
  move on rather than forcing a bad split.
- **`yarn test` must stay green** on every commit. Currently 99/99.
- **Lint baseline**: don't regress. Some pre-existing errors (`FC<{}>`,
  `IMessageEvent | undefined` redundant union in the local sandbox where
  the renderer SDK isn't installed) are out of scope here.

## Where everything lives

- Architecture doc: `docs/ARCHITECTURE.md`
- Test runner config: `vitest.config.mts` (separate from `vite.config.mjs`)
- Test setup: `tests/setup.ts`
- React Query adapter: `src/api/nitro-query/createNitroQuery.ts`
- Zustand factory: `src/state/createNitroStore.ts`
- Error boundary: `src/common/error-boundary/WidgetErrorBoundary.tsx`
- Event hooks (`useNitroEvent`, `useMessageEvent`, `useNitroEventState`,
  `useMessageEventState`): `src/hooks/events/`
- Wired-tools split (types/constants/helpers + 3 tab views):
  `src/components/wired-tools/`
