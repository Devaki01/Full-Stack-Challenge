# SIT Full Stack Engineering Challenge — Graph Insights API

A REST API that accepts directed edges, builds hierarchical trees, detects cycles,
and returns structured insights — plus a single-page frontend to interact with it.

## Endpoints

| Method | Path         | Description                          |
|--------|--------------|--------------------------------------|
| POST   | `/api/graph` | Spec endpoint. Processes `edges`.    |
| POST   | `/bfhl`      | Alias of `/api/graph` (same handler).|
| GET    | `/`          | Health check.                        |

CORS is enabled for all origins (the evaluator calls from a different origin).

### Request

```json
POST /api/graph
Content-Type: application/json

{ "edges": ["A->B", "A->C", "B->D"] }
```

### Response (shape)

```json
{
  "user_id": "...",
  "email_id": "...",
  "enrollment_number": "...",
  "hierarchies": [ { "root": "A", "tree": { "A": { "B": {} } }, "depth": 2 } ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": { "total_trees": 1, "total_cycles": 0, "largest_tree_root": "A" }
}
```

## Before you deploy — set your identity

Edit `api/server.js` and replace the `IDENTITY` object with your real values:

```js
const IDENTITY = {
  user_id: 'yourname_yyyymmdd',     // lowercased name + date, e.g. johndoe_19990917
  email_id: 'you@university.edu',
  enrollment_number: 'YOUR_ENROLLMENT',
};
```

## Run locally

```bash
npm install
npm start        # serves on http://localhost:3000
npm test         # runs the spec test suite
```

Open `public/index.html` — by default it calls a same-origin `/api/graph`.
If you host the frontend separately, set `API_BASE` near the top of the
`<script>` in `public/index.html` to your backend URL, e.g.
`https://your-api.onrender.com`.

## Deploy

### Option A — Render / Railway (single service, recommended)
- Build command: `npm install`
- Start command: `npm start`
- The Express server serves the API. Host the frontend either on the same
  service (add a static route) or on Netlify/Vercel pointing `API_BASE` at this URL.

### Option B — Vercel (API + frontend together)
- `vercel.json` is included. `vercel --prod` deploys both the Node API and
  the static frontend. The frontend calls same-origin `/api/graph`, so leave
  `API_BASE = ""`.

### Frontend-only on Netlify
- Drag-drop the `public/` folder, then set `API_BASE` in `index.html` to your
  deployed backend URL.

## Processing rules implemented
- Valid edge: `X->Y`, single uppercase letters, no self-loops.
- Whitespace trimmed before validation.
- Duplicates: first occurrence builds the tree; later ones reported once.
- Diamond / multi-parent: first-encountered parent wins; later discarded.
- Cycles: `has_cycle: true`, `tree: {}`, no `depth`.
- Depth: node count on the longest root-to-leaf path.
- `largest_tree_root` ties broken by lexicographically smaller root.
```
