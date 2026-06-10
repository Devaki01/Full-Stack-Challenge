// Express server for the SIT Full Stack Challenge.
//
// Exposes:
//   POST /api/graph   — the spec endpoint
//   POST /bfhl        — alias (same handler), per the Bajaj-style route name
//   GET  /            — health check / sanity message
//
// CORS is enabled for all origins because the evaluator calls from a
// different origin (Evaluation Notes in the spec).

const express = require('express');
const cors = require('cors');
const { processGraph } = require('./graph-logic');

// ---- Identity fields -------------------------------------------------------
// REQUIRED: replace these with your real credentials before deploying.
// user_id format: lowercased full name (no spaces) + "_" + date as yyyymmdd
// (matching the PDF examples, e.g. "johndoe_19990917").
const IDENTITY = {
  user_id: 'devakijoshi_20050526',
  email_id: 'devaki.joshi.btech2023@sitpune.edu.in',
  enrollment_number: '23070122083',
};
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());                 // allow all origins
app.use(express.json());         // parse application/json bodies

function handleGraph(req, res) {
  try {
    const body = req.body || {};
    const edges = body.edges;

    if (!Array.isArray(edges)) {
      return res.status(400).json({
        error: 'Request body must contain an "edges" array.',
      });
    }

    const result = processGraph(edges);

    return res.status(200).json({
      user_id: IDENTITY.user_id,
      email_id: IDENTITY.email_id,
      enrollment_number: IDENTITY.enrollment_number,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// Routes
app.post('/api/graph', handleGraph);
app.post('/bfhl', handleGraph);

// Optional GET on /bfhl returning operation code 200 (common convention).
app.get('/bfhl', (_req, res) => res.status(200).json({ operation_code: 1 }));

// Health check
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SIT Graph API. POST edges to /api/graph or /bfhl.',
  });
});

const PORT = process.env.PORT || 3000;

// Only start listening when run directly (not when imported for tests).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
