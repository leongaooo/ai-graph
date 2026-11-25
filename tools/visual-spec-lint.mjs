import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const rules = [
  'idUnique',
  'edgeEndpoints',
  'supportedEvidence',
  'inferredReason',
  'unknownNotSolid',
  'visibleRefs',
  'metricUnitsSources',
  'focusClaim',
  'acceptanceVisibleRefs',
  'sourceSha256',
  'grammarSupported',
  'stateLayoutRefs'
];

const hash = value => createHash('sha256').update(value).digest('hex');
const stateElementId = ref => `state-${String(ref).replace(/^st-/, '')}`;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const asArray = value => Array.isArray(value) ? value : [];
const sourceRefsOf = item => {
  if (Array.isArray(item?.sourceRefs)) return item.sourceRefs;
  if (typeof item?.sourceRef === 'string') return [item.sourceRef];
  return [];
};

function createReport(specPath, options = {}) {
  const errors = [];
  const checks = Object.fromEntries(rules.map(rule => [rule, true]));
  const fail = (rule, path, message) => {
    checks[rule] = false;
    errors.push({ rule, path, message });
  };

  let spec;
  if (options.spec && isObject(options.spec)) {
    spec = options.spec;
  } else {
    try {
      spec = JSON.parse(readFileSync(specPath, 'utf8'));
    } catch (error) {
      fail('idUnique', '$', `无法读取或解析 spec：${error.message}`);
      return { ok: false, spec: specPath, checks, errors };
    }
  }

  const source = isObject(spec.source) ? spec.source : {};
  let sourceText = '';
  let sourceLines = [];
  let actualSourceHash = null;
  const sourceLinesByEvidence = options.sourceLinesByEvidence ?? null;
  let sourceReport = null;
  if (sourceLinesByEvidence) {
    sourceReport = [];
    for (const [index, item] of asArray(options.sources).entries()) {
      const text = typeof item?.text === 'string' ? item.text : '';
      const lines = typeof item?.text === 'string' ? item.text.split(/\r?\n/u) : asArray(item?.lines);
      const actual = hash(text);
      if (actual !== item?.expectedSha256) {
        fail('sourceSha256', `sources[${index}].sha256`, `源文件 sha256 不一致，spec=${item?.expectedSha256 ?? '(missing)'}，actual=${actual}`);
      }
      sourceReport.push({ uri: item?.uri, expectedSha256: item?.expectedSha256, actualSha256: actual, lines: lines.length });
    }
  } else {
    try {
      sourceText = readFileSync(resolve(source.path), 'utf8');
      sourceLines = sourceText.split(/\r?\n/u);
      actualSourceHash = hash(sourceText);
      if (actualSourceHash !== source.sha256) {
        fail('sourceSha256', 'source.sha256', `源文件 sha256 不一致，spec=${source.sha256 ?? '(missing)'}，actual=${actualSourceHash}`);
      }
    } catch (error) {
      fail('sourceSha256', 'source.path', `无法读取源文件：${error.message}`);
    }
  }

  const evidenceById = new Map();
  const semanticById = new Map();
  const allIds = new Map();
  const registerIds = (items, collection, target) => {
    for (const [index, item] of asArray(items).entries()) {
      const path = `${collection}[${index}]`;
      if (!isObject(item) || typeof item.id !== 'string' || item.id.length === 0) {
        fail('idUnique', `${path}.id`, 'id 必须是非空字符串');
        continue;
      }
      if (allIds.has(item.id)) {
        fail('idUnique', `${path}.id`, `ID 与 ${allIds.get(item.id)} 重复：${item.id}`);
      } else {
        allIds.set(item.id, path);
      }
      target.set(item.id, item);
    }
  };

  registerIds(spec.evidence, 'evidence', evidenceById);
  registerIds(spec.entities, 'entities', semanticById);
  registerIds(spec.relations, 'relations', semanticById);
  registerIds(spec.claims, 'claims', semanticById);
  registerIds(spec.unknowns, 'unknowns', semanticById);
  registerIds(spec.inferences, 'inferences', semanticById);
  registerIds(spec.metrics, 'metrics', semanticById);
  registerIds(spec.levels, 'levels', new Map());
  registerIds(spec.acceptance, 'acceptance', new Map());
  const viewElements = new Map();
  registerIds(spec.view?.elements, 'view.elements', viewElements);

  for (const [id, evidence] of evidenceById) {
    const path = `evidence.${id}`;
    const lines = sourceLinesByEvidence?.get(id) ?? sourceLines;
    if (!Number.isInteger(evidence.lineStart) || !Number.isInteger(evidence.lineEnd) || evidence.lineStart < 1 || evidence.lineEnd < evidence.lineStart) {
      fail('supportedEvidence', path, 'lineStart/lineEnd 必须是有效的正整数范围');
      continue;
    }
    if (!lines.length || evidence.lineEnd > lines.length) {
      fail('supportedEvidence', path, `行号超出源文件范围：${evidence.lineStart}-${evidence.lineEnd}`);
      continue;
    }
    const excerpt = lines.slice(evidence.lineStart - 1, evidence.lineEnd).join('\n');
    const actualTextHash = hash(excerpt);
    if (actualTextHash !== evidence.textHash) {
      fail('supportedEvidence', path, `证据 textHash 不一致，spec=${evidence.textHash ?? '(missing)'}，actual=${actualTextHash}`);
    }
  }

  const checkSourceRefs = (item, path, required) => {
    const refs = sourceRefsOf(item);
    if (required && refs.length === 0) {
      fail('supportedEvidence', path, 'supported 项必须有 sourceRef/sourceRefs');
    }
    for (const ref of refs) {
      if (!evidenceById.has(ref)) fail('supportedEvidence', path, `sourceRef 不存在：${ref}`);
    }
  };

  const supportedCollections = [
    ['entities', spec.entities],
    ['relations', spec.relations],
    ['claims', spec.claims],
    ['metrics', spec.metrics]
  ];
  for (const [collection, items] of supportedCollections) {
    for (const [index, item] of asArray(items).entries()) {
      const status = collection === 'metrics' ? 'supported' : item?.status;
      if (status === 'supported') checkSourceRefs(item, `${collection}[${index}]`, true);
      if (status === 'inferred' && typeof item?.reason !== 'string' || status === 'inferred' && item.reason.trim() === '') {
        fail('inferredReason', `${collection}[${index}].reason`, 'inferred 项必须有 reason');
      }
      if (status === 'unknown' && item?.lineStyle === 'solid') {
        fail('unknownNotSolid', `${collection}[${index}].lineStyle`, 'unknown 项不能使用 solid');
      }
    }
  }
  for (const [collection, items] of [['unknowns', spec.unknowns], ['inferences', spec.inferences]]) {
    for (const [index, item] of asArray(items).entries()) {
      const status = collection === 'unknowns' ? 'unknown' : 'inferred';
      if (status === 'inferred' && (typeof item?.reason !== 'string' || item.reason.trim() === '')) {
        fail('inferredReason', `${collection}[${index}].reason`, 'inferred 项必须有 reason');
      }
      if (status === 'unknown' && item?.lineStyle === 'solid') {
        fail('unknownNotSolid', `${collection}[${index}].lineStyle`, 'unknown 项不能使用 solid');
      }
      checkSourceRefs(item, `${collection}[${index}]`, false);
    }
  }

  const entityIds = new Set(asArray(spec.entities).map(item => item?.id));
  for (const [index, relation] of asArray(spec.relations).entries()) {
    if (!entityIds.has(relation?.from)) fail('edgeEndpoints', `relations[${index}].from`, `边起点不存在：${relation?.from}`);
    if (!entityIds.has(relation?.to)) fail('edgeEndpoints', `relations[${index}].to`, `边终点不存在：${relation?.to}`);
  }

  const grammar = spec.view?.grammar;
  if (!['sequence', 'state', 'timeline'].includes(grammar)) {
    fail('grammarSupported', 'view.grammar', `不支持的图法：${grammar ?? '(missing)'}；当前只支持 sequence / state / timeline`);
  }

  if (grammar === 'state') {
    const lanes = asArray(spec.view?.lanes);
    if (lanes.length === 0) fail('stateLayoutRefs', 'view.lanes', 'state 图法必须提供 lanes');
    for (const [index, lane] of lanes.entries()) {
      if (!semanticById.has(lane?.ref)) fail('stateLayoutRefs', `view.lanes[${index}].ref`, `lane ref 不存在：${lane?.ref}`);
      if (!Array.isArray(lane?.states) || lane.states.length === 0) {
        fail('stateLayoutRefs', `view.lanes[${index}].states`, 'lane 必须提供非空 states');
      } else {
        for (const [stateIndex, state] of lane.states.entries()) {
          if (!semanticById.has(state?.ref)) fail('stateLayoutRefs', `view.lanes[${index}].states[${stateIndex}].ref`, `state ref 不存在：${state?.ref}`);
        }
      }
    }

    const steps = asArray(spec.view?.loop?.steps);
    if (steps.length === 0) fail('stateLayoutRefs', 'view.loop.steps', 'state 图法必须提供非空 loop.steps');
    for (const [index, step] of steps.entries()) {
      if (!semanticById.has(step?.ref)) fail('stateLayoutRefs', `view.loop.steps[${index}].ref`, `loop step ref 不存在：${step?.ref}`);
    }

    if (spec.view?.loop?.feedback) {
      const feedback = spec.view.loop.feedback;
      const stepIds = new Set(steps.map(item => item?.id));
      if (!stepIds.has(feedback.from)) fail('stateLayoutRefs', 'view.loop.feedback.from', `feedback 起点不存在：${feedback.from}`);
      if (!stepIds.has(feedback.to)) fail('stateLayoutRefs', 'view.loop.feedback.to', `feedback 终点不存在：${feedback.to}`);
      if (!semanticById.has(feedback.ref)) fail('stateLayoutRefs', 'view.loop.feedback.ref', `feedback ref 不存在：${feedback.ref}`);
    }

    for (const [index, note] of asArray(spec.view?.notes).entries()) {
      if (!semanticById.has(note?.ref)) fail('stateLayoutRefs', `view.notes[${index}].ref`, `note ref 不存在：${note?.ref}`);
    }
    if (spec.view?.edge?.ref && !semanticById.has(spec.view.edge.ref)) {
      fail('stateLayoutRefs', 'view.edge.ref', `edge ref 不存在：${spec.view.edge.ref}`);
    }
  }

  if (grammar === 'timeline') {
    const events = asArray(spec.view?.events);
    if (events.length < 2) fail('timelineLayoutRefs', 'view.events', 'timeline 图法必须提供至少两个事件');
    for (const [index, event] of events.entries()) {
      if (!semanticById.has(event?.ref)) fail('timelineLayoutRefs', `view.events[${index}].ref`, `事件 ref 不存在：${event?.ref}`);
      if (typeof event?.time !== 'string' || event.time.trim() === '') fail('timelineLayoutRefs', `view.events[${index}].time`, '事件必须有真实时间戳');
      if (typeof event?.label !== 'string' || event.label.trim() === '') fail('timelineLayoutRefs', `view.events[${index}].label`, '事件必须有标签');
    }
    if (typeof spec.view?.axisTitle !== 'string' || spec.view.axisTitle.trim() === '') fail('timelineLayoutRefs', 'view.axisTitle', 'timeline 必须提供 axisTitle');
  }

  for (const [index, metric] of asArray(spec.metrics).entries()) {
    if (typeof metric?.unit !== 'string' || metric.unit.trim() === '') fail('metricUnitsSources', `metrics[${index}].unit`, 'metric 必须有 unit');
    if (sourceRefsOf(metric).length === 0) fail('metricUnitsSources', `metrics[${index}].sourceRefs`, 'metric 必须有 sourceRef/sourceRefs');
    for (const ref of sourceRefsOf(metric)) {
      if (!evidenceById.has(ref)) fail('metricUnitsSources', `metrics[${index}].sourceRefs`, `metric sourceRef 不存在：${ref}`);
    }
  }

  const relationIds = new Set(asArray(spec.relations).map(item => item?.id));
  const claimIds = new Set(asArray(spec.claims).map(item => item?.id));
  if (!claimIds.has(spec.view?.focus)) fail('focusClaim', 'view.focus', `focus 必须指向已有 claim：${spec.view?.focus}`);

  const viewElementIds = new Set(asArray(spec.view?.elements).map(item => item?.id));
  for (const [index, element] of asArray(spec.view?.elements).entries()) {
    if (!semanticById.has(element?.ref)) fail('visibleRefs', `view.elements[${index}].ref`, `可见元素 ref 不存在：${element?.ref}`);
    const referenced = semanticById.get(element?.ref);
    if (referenced && element.status && referenced.status && element.status !== referenced.status) {
      fail('visibleRefs', `view.elements[${index}].status`, `可见元素状态与 ref 不一致：${element.id}`);
    }
    if (element?.status === 'unknown' && element?.lineStyle === 'solid') {
      fail('unknownNotSolid', `view.elements[${index}].lineStyle`, 'unknown 可见元素不能使用 solid');
    }
  }

  if (grammar === 'state') {
    const requireElement = (id, path) => {
      if (!viewElementIds.has(id)) fail('stateLayoutRefs', path, `view.elements 缺少可见元素：${id}`);
    };
    for (const [index, lane] of asArray(spec.view?.lanes).entries()) {
      requireElement(lane?.id, `view.lanes[${index}].id`);
      for (const [stateIndex, state] of asArray(lane?.states).entries()) {
        requireElement(stateElementId(state?.ref), `view.lanes[${index}].states[${stateIndex}].ref`);
      }
    }
    for (const [index, step] of asArray(spec.view?.loop?.steps).entries()) {
      requireElement(step?.id, `view.loop.steps[${index}].id`);
    }
    if (spec.view?.edge) requireElement(spec.view.edge.id, 'view.edge.id');
    for (const [index, note] of asArray(spec.view?.notes).entries()) {
      requireElement(note?.id, `view.notes[${index}].id`);
    }
  }

  if (grammar === 'timeline') {
    const requireElement = (id, path) => {
      if (!viewElementIds.has(id)) fail('timelineLayoutRefs', path, `view.elements 缺少可见元素：${id}`);
    };
    for (const [index, event] of asArray(spec.view?.events).entries()) {
      requireElement(event?.id, `view.events[${index}].id`);
    }
    for (const [index, note] of asArray(spec.view?.notes).entries()) {
      requireElement(note?.id, `view.notes[${index}].id`);
    }
  }

  for (const [index, acceptance] of asArray(spec.acceptance).entries()) {
    if (!Array.isArray(acceptance?.visibleRefs)) {
      fail('acceptanceVisibleRefs', `acceptance[${index}].visibleRefs`, 'acceptance 必须有 visibleRefs 数组');
      continue;
    }
    for (const ref of acceptance.visibleRefs) {
      if (!viewElementIds.has(ref)) fail('acceptanceVisibleRefs', `acceptance[${index}].visibleRefs`, `visibleRef 不存在：${ref}`);
    }
  }

  return {
    ok: errors.length === 0,
    spec: specPath,
    source: sourceReport ? { sources: sourceReport } : { path: source.path, expectedSha256: source.sha256, actualSha256: actualSourceHash },
    checks,
    errors,
    summary: {
      evidence: evidenceById.size,
      entities: entityIds.size,
      relations: relationIds.size,
      claims: claimIds.size,
      metrics: asArray(spec.metrics).length,
      acceptance: asArray(spec.acceptance).length
    }
  };
}

export function lintVisualSpec(specPath) {
  return createReport(resolve(specPath));
}

export function lintVisualSpecObject(spec, options = {}) {
  return createReport(options.specPath ?? '(object)', { ...options, spec });
}

const input = process.argv[2];
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (input) {
    const report = lintVisualSpec(input);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } else {
    console.error('Usage: node tools/visual-spec-lint.mjs <art/*.visual.json>');
    process.exitCode = 2;
  }
}
