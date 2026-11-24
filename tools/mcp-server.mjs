import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { compileSpec } from './runtime/compile.mjs';
import { querySpec } from './runtime/query.mjs';
import { validateSpec } from './runtime/validate.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const SERVER_INFO = { name: 'ai-graph-visual-runtime', version: pkg.version ?? '0.1.0' };
const PROTOCOL_VERSION = '2024-11-05';

const tools = [
  {
    name: 'visual_validate',
    description: '校验 VisualSpec：检查来源哈希、证据行号、状态线型、可见引用和布局引用。返回结构化诊断；失败时给出 path / ref / rule / repairHint，AI 据此修正 spec。',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        spec: { type: 'object', description: 'VisualSpec v0.2 envelope 或兼容的扁平 v0.1 spec。' },
        specPath: { type: 'string', description: 'spec 文件路径；与 spec 二选一。' },
        sourceText: { type: 'string', description: '来源全文；不传则读取 sources[0].uri。' },
        baseDir: { type: 'string', description: '解析相对路径的基准目录。' }
      }
    }
  },
  {
    name: 'visual_compile',
    description: '把通过校验的 VisualSpec 编译成 SceneArtifact、桌面/移动 SVG、evidence index 和 semantic report。同 spec、同 source hash、同 profile 生成相同 artifact hash。',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        spec: { type: 'object', description: 'VisualSpec v0.2 envelope 或兼容的扁平 v0.1 spec。' },
        specPath: { type: 'string', description: 'spec 文件路径；与 spec 二选一。' },
        sourceText: { type: 'string', description: '来源全文；不传则读取 sources[0].uri。' },
        baseDir: { type: 'string', description: '解析相对路径的基准目录。' },
        outDir: { type: 'string', description: '产物目录，默认 out。' },
        profile: { type: 'string', enum: ['both', 'desktop', 'mobile'], description: '输出 profile，默认 both。' }
      }
    }
  },
  {
    name: 'visual_query',
    description: '查询已编译的场景或 VisualSpec：主路径、unknown/inferred 边、节点证据、上下游可达、文字越界、可见元素、文本搜索、验收问题。超出表达能力时返回 unanswerable 与原因。',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        spec: { type: 'object', description: 'VisualSpec v0.2 envelope 或兼容的扁平 v0.1 spec。' },
        specPath: { type: 'string', description: 'spec 文件路径；与 spec 二选一。' },
        scene: { type: 'object', description: '已编译的 scene.json 对象。' },
        scenePath: { type: 'string', description: '已编译的 scene.json 路径。' },
        query: {
          type: 'object',
          description: '结构化查询。',
          properties: {
            type: { type: 'string', enum: ['main_path', 'unknown_edges', 'node_evidence', 'reachable', 'overflow', 'element', 'search', 'acceptance'], description: '查询类型。' },
            ref: { type: 'string', description: 'node_evidence 的语义 ref。' },
            from: { type: 'string', description: 'reachable 的起点 ref。' },
            direction: { type: 'string', enum: ['downstream', 'upstream'], description: 'reachable 的方向。' },
            depth: { type: 'number', description: 'reachable 的最大深度，默认 3。' },
            id: { type: 'string', description: 'element / acceptance 的 id。' },
            text: { type: 'string', description: 'search 的文本。' }
          },
          required: ['type']
        }
      },
      required: ['query']
    }
  }
];

function textResult(result) {
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
    isError: result?.ok === false
  };
}

function callTool(name, args = {}) {
  if (name === 'visual_validate') return textResult(validateSpec(args));
  if (name === 'visual_compile') return textResult(compileSpec(args));
  if (name === 'visual_query') return textResult(querySpec(args));
  return textResult({ ok: false, errors: [{ rule: 'protocol', path: 'tools/call', message: `未知工具：${name}` }] });
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function respondError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

function handle(request) {
  const id = request.id;
  const method = request.method;
  if (!method) {
    if (id !== undefined) respondError(id, -32600, 'Invalid Request');
    return;
  }
  if (method === 'initialize') {
    respond(id, {
      protocolVersion: request.params?.protocolVersion || PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
      instructions: '先 visual_validate，再 visual_compile，最后用 visual_query 查询 scene。所有失败都返回结构化诊断，不要猜测事实；没有来源的内容标 unknown 或 inferred。'
    });
    return;
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'ping') {
    respond(id, {});
    return;
  }
  if (method === 'tools/list') {
    respond(id, { tools });
    return;
  }
  if (method === 'tools/call') {
    const name = request.params?.name;
    const args = request.params?.arguments ?? {};
    try {
      respond(id, callTool(name, args));
    } catch (error) {
      respond(id, textResult({ ok: false, errors: [{ rule: 'protocol', path: '$', message: error.message }] }));
    }
    return;
  }
  if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.error('ai-graph visual runtime MCP server (stdio)\n\n用法：node tools/mcp-server.mjs\n说明：通过 stdin/stdout 交换 JSON-RPC；不要在本进程 stdout 打印日志。');
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (error) {
    process.stderr.write(`invalid json: ${error.message}\n`);
    respondError(null, -32700, 'Parse error');
    return;
  }
  if (Array.isArray(request)) {
    for (const item of request) handle(item);
    return;
  }
  handle(request);
});
