import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { build } from '../build-explainer.mjs';
import { enrichScene } from './artifacts.mjs';
import { normalizeSpec, sha256, sourceOf } from './protocol.mjs';

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
  throw new Error('visual_compile 需要 spec 对象或 specPath');
}

function semanticObjects(legacy) {
  return [
    ...(legacy.entities ?? []),
    ...(legacy.relations ?? []),
    ...(legacy.claims ?? []),
    ...(legacy.metrics ?? []),
    ...(legacy.unknowns ?? []),
    ...(legacy.inferences ?? [])
  ];
}

function makeEvidenceIndex(legacy, scene) {
  const byId = new Map(semanticObjects(legacy).map(item => [item.id, item]));
  const evidence = new Map((legacy.evidence ?? []).map(item => [item.id, item]));
  const entries = [];
  for (const element of scene.elements ?? []) {
    const object = byId.get(element.ref);
    const sourceRefs = Array.isArray(object?.sourceRefs) ? object.sourceRefs : [];
    const refs = sourceRefs
      .map(ref => evidence.get(ref))
      .filter(Boolean)
      .map(item => ({ id: item.id, lineStart: item.lineStart, lineEnd: item.lineEnd, excerpt: item.excerpt }));
    entries.push({
      elementId: element.id,
      ref: element.ref,
      kind: element.kind,
      status: element.status,
      lineStyle: element.lineStyle,
      bbox: element.bbox,
      evidence: refs
    });
  }
  return entries;
}

function sceneAt(outDir, sceneId, reportId = sceneId) {
  const scene = JSON.parse(readFileSync(join(outDir, `${sceneId}.scene.json`), 'utf8'));
  const report = JSON.parse(readFileSync(join(outDir, `${reportId}.semantic-report.json`), 'utf8'));
  return { scene, report };
}

export function compileSpec(input = {}) {
  const warnings = [];
  let loaded;
  try {
    loaded = loadSpec(input);
  } catch (error) {
    return { ok: false, protocolVersion: '0.2', errors: [{ rule: 'protocol', path: '$', message: error.message }], diagnostics: [{ rule: 'protocol', path: '$', message: error.message, repairHint: '提供 spec 或 specPath。' }] };
  }

  const normalized = normalizeSpec(loaded.raw, { baseDir: loaded.baseDir });
  warnings.push(...normalized.warnings);
  if (!normalized.ok) {
    return { ok: false, protocolVersion: '0.2', errors: normalized.errors, diagnostics: normalized.errors, warnings };
  }

  const source = sourceOf(normalized.envelope);
  const legacy = normalized.legacy;
  let sourceText = typeof input.sourceText === 'string' ? input.sourceText : null;
  if (sourceText === null) {
    try {
      sourceText = readFileSync(resolve(source.uri), 'utf8');
    } catch (error) {
      return {
        ok: false,
        protocolVersion: '0.2',
        specId: normalized.envelope.id,
        errors: [{ rule: 'sourceSha256', path: 'sources[0].uri', message: `无法读取来源：${error.message}` }],
        diagnostics: [{ rule: 'sourceSha256', path: 'sources[0].uri', message: `无法读取来源：${error.message}`, repairHint: '提供 sourceText，或把 source.uri 指向可读文件。' }]
      };
    }
  }
  if (!legacy.source.sha256) {
    legacy.source.sha256 = sha256(sourceText);
    warnings.push({ code: 'source-sha256-filled', message: 'spec 未提供 source.sha256，已按 sourceText 计算。' });
  }

  const outDir = resolve(input.outDir ?? 'out');
  const tempDir = mkdtempSync(join(tmpdir(), 'ai-graph-compile-'));
  const tempSourcePath = join(tempDir, 'source.txt');
  const tempSpecPath = join(tempDir, `${normalized.envelope.id}.visual.json`);
  writeFileSync(tempSourcePath, sourceText);
  legacy.source.path = tempSourcePath;
  writeFileSync(tempSpecPath, `${JSON.stringify(legacy, null, 2)}\n`);

  let buildResult;
  try {
    buildResult = build(tempSpecPath, outDir);
    rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    let report = null;
    try {
      report = JSON.parse(readFileSync(join(outDir, `${normalized.envelope.id}.semantic-report.json`), 'utf8'));
    } catch {
      // 报告可能还没写出；保留原始错误。
    }
    return {
      ok: false,
      protocolVersion: '0.2',
      specId: normalized.envelope.id,
      errors: [{ rule: 'compile', path: '$', message: error.message }],
      diagnostics: (report?.errors ?? []).map(item => ({
        severity: 'error',
        ...item,
        expected: '修正 spec 或选择另一个 profile。',
        actual: item.message,
        repairHint: '修正 spec 或选择另一个 profile。'
      })),
      semanticReport: report,
      warnings
    };
  }

  const desktop = sceneAt(outDir, normalized.envelope.id);
  const mobile = sceneAt(outDir, `${normalized.envelope.id}.mobile`, normalized.envelope.id);
  desktop.scene = enrichScene(legacy, desktop.scene);
  mobile.scene = enrichScene(legacy, mobile.scene);
  writeFileSync(join(outDir, `${normalized.envelope.id}.scene.json`), `${JSON.stringify(desktop.scene, null, 2)}\n`);
  writeFileSync(join(outDir, `${normalized.envelope.id}.mobile.scene.json`), `${JSON.stringify(mobile.scene, null, 2)}\n`);
  const profile = input.profile ?? 'both';
  const artifacts = {};
  if (profile === 'both' || profile === 'desktop') {
    artifacts.desktop = {
      svg: join(outDir, `${normalized.envelope.id}.svg`),
      scene: join(outDir, `${normalized.envelope.id}.scene.json`),
      report: join(outDir, `${normalized.envelope.id}.semantic-report.json`),
      hash: desktop.scene.svg?.sha1,
      elementCount: desktop.scene.elements?.length ?? 0,
      textOverflow: desktop.scene.metrics?.textOverflow?.length ?? 0,
      scene: desktop.scene
    };
  }
  if (profile === 'both' || profile === 'mobile') {
    artifacts.mobile = {
      svg: join(outDir, `${normalized.envelope.id}.mobile.svg`),
      scene: join(outDir, `${normalized.envelope.id}.mobile.scene.json`),
      report: join(outDir, `${normalized.envelope.id}.semantic-report.json`),
      hash: mobile.scene.svg?.sha1,
      elementCount: mobile.scene.elements?.length ?? 0,
      textOverflow: mobile.scene.metrics?.textOverflow?.length ?? 0,
      maxContentY: mobile.scene.metrics?.maxContentY,
      scene: mobile.scene
    };
  }

  return {
    ok: true,
    protocolVersion: '0.2',
    specId: normalized.envelope.id,
    grammar: normalized.envelope.view?.grammar,
    source: {
      uri: source.uri,
      expectedSha256: legacy.source.sha256,
      actualSha256: sha256(sourceText),
      status: 'valid'
    },
    outDir,
    artifacts,
    hashes: {
      desktop: desktop.scene.svg?.sha1,
      mobile: mobile.scene.svg?.sha1
    },
    evidenceIndex: {
      desktop: makeEvidenceIndex(legacy, desktop.scene),
      mobile: makeEvidenceIndex(legacy, mobile.scene)
    },
    semanticReport: desktop.report,
    warnings
  };
}
