import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { enrichScene } from './artifacts.mjs';
import { normalizeSpec } from './protocol.mjs';

const asArray = value => (Array.isArray(value) ? value : []);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function loadSpec(input) {
  if (input?.spec && typeof input.spec === 'object') {
    const specPath = input.specPath ? resolve(input.specPath) : null;
    return {
      raw: input.spec,
      specPath,
      baseDir: input.baseDir ? resolve(input.baseDir) : specPath ? dirname(specPath) : process.cwd()
    };
  }
  if (typeof input?.specPath === 'string' && input.specPath.length > 0) {
    const specPath = resolve(input.specPath);
    return {
      raw: JSON.parse(readFileSync(specPath, 'utf8')),
      specPath,
      baseDir: input.baseDir ? resolve(input.baseDir) : dirname(specPath)
    };
  }
  throw new Error('visual_query 需要 spec 对象或 specPath');
}

function loadScene(input) {
  if (isObject(input?.scene)) return input.scene;
  if (typeof input?.scenePath === 'string' && input.scenePath.length > 0) {
    return JSON.parse(readFileSync(resolve(input.scenePath), 'utf8'));
  }
  return null;
}

function semanticObjects(legacy) {
  return [
    ...asArray(legacy.entities),
    ...asArray(legacy.relations),
    ...asArray(legacy.claims),
    ...asArray(legacy.metrics),
    ...asArray(legacy.unknowns),
    ...asArray(legacy.inferences)
  ];
}

function objectById(legacy) {
  return new Map(semanticObjects(legacy).map(item => [item.id, item]));
}

function evidenceById(legacy) {
  return new Map(asArray(legacy.evidence).map(item => [item.id, item]));
}

function evidenceFor(legacy, refs) {
  const evidence = evidenceById(legacy);
  return asArray(refs)
    .map(ref => evidence.get(ref))
    .filter(Boolean)
    .map(item => ({ id: item.id, lineStart: item.lineStart, lineEnd: item.lineEnd, excerpt: item.excerpt }));
}

function elementsFor(scene, refs) {
  return asArray(scene?.elements).filter(element => asArray(refs).includes(element.ref) || asArray(refs).includes(element.id) || asArray(refs).includes(element.viewElementId));
}

function graphOf(legacy) {
  const entities = new Map(asArray(legacy.entities).map(item => [item.id, item]));
  const outgoing = new Map();
  const incoming = new Map();
  for (const relation of asArray(legacy.relations)) {
    if (!outgoing.has(relation.from)) outgoing.set(relation.from, []);
    if (!incoming.has(relation.to)) incoming.set(relation.to, []);
    outgoing.get(relation.from).push(relation);
    incoming.get(relation.to).push(relation);
  }
  return { entities, outgoing, incoming };
}

function longestPath(legacy) {
  const { entities, outgoing } = graphOf(legacy);
  let best = [];
  const visited = new Set();
  const walk = (node, path) => {
    if (path.length > best.length) best = path.slice();
    for (const relation of outgoing.get(node) ?? []) {
      if (visited.has(relation.to)) continue;
      visited.add(relation.to);
      path.push({ node: relation.to, relation });
      walk(relation.to, path);
      path.pop();
      visited.delete(relation.to);
    }
  };
  for (const entity of entities.values()) {
    visited.clear();
    visited.add(entity.id);
    walk(entity.id, [{ node: entity.id, relation: null }]);
  }
  return best;
}

function mainPath(legacy) {
  const objects = objectById(legacy);
  const order = asArray(legacy.view?.order);
  if (order.length > 0) {
    const edges = [];
    for (let index = 0; index < order.length - 1; index++) {
      const from = order[index];
      const to = order[index + 1];
      const relation = asArray(legacy.relations).find(item => item.from === from && item.to === to);
      edges.push(relation
        ? { id: relation.id, from, to, type: relation.type, status: relation.status ?? 'supported', sourceRefs: relation.sourceRefs ?? [] }
        : { id: null, from, to, type: 'order', status: 'inferred', sourceRefs: [] });
    }
    return {
      kind: 'sequence-view-order',
      nodes: order.map((id, index) => ({ id, label: objects.get(id)?.label ?? id, order: index + 1 })),
      edges
    };
  }
  if (legacy.view?.grammar === 'state' && asArray(legacy.view?.loop?.steps).length > 0) {
    const steps = asArray(legacy.view.loop.steps);
    return {
      kind: 'state-loop',
      nodes: steps.map((step, index) => ({ id: step.id, ref: step.ref, label: step.label, order: index + 1 })),
      edges: steps.slice(1).map((step, index) => ({ from: steps[index].id, to: step.id, ref: step.ref })),
      feedback: legacy.view.loop.feedback ?? null
    };
  }
  const path = longestPath(legacy);
  return {
    kind: 'sequence-longest-path',
    nodes: path.map((step, index) => ({
      id: step.node,
      label: objects.get(step.node)?.label ?? step.node,
      order: index + 1
    })),
    edges: path.filter(step => step.relation).map(step => ({
      id: step.relation.id,
      from: step.relation.from,
      to: step.relation.to,
      type: step.relation.type,
      status: step.relation.status ?? 'supported',
      sourceRefs: step.relation.sourceRefs ?? []
    }))
  };
}

function unknownEdges(legacy, scene) {
  const relations = asArray(legacy.relations).filter(item => item.status === 'unknown' || item.status === 'inferred');
  const unknowns = asArray(legacy.unknowns);
  const inferences = asArray(legacy.inferences);
  return {
    relations: relations.map(item => ({ ...item, evidence: evidenceFor(legacy, item.sourceRefs), elements: elementsFor(scene, [item.id]) })),
    unknowns: unknowns.map(item => ({ ...item, evidence: evidenceFor(legacy, item.sourceRefs), elements: elementsFor(scene, [item.id]) })),
    inferences: inferences.map(item => ({ ...item, evidence: evidenceFor(legacy, item.sourceRefs), elements: elementsFor(scene, [item.id]) }))
  };
}

function nodeEvidence(legacy, scene, ref) {
  const object = objectById(legacy).get(ref);
  if (!object) return { unanswerable: true, reason: `语义对象不存在：${ref}` };
  const evidence = evidenceFor(legacy, object.sourceRefs);
  return {
    ref,
    object,
    evidence,
    elements: elementsFor(scene, [ref]),
    status: object.status ?? 'supported',
    ...(evidence.length === 0 ? { unanswerable: true, reason: `该对象没有来源定位：${ref}` } : {})
  };
}

function reachable(legacy, scene, from, direction = 'downstream', depth = 3) {
  const { outgoing, incoming } = graphOf(legacy);
  const queue = [{ id: from, level: 0 }];
  const seen = new Set([from]);
  const nodes = [];
  const edges = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.level >= depth) continue;
    const relations = direction === 'upstream' ? incoming.get(current.id) ?? [] : outgoing.get(current.id) ?? [];
    for (const relation of relations) {
      const next = direction === 'upstream' ? relation.from : relation.to;
      edges.push({ id: relation.id, from: relation.from, to: relation.to, type: relation.type, status: relation.status ?? 'supported' });
      if (seen.has(next)) continue;
      seen.add(next);
      nodes.push({ id: next, level: current.level + 1 });
      queue.push({ id: next, level: current.level + 1 });
    }
  }
  return {
    from,
    direction,
    depth,
    nodes: nodes.map(item => ({ ...item, label: objectById(legacy).get(item.id)?.label ?? item.id, elements: elementsFor(scene, [item.id]) })),
    edges
  };
}

function search(legacy, scene, text) {
  const needle = String(text ?? '').toLowerCase();
  if (!needle) return { unanswerable: true, reason: 'search.text 不能为空' };
  const objects = semanticObjects(legacy).filter(item => {
    const haystack = [item.id, item.label, item.text, item.title, item.type, item.question, item.answer].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(needle);
  });
  return {
    query: text,
    objects: objects.map(item => ({ ...item, evidence: evidenceFor(legacy, item.sourceRefs) })),
    elements: elementsFor(scene, objects.map(item => item.id))
  };
}

function acceptance(legacy, scene, id) {
  const items = asArray(legacy.acceptance);
  const item = id ? items.find(entry => entry.id === id) : items[0];
  if (!item) return { unanswerable: true, reason: `acceptance 不存在：${id ?? '(first)'}` };
  return {
    id: item.id,
    question: item.question,
    answer: item.answer,
    answerRefs: item.answerRefs ?? [],
    visibleRefs: item.visibleRefs ?? [],
    elements: elementsFor(scene, item.visibleRefs ?? [])
  };
}

export function querySpec(input = {}) {
  let loaded;
  try {
    loaded = loadSpec(input);
  } catch (error) {
    return { ok: false, errors: [{ rule: 'protocol', path: '$', message: error.message }] };
  }
  const normalized = normalizeSpec(loaded.raw, { baseDir: loaded.baseDir });
  if (!normalized.ok) return { ok: false, errors: normalized.errors, warnings: normalized.warnings };
  const legacy = normalized.legacy;
  const scene = enrichScene(legacy, loadScene(input));
  const query = isObject(input.query) ? input.query : { type: 'main_path' };
  const type = query.type ?? 'main_path';
  let answer;
  switch (type) {
    case 'main_path':
      answer = mainPath(legacy);
      break;
    case 'unknown_edges':
      answer = unknownEdges(legacy, scene);
      break;
    case 'node_evidence':
      answer = nodeEvidence(legacy, scene, query.ref);
      break;
    case 'reachable':
      answer = reachable(legacy, scene, query.from, query.direction, query.depth ?? 3);
      break;
    case 'overflow':
      answer = { textOverflow: scene?.metrics?.textOverflow ?? [], count: scene?.metrics?.textOverflow?.length ?? 0 };
      break;
    case 'element':
      answer = asArray(scene?.elements).find(item => item.id === query.id) ?? { unanswerable: true, reason: `可见元素不存在：${query.id}` };
      break;
    case 'search':
      answer = search(legacy, scene, query.text);
      break;
    case 'acceptance':
      answer = acceptance(legacy, scene, query.id);
      break;
    default:
      answer = { unanswerable: true, reason: `不支持的 query.type：${type}；支持 main_path / unknown_edges / node_evidence / reachable / overflow / element / search / acceptance` };
  }
  return {
    ok: true,
    specId: normalized.envelope.id,
    grammar: normalized.envelope.view?.grammar,
    query,
    answer,
    scene: scene ? { id: scene.id, canvas: scene.canvas, elementCount: scene.elements?.length ?? 0, metrics: scene.metrics } : null,
    warnings: normalized.warnings
  };
}
