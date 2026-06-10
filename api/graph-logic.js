// Core graph processing logic for the SIT Full Stack Challenge.
// Pure functions, no framework dependencies — kept separate so it is easy to test
// and reuse from both the /api/graph and /bfhl routes.

const VALID_EDGE = /^[A-Z]->[A-Z]$/;

/**
 * Validate and split incoming edges into:
 *  - validEdges: [{ parent, child, raw }]  (first-occurrence only)
 *  - invalidEntries: raw strings that failed validation
 *  - duplicateEdges: raw "P->C" strings, one entry per repeated pair
 */
function classifyEdges(edges) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seen = new Set();          // parent->child pairs already accepted
  const dupAdded = new Set();      // pairs already pushed to duplicateEdges
  const validEdges = [];

  for (const rawInput of edges) {
    // Spec rule 2: "  A->B  " — trim whitespace first, then validate.
    const entry = typeof rawInput === 'string' ? rawInput.trim() : '';

    if (!VALID_EDGE.test(entry)) {
      // Push the ORIGINAL untrimmed value to invalid_entries to mirror the
      // input the caller actually sent. The spec examples show the raw token.
      invalidEntries.push(rawInput);
      continue;
    }

    const [parent, child] = entry.split('->');

    // Self-loop A->A is invalid (rule 2).
    if (parent === child) {
      invalidEntries.push(rawInput);
      continue;
    }

    const key = `${parent}->${child}`;
    if (seen.has(key)) {
      // Duplicate: push once regardless of how many times it repeats (rule 3).
      if (!dupAdded.has(key)) {
        duplicateEdges.push(key);
        dupAdded.add(key);
      }
      continue;
    }

    seen.add(key);
    validEdges.push({ parent, child, raw: key });
  }

  return { validEdges, invalidEntries, duplicateEdges };
}

/**
 * Build adjacency from valid edges, honouring the diamond rule:
 * first-encountered parent wins; later parent edges for the same child
 * are silently discarded (rule 4).
 */
function buildAdjacency(validEdges) {
  const children = new Map();   // parent -> [child, ...] (insertion order)
  const parentOf = new Map();   // child -> parent (first one wins)
  const nodes = new Set();

  for (const { parent, child } of validEdges) {
    nodes.add(parent);
    nodes.add(child);

    if (parentOf.has(child)) {
      // Child already has a parent — discard this edge silently.
      continue;
    }
    parentOf.set(child, parent);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
  }

  return { children, parentOf, nodes };
}

/**
 * Group nodes into connected components using union-find over the
 * accepted (post-diamond-resolution) edges.
 */
function connectedComponents(nodes, parentOf) {
  const uf = new Map();
  const find = (x) => {
    if (!uf.has(x)) uf.set(x, x);
    let root = x;
    while (uf.get(root) !== root) root = uf.get(root);
    // path compression
    let cur = x;
    while (uf.get(cur) !== root) {
      const next = uf.get(cur);
      uf.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a, b) => { uf.set(find(a), find(b)); };

  for (const n of nodes) find(n);
  for (const [child, parent] of parentOf.entries()) union(child, parent);

  const groups = new Map(); // root -> [nodes]
  for (const n of nodes) {
    const r = find(n);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  }
  return [...groups.values()];
}

/**
 * Determine the root of a group.
 *  - A root never appears as a child (in the accepted edges).
 *  - Pure cycle (every node is a child): lexicographically smallest node.
 */
function findRoot(groupNodes, parentOf) {
  const roots = groupNodes
    .filter((n) => !parentOf.has(n))
    .sort();
  if (roots.length > 0) return roots[0];
  return [...groupNodes].sort()[0]; // pure cycle fallback
}

/**
 * Detect whether a group contains a cycle, reachable from the chosen root,
 * via DFS with a recursion stack.
 */
function hasCycle(root, children) {
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  let cyclic = false;

  const dfs = (node) => {
    color.set(node, GREY);
    for (const nxt of children.get(node) || []) {
      const c = color.get(nxt) || WHITE;
      if (c === GREY) { cyclic = true; return; }
      if (c === WHITE) { dfs(nxt); if (cyclic) return; }
    }
    color.set(node, BLACK);
  };

  dfs(root);
  return cyclic;
}

/**
 * Build the nested tree object and compute depth (node count on the longest
 * root-to-leaf path). Uses a visited guard so a stray back-reference can't
 * loop forever (cyclic groups are handled before this is ever called).
 */
function buildTree(root, children) {
  let maxDepth = 0;

  const build = (node, depth, ancestors) => {
    maxDepth = Math.max(maxDepth, depth);
    const obj = {};
    for (const child of children.get(node) || []) {
      if (ancestors.has(child)) continue; // safety guard
      ancestors.add(child);
      obj[child] = build(child, depth + 1, ancestors);
      ancestors.delete(child);
    }
    return obj;
  };

  const tree = { [root]: build(root, 1, new Set([root])) };
  return { tree, depth: maxDepth };
}

/**
 * Top-level: take the raw edges array, return everything the response needs
 * (minus the identity fields).
 */
function processGraph(edges) {
  if (!Array.isArray(edges)) {
    throw new Error('edges must be an array');
  }

  const { validEdges, invalidEntries, duplicateEdges } = classifyEdges(edges);
  const { children, parentOf, nodes } = buildAdjacency(validEdges);

  const groups = connectedComponents(nodes, parentOf);

  // Build hierarchy objects, sorted by root for deterministic output.
  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestRoot = null;
  let largestDepth = -1;

  // Sort groups by their root label for stable, predictable ordering.
  const groupsWithRoot = groups
    .map((g) => ({ nodes: g, root: findRoot(g, parentOf) }))
    .sort((a, b) => (a.root < b.root ? -1 : a.root > b.root ? 1 : 0));

  for (const { nodes: groupNodes, root } of groupsWithRoot) {
    if (hasCycle(root, children)) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
      totalCycles += 1;
      continue;
    }

    const { tree, depth } = buildTree(root, children);
    hierarchies.push({ root, tree, depth });
    totalTrees += 1;

    // largest_tree_root: greatest depth; tie -> lexicographically smaller root.
    if (depth > largestDepth || (depth === largestDepth && root < largestRoot)) {
      largestDepth = depth;
      largestRoot = root;
    }
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestRoot === null ? '' : largestRoot,
    },
  };
}

module.exports = { processGraph, classifyEdges, buildAdjacency };
