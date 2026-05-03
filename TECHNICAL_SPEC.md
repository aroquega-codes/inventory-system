# Tambo Frontend — Technical Specification

## Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| UI library | React 18 | Component model maps naturally to the modal-heavy CRUD screens; `useState`/`useEffect` replace the imperative DOM manipulation and mutable globals in the legacy file |
| Build tool | Vite 5 | Native ESM dev server with sub-100 ms HMR; zero-config JSX transform; optimised production build with automatic code splitting and asset hashing |
| Routing | React Router v6 | Declarative URL-based routing replaces the `showPage()` CSS-toggle pattern; gives each section a real URL so browser back/forward and bookmarks work correctly |
| HTTP client | Fetch (native) | Keeps the dependency footprint minimal; async/await API matches existing code; thin wrapper handles error normalisation in one place |
| Styling | Plain CSS (global) | The design system is already expressed as CSS custom properties; no CSS-in-JS or utility framework is warranted at this scale |

---

## Project layout

```
frontend/
├── index.html              ← Vite HTML entry
├── package.json
├── vite.config.js          ← proxy /api → backend :8000
└── src/
    ├── main.jsx            ← ReactDOM.createRoot + BrowserRouter
    ├── App.jsx             ← persistent layout (Sidebar + Routes)
    ├── index.css           ← design-system variables + all component styles
    ├── utils.jsx           ← critBadge, stockDot, fmtDate, currency helpers
    ├── api/
    │   └── client.js       ← thin fetch wrapper: get / post / put / patch / delete
    ├── components/
    │   ├── Sidebar.jsx     ← NavLink-based navigation (active state via router)
    │   └── Modal.jsx       ← overlay with Escape key + backdrop-click dismiss
    └── pages/
        ├── Dashboard.jsx
        ├── Items.jsx
        ├── Movements.jsx
        ├── Alerts.jsx
        └── Setup.jsx       ← tabbed: Categories / Suppliers / Locations
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

## Backend integration

**Development** — Vite dev server at `:5173` proxies `/api/*` → FastAPI at `:8000`. No CORS configuration needed on the frontend side; HMR works on source changes.

**Production** — `npm run build` writes to `frontend/dist/`. FastAPI mounts `/assets` as a `StaticFiles` directory and returns `index.html` for all other non-API paths, satisfying client-side navigation.

---

## State management

No global store. Each page component owns its data with `useState` + `useEffect`. Modal state (open/closed, record under edit) is co-located in the page that owns it. Data refetch after mutation keeps state consistent without a cache layer. This is sufficient because there is no shared mutable state across pages.

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
