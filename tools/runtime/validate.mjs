import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { lintVisualSpec, lintVisualSpecObject } from '../visual-spec-lint.mjs';
import { normalizeSpec, sha256, sourceOf, sourcesOf } from './protocol.mjs';

const repairHints = {
  protocol: '检查 id、sources、semantic、view 四区块的必填字段。',
  idUnique: '合并或重命名重复 id；每个 evidence / entity / relation / claim / unknown / inference / metric / view element 的 id 必须唯一。',
  edgeEndpoints: 'relation 的 from / to 必须指向已有 entity id。',
  supportedEvidence: '用文章行号重新取 textHash，或把没有来源的内容改为 inferred / unknown。',
  inferredReason: '为 inferred 项补 reason，说明它是从哪些事实推出来的。',
  unknownNotSolid: '把 unknown 的 lineStyle 改为 dashed；unknown 不能画成实线事实。',
  visibleRefs: 'view.elements[].ref 必须指向已有语义对象，且 status 与引用对象一致。',
  metricUnitsSources: '给 metric 补 unit 和 sourceRefs；没有来源的数字不要当事实。',
  focusClaim: 'view.focus 必须指向已有 claim id。',
  acceptanceVisibleRefs: 'acceptance.visibleRefs 必须指向已有 view element id。',
  sourceSha256: '源文件已变化；重新计算整篇 sha256 并更新 spec，或恢复原来源。',
  grammarSupported: 'view.grammar 只能是 sequence / state；新增语法先扩协议与布局器。',
  stateLayoutRefs: 'state 的 lane / state / loop step / feedback / edge / note 必须存在，且全部进入 view.elements。'
};

function parsePathIndex(path, collection) {
  const match = new RegExp(`^${collection}\\[(\\d+)\\]`, 'u').exec(path ?? '');
  return match ? Number(match[1]) : null;
}

function stateElementId(ref) {
  return `state-${String(ref ?? '').replace(/^st-/, '')}`;
}

function refForPath(path, legacy) {
  if (!path) return undefined;
  if (path.startsWith('evidence.')) return path.slice('evidence.'.length);
  for (const collection of ['entities', 'relations', 'claims', 'metrics', 'unknowns', 'inferences', 'acceptance', 'view.elements']) {
    const index = parsePathIndex(path, collection);
    if (index === null) continue;
    const items = collection === 'view.elements' ? legacy.view?.elements : legacy[collection];
    return items?.[index]?.id;
  }
  const laneMatch = /^view\.lanes\[(\d+)\](?:\.states\[(\d+)\])?/u.exec(path);
  if (laneMatch) {
    const lane = legacy.view?.lanes?.[Number(laneMatch[1])];
    if (laneMatch[2] !== undefined) return stateElementId(lane?.states?.[Number(laneMatch[2])]?.ref);
    return lane?.id;
  }
  const stepMatch = /^view\.loop\.steps\[(\d+)\]/u.exec(path);
  if (stepMatch) return legacy.view?.loop?.steps?.[Number(stepMatch[1])]?.id;
  if (path.startsWith('view.loop.feedback')) return legacy.view?.loop?.id;
  if (path.startsWith('view.edge')) return legacy.view?.edge?.id;
  const noteMatch = /^view\.notes\[(\d+)\]/u.exec(path);
  if (noteMatch) return legacy.view?.notes?.[Number(noteMatch[1])]?.id;
  if (path === 'view.focus') return legacy.view?.focus;
  return undefined;
}

function diagnosticOf(error, legacy) {
  return {
    severity: 'error',
    rule: error.rule,
    path: error.path,
    ref: refForPath(error.path, legacy),
    message: error.message,
    expected: repairHints[error.rule] ?? '修正该字段后重新校验。',
    actual: error.message,
    repairHint: repairHints[error.rule] ?? '修正该字段后重新校验。'
  };
}

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
  throw new Error('visual_validate 需要 spec 对象或 specPath');
}

export function validateSpec(input = {}) {
  const warnings = [];
  let loaded;
  try {
    loaded = loadSpec(input);
  } catch (error) {
    return {
      ok: false,
      protocolVersion: '0.2',
      errors: [{ rule: 'protocol', path: '$', message: error.message }],
      diagnostics: [{ rule: 'protocol', path: '$', message: error.message, repairHint: repairHints.protocol }],
      warnings
    };
  }

  const normalized = normalizeSpec(loaded.raw, { baseDir: loaded.baseDir });
  warnings.push(...normalized.warnings);
  if (!normalized.ok) {
    return {
      ok: false,
      protocolVersion: '0.2',
      specId: normalized.envelope?.id,
      errors: normalized.errors,
      diagnostics: normalized.errors.map(error => ({
        severity: 'error',
        ...error,
        expected: repairHints.protocol,
        actual: error.message,
        repairHint: repairHints.protocol
      })),
      warnings
    };
  }

  const sources = sourcesOf(normalized.envelope);
  const source = sourceOf(normalized.envelope);
  const legacy = normalized.legacy;

  if (sources.length > 1) {
    const sourceTexts = Array.isArray(input.sourceTexts) ? input.sourceTexts : [];
    const prepared = [];
    const sourceLinesByEvidence = new Map();
    for (const [index, item] of sources.entries()) {
      let text = typeof sourceTexts[index] === 'string' ? sourceTexts[index] : null;
      if (text === null) {
        try {
          text = readFileSync(resolve(item.uri), 'utf8');
        } catch (error) {
          return {
            ok: false,
            protocolVersion: '0.2',
            specId: normalized.envelope.id,
            source: { uri: item.uri, status: 'unreadable' },
            errors: [{ rule: 'sourceSha256', path: `sources[${index}].uri`, message: `无法读取来源：${error.message}` }],
            diagnostics: [{
              severity: 'error',
              rule: 'sourceSha256',
              path: `sources[${index}].uri`,
              ref: item.id,
              message: `无法读取来源：${error.message}`,
              expected: '提供 sourceTexts，或把 source.uri 指向可读文件',
              actual: error.message,
              repairHint: '提供 sourceTexts，或把 source.uri 指向可读文件'
            }],
            warnings
          };
        }
      }
      const lines = text.split(/\r?\n/u);
      const actual = sha256(text);
      if (!item.sha256) warnings.push({ code: 'source-sha256-filled', message: `sources[${index}] 未提供 sha256，已按文件计算；请写回 spec 以固定来源。` });
      for (const locator of item.locators ?? []) sourceLinesByEvidence.set(locator.id, lines);
      prepared.push({ uri: item.uri, title: item.title, expectedSha256: item.sha256 || actual, text });
    }
    const report = lintVisualSpecObject(legacy, { sources: prepared, sourceLinesByEvidence });
    const diagnostics = report.errors.map(error => diagnosticOf(error, legacy));
    return {
      ok: report.ok,
      protocolVersion: '0.2',
      specId: normalized.envelope.id,
      sources: report.source?.sources ?? [],
      checks: report.checks,
      summary: report.summary,
      errors: report.errors,
      diagnostics,
      warnings,
      normalizedSpec: normalized.envelope
    };
  }

  let sourceText = typeof input.sourceText === 'string' ? input.sourceText : null;
  if (sourceText === null) {
    try {
      sourceText = readFileSync(resolve(source.uri), 'utf8');
    } catch (error) {
      return {
        ok: false,
        protocolVersion: '0.2',
        specId: normalized.envelope.id,
        source: { uri: source.uri, status: 'unreadable' },
        errors: [{ rule: 'sourceSha256', path: 'sources[0].uri', message: `无法读取来源：${error.message}` }],
        diagnostics: [{
          severity: 'error',
          rule: 'sourceSha256',
          path: 'sources[0].uri',
          message: `无法读取来源：${error.message}`,
          expected: '提供 sourceText，或把 source.uri 指向可读文件',
          actual: error.message,
          repairHint: '提供 sourceText，或把 source.uri 指向可读文件'
        }],
        warnings
      };
    }
  }

  if (!legacy.source.sha256) {
    legacy.source.sha256 = sha256(sourceText);
    warnings.push({ code: 'source-sha256-filled', message: 'spec 未提供 source.sha256，已按 sourceText 计算；请写回 spec 以固定来源。' });
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'ai-graph-validate-'));
  const tempSourcePath = join(tempDir, 'source.txt');
  const tempSpecPath = join(tempDir, `${normalized.envelope.id}.visual.json`);
  writeFileSync(tempSourcePath, sourceText);
  legacy.source.path = tempSourcePath;
  writeFileSync(tempSpecPath, `${JSON.stringify(legacy, null, 2)}\n`);

  const report = lintVisualSpec(tempSpecPath);
  rmSync(tempDir, { recursive: true, force: true });
  const diagnostics = report.errors.map(error => diagnosticOf(error, legacy));
  return {
    ok: report.ok,
    protocolVersion: '0.2',
    specId: normalized.envelope.id,
    source: {
      uri: source.uri,
      title: source.title,
      expectedSha256: legacy.source.sha256,
      actualSha256: report.source?.actualSha256 ?? sha256(sourceText),
      status: report.ok ? 'valid' : 'invalid'
    },
    checks: report.checks,
    summary: report.summary,
    errors: report.errors,
    diagnostics,
    warnings,
    normalizedSpec: normalized.envelope
  };
}
