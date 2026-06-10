const express = require('express');
const cors = require('cors');
const { processGraph } = require('./graph-logic');

const IDENTITY = {
  user_id: 'devakijoshi_20050526',
  email_id: 'devaki.joshi.btech2023@sitpune.edu.in',
  enrollment_number: '23070122083',
};

const app = express();

app.use(cors());
app.use(express.json());

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

app.post('/api/graph', handleGraph);
app.post('/bfhl', handleGraph);

app.get('/bfhl', (_req, res) => res.status(200).json({ operation_code: 1 }));

app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SIT Graph API. POST edges to /api/graph or /bfhl.',
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;