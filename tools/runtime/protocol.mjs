import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROTOCOL_VERSION = '0.2';
export const PROTOCOL_ID = `ai-graph/visual-spec@${PROTOCOL_VERSION}`;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const asArray = value => (Array.isArray(value) ? value : []);
const asString = value => (typeof value === 'string' ? value : '');

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function isEnvelope(input) {
  return isObject(input) && Array.isArray(input.sources) && isObject(input.semantic);
}

function uriToPath(uri, baseDir) {
  const raw = asString(uri);
  if (!raw) return '';
  if (raw.startsWith('file://')) return fileURLToPath(raw);
  if (isAbsolute(raw) || !baseDir) return raw;
  return resolve(baseDir, raw);
}

function normalizeLocator(locator, index) {
  return {
    id: asString(locator?.id) || `e-${index + 1}`,
    lineStart: Number(locator?.lineStart),
    lineEnd: Number(locator?.lineEnd),
    textHash: asString(locator?.textHash),
    excerpt: asString(locator?.excerpt)
  };
}

function normalizeIntent(intent, input) {
  if (isObject(intent)) {
    return {
      text: asString(intent.text) || asString(intent.summary),
      question: asString(intent.question) || asString(input.question),
      audience: asString(intent.audience),
      constraints: asArray(intent.constraints),
      mainConclusion: intent.mainConclusion ?? input.mainConclusion ?? null
    };
  }
  return {
    text: asString(intent) || asString(input.intent),
    question: asString(input.question),
    audience: '',
    constraints: [],
    mainConclusion: input.mainConclusion ?? null
  };
}

function fromLegacy(input, options = {}) {
  const baseDir = options.baseDir || '';
  const source = isObject(input.source) ? input.source : {};
  const evidence = asArray(input.evidence).map(normalizeLocator);
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    id: asString(input.id),
    seed: input.seed,
    intent: normalizeIntent(input.intent, input),
    sources: [
      {
        id: 'source-main',
        uri: uriToPath(source.path ?? source.uri, baseDir),
        title: asString(source.title),
        date: asString(source.date),
        sha256: asString(source.sha256),
        locators: evidence
      }
    ],
    semantic: {
      entities: asArray(input.entities),
      relations: asArray(input.relations),
      claims: asArray(input.claims),
      metrics: asArray(input.metrics),
      unknowns: asArray(input.unknowns),
      inferences: asArray(input.inferences),
      levels: asArray(input.levels)
    },
    view: isObject(input.view) ? input.view : {},
    acceptance: asArray(input.acceptance),
    copy: isObject(input.copy) ? input.copy : {}
  };
}

function fromEnvelope(input, options = {}) {
  const baseDir = options.baseDir || '';
  const source = asArray(input.sources)[0] ?? {};
  const intent = normalizeIntent(input.intent, input);
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    id: asString(input.id),
    seed: input.seed,
    intent,
    sources: [
      {
        id: asString(source.id) || 'source-main',
        uri: uriToPath(source.uri ?? source.path, baseDir),
        title: asString(source.title),
        date: asString(source.date),
        sha256: asString(source.sha256),
        locators: asArray(source.locators).map(normalizeLocator)
      }
    ],
    semantic: {
      entities: asArray(input.semantic?.entities),
      relations: asArray(input.semantic?.relations),
      claims: asArray(input.semantic?.claims),
      metrics: asArray(input.semantic?.metrics),
      unknowns: asArray(input.semantic?.unknowns),
      inferences: asArray(input.semantic?.inferences),
      levels: asArray(input.semantic?.levels)
    },
    view: isObject(input.view) ? input.view : {},
    acceptance: asArray(input.acceptance),
    copy: isObject(input.copy) ? input.copy : {}
  };
}

function envelopeErrors(envelope) {
  const errors = [];
  const fail = (path, message) => errors.push({ rule: 'protocol', path, message });
  if (!envelope.id) fail('id', 'id 必须是非空字符串');
  if (!Array.isArray(envelope.sources) || envelope.sources.length === 0) {
    fail('sources', 'sources 必须是非空数组');
  } else {
    const source = envelope.sources[0];
    if (!source.uri) fail('sources[0].uri', 'source.uri 必须是非空字符串');
    if (!Array.isArray(source.locators)) fail('sources[0].locators', 'source.locators 必须是数组');
  }
  if (!isObject(envelope.semantic)) {
    fail('semantic', 'semantic 必须是对象');
  } else {
    for (const key of ['entities', 'relations', 'claims', 'metrics', 'unknowns', 'inferences']) {
      if (!Array.isArray(envelope.semantic[key])) fail(`semantic.${key}`, `${key} 必须是数组`);
    }
  }
  if (!isObject(envelope.view)) fail('view', 'view 必须是对象');
  return errors;
}

export function normalizeSpec(input, options = {}) {
  if (!isObject(input)) {
    return {
      ok: false,
      errors: [{ rule: 'protocol', path: '$', message: 'spec 必须是 JSON 对象' }],
      warnings: [],
      envelope: null,
      legacy: null
    };
  }
  const warnings = [];
  const envelope = isEnvelope(input) ? fromEnvelope(input, options) : fromLegacy(input, options);
  if (!isEnvelope(input)) warnings.push({ code: 'legacy-flat-spec', message: '已把扁平 v0.1 spec 归一化为 v0.2 envelope；建议后续使用 sources/semantic/view/intent 四区块。' });
  const errors = envelopeErrors(envelope);
  return { ok: errors.length === 0, errors, warnings, envelope, legacy: toLegacy(envelope) };
}

export function toLegacy(envelope) {
  const source = envelope.sources[0] ?? {};
  const main = envelope.intent?.mainConclusion ?? null;
  return {
    version: 1,
    id: envelope.id,
    seed: envelope.seed,
    intent: envelope.intent?.text ?? '',
    source: {
      path: source.uri ?? '',
      title: source.title ?? '',
      date: source.date ?? '',
      sha256: source.sha256 ?? ''
    },
    question: envelope.intent?.question ?? '',
    mainConclusion: main,
    evidence: source.locators ?? [],
    entities: envelope.semantic?.entities ?? [],
    relations: envelope.semantic?.relations ?? [],
    levels: envelope.semantic?.levels ?? [],
    claims: envelope.semantic?.claims ?? [],
    unknowns: envelope.semantic?.unknowns ?? [],
    inferences: envelope.semantic?.inferences ?? [],
    metrics: envelope.semantic?.metrics ?? [],
    acceptance: envelope.acceptance ?? [],
    view: envelope.view ?? {},
    copy: envelope.copy ?? {}
  };
}

export function sourceOf(envelope) {
  return envelope?.sources?.[0] ?? null;
}

export function evidenceOf(envelope) {
  return sourceOf(envelope)?.locators ?? [];
}
