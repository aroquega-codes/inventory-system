# Tambo Frontend — Technical Specification

## Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript 5 | Strict mode enabled; all source files are `.ts` / `.tsx`; domain types live in `src/types.ts` |
| UI library | React 18 | Component model maps naturally to the modal-heavy CRUD screens |
| Build tool | Vite 5 | Native ESM dev server with sub-100 ms HMR; zero-config TSX transform; optimised production build with automatic code splitting and asset hashing |
| Routing | React Router v6 | Declarative URL-based routing; each section has a real URL so browser back/forward and bookmarks work correctly |
| Data fetching | TanStack Query v5 | `useQuery` replaces all `useEffect` + manual state combos for loading/error/data; `useMutation` handles optimistic invalidation after writes; no `useEffect` is used anywhere for data fetching |
| HTTP client | Fetch (native) | Thin generic `api` wrapper (`api.get<T>`, `api.post<T>`, …) handles error normalisation; consumed by TanStack Query `queryFn`s |
| Component primitives | Base UI (`@base-ui/react`) | Unstyled, accessible headless components (Dialog, Select, etc.) that compose with the existing CSS design system; replaces hand-rolled primitives like the old `Modal` |
| Styling | Plain CSS (global) | The design system is already expressed as CSS custom properties; no CSS-in-JS or utility framework is warranted at this scale |

---

## Project layout

```
frontend/
├── index.html              ← Vite HTML entry
├── package.json
├── tsconfig.json           ← strict TS config (moduleResolution: bundler, noEmit)
├── vite.config.ts          ← proxy /api → backend :8000
└── src/
    ├── main.tsx            ← ReactDOM.createRoot + BrowserRouter + QueryClientProvider
    ├── App.tsx             ← persistent layout (Sidebar + Routes)
    ├── index.css           ← design-system variables + all component styles
    ├── types.ts            ← domain types: Item, Category, Supplier, Location, Movement, Alert, DashboardSummary
    ├── utils.tsx           ← CritBadge, StockDot, fmtDate, currency helpers (typed)
    ├── api/
    │   └── client.ts       ← generic fetch wrapper: get<T> / post<T> / put<T> / patch<T> / delete<T>
    ├── components/
    │   ├── Sidebar.tsx     ← NavLink-based navigation (active state via router)
    │   └── Modal.tsx       ← Base UI Dialog wrapper with Escape + backdrop dismiss
    └── pages/
        ├── Dashboard.tsx
        ├── Items.tsx
        ├── Movements.tsx
        ├── Alerts.tsx
        └── Setup.tsx       ← tabbed: Categories / Suppliers / Locations
```

---

## Routes

| URL | Page | Data loaded |
|-----|------|-------------|
| `/` | Dashboard | `GET /api/dashboard/summary` |
| `/items` | Items list + CRUD modals | `GET /api/items/`, `/api/categories/`, `/api/suppliers/` |
| `/movements` | Record movement + recent log | `GET /api/items/`, `/api/locations/`, `/api/movements/` |
| `/alerts` | Reorder alerts + status update | `GET /api/alerts/` |
| `/setup` | Categories / Suppliers / Locations tabs | `GET /api/categories/`, `/api/suppliers/`, `/api/locations/` |

All routes are rendered inside a persistent `Sidebar` + `main` shell. `BrowserRouter` manages history; FastAPI serves `frontend/dist/index.html` for every non-API path so deep links work after a production build.

---

## Data fetching conventions

- **No `useEffect`** — all side-effectful data loading goes through TanStack Query.
- `useQuery({ queryKey, queryFn })` for reads. The `queryKey` includes all filter/param values so re-fetches happen automatically when they change.
- `useMutation({ mutationFn, onSuccess })` for writes; `onSuccess` calls `queryClient.invalidateQueries` to keep the cache consistent without manual state updates.
- Loading and error states are derived from `isPending` / `isError` returned by the hooks, not from local `useState`.

---

## Backend integration

**Development** — Vite dev server at `:5173` proxies `/api/*` → FastAPI at `:8000`. No CORS configuration needed on the frontend side; HMR works on source changes.

**Production** — `npm run build` writes to `frontend/dist/`. FastAPI mounts `/assets` as a `StaticFiles` directory and returns `index.html` for all other non-API paths, satisfying client-side navigation.

---

## State management

No global store. Each page owns its server state via TanStack Query. UI-only state (open modal, selected tab, form values) stays in `useState` co-located in the component that owns it. Shared server cache is managed by the single `QueryClient` mounted at the root.

---

## Development workflow

```bash
# Terminal 1 — backend (port 8000)
uv run tambo

# Terminal 2 — frontend dev server with HMR (port 5173)
cd frontend && npm install && npm run dev

# Production build (output → frontend/dist, served by backend)
cd frontend && npm run build
```
