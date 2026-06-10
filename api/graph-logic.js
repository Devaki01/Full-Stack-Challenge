const VALID_EDGE = /^[A-Z]->[A-Z]$/;

function classifyEdges(edges) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seen = new Set();
  const dupAdded = new Set();
  const validEdges = [];

  for (const rawInput of edges) {
    const entry = typeof rawInput === 'string' ? rawInput.trim() : '';

    if (!VALID_EDGE.test(entry)) {
      invalidEntries.push(rawInput);
      continue;
    }

    const [parent, child] = entry.split('->');

    if (parent === child) {
      invalidEntries.push(rawInput);
      continue;
    }

    const key = `${parent}->${child}`;
    if (seen.has(key)) {
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

function buildAdjacency(validEdges) {
  const children = new Map();
  const parentOf = new Map();
  const nodes = new Set();

  for (const { parent, child } of validEdges) {
    nodes.add(parent);
    nodes.add(child);

    if (parentOf.has(child)) {
      continue;
    }
    parentOf.set(child, parent);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
  }

  return { children, parentOf, nodes };
}

function connectedComponents(nodes, parentOf) {
  const uf = new Map();
  const find = (x) => {
    if (!uf.has(x)) uf.set(x, x);
    let root = x;
    while (uf.get(root) !== root) root = uf.get(root);

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

  const groups = new Map();
  for (const n of nodes) {
    const r = find(n);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  }
  return [...groups.values()];
}

function findRoot(groupNodes, parentOf) {
  const roots = groupNodes
    .filter((n) => !parentOf.has(n))
    .sort();
  if (roots.length > 0) return roots[0];
  return [...groupNodes].sort()[0];
}

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

function buildTree(root, children) {
  let maxDepth = 0;

  const build = (node, depth, ancestors) => {
    maxDepth = Math.max(maxDepth, depth);
    const obj = {};
    for (const child of children.get(node) || []) {
      if (ancestors.has(child)) continue;
      ancestors.add(child);
      obj[child] = build(child, depth + 1, ancestors);
      ancestors.delete(child);
    }
    return obj;
  };

  const tree = { [root]: build(root, 1, new Set([root])) };
  return { tree, depth: maxDepth };
}

function processGraph(edges) {
  if (!Array.isArray(edges)) {
    throw new Error('edges must be an array');
  }

  const { validEdges, invalidEntries, duplicateEdges } = classifyEdges(edges);
  const { children, parentOf, nodes } = buildAdjacency(validEdges);

  const groups = connectedComponents(nodes, parentOf);

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestRoot = null;
  let largestDepth = -1;

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