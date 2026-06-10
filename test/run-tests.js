// Lightweight test runner — no external test framework needed.
// Run with: npm test
const { processGraph } = require('../api/graph-logic');

let passed = 0, failed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  PASS:', label); }
  else { failed++; console.log('  FAIL:', label); console.log('    expected', e); console.log('    actual  ', a); }
}

// 1. Spec example summary
const ex = processGraph([
  'A->B','A->C','B->D','C->E','E->F',
  'X->Y','Y->Z','Z->X',
  'P->Q','Q->R',
  'G->H','G->H','G->I',
  'hello','1->2','A->'
]);
eq(ex.summary, { total_trees: 3, total_cycles: 1, largest_tree_root: 'A' }, 'spec example summary');
eq(ex.invalid_entries, ['hello','1->2','A->'], 'spec invalid entries');
eq(ex.duplicate_edges, ['G->H'], 'spec duplicate edges');

// 2. Whitespace trim → duplicate
const ws = processGraph([' A->B ', 'A->B']);
eq(ws.duplicate_edges, ['A->B'], 'whitespace trimmed then dedup');

// 3. Self-loop invalid
eq(processGraph(['A->A']).invalid_entries, ['A->A'], 'self loop invalid');

// 4. Pure cycle root = lex smallest
const pc = processGraph(['Y->X','X->Y']);
eq(pc.hierarchies[0].root, 'X', 'pure cycle lex-smallest root');
eq(pc.hierarchies[0].has_cycle, true, 'pure cycle has_cycle true');

// 5. Depth tie → lex smaller root
eq(processGraph(['B->C','A->D']).summary.largest_tree_root, 'A', 'depth tie lex root');

// 6. Diamond: first parent wins, no duplicate reported
const dia = processGraph(['A->D','B->D']);
eq(dia.duplicate_edges, [], 'diamond produces no duplicate');

// 7. cyclic hierarchy has no depth field
const cy = processGraph(['X->Y','Y->Z','Z->X']);
eq('depth' in cy.hierarchies[0], false, 'cyclic group omits depth');

// 8. non-cyclic omits has_cycle
const nc = processGraph(['A->B']);
eq('has_cycle' in nc.hierarchies[0], false, 'tree omits has_cycle');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
