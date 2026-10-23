#!/usr/bin/env node
/**
 * run-tests.mjs — 公开仓工具链自测（不依赖任何私有内容）
 *
 * 覆盖：frontmatter 键解析、快照导出器的边界行为、快照不含正文。
 * 这些测试只跑在合成的迷你快照上，绝不接触真实内容。
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const TOOLS = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools')

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`)
  }
}

console.log('工具链自测\n')

const tmp = mkdtempSync(join(tmpdir(), 'toolchain-test-'))
const src = join(tmp, 'src')
mkdirSync(join(src, '区域A', '角色_001', '00-介绍'), { recursive: true })
mkdirSync(join(src, 'data'), { recursive: true })
writeFileSync(
  join(src, '区域A', '角色_001', '00-介绍', '0.1-前言.md'),
  '---\ntitle: x\nplaceholder_skeleton: true\n---\n# 前言\n正文占位\n'
)
writeFileSync(join(src, 'data', 'character-a.json'), JSON.stringify({ id: '001', name: '角色' }))

// ── 用例 1：导出器在合成内容上产出结构签名 ──────────────────────────
const out = join(tmp, 'snap')
const r = spawnSync(process.execPath, [join(TOOLS, 'snapshot-content.mjs'), '--src', src, '--out', out], {
  encoding: 'utf8',
})
check('导出器退出码 0', r.status === 0, r.stderr)

const tree = JSON.parse(readFileSync(join(out, 'tree.json'), 'utf8'))
check('导出 1 个 md 条目', tree.fileCount === 1, `实际 ${tree.fileCount}`)
check('frontmatter 键被解析', tree.files[0].fmKeys.includes('title'), JSON.stringify(tree.files[0].fmKeys))

const summary = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'))
check('data JSON 计数正确', summary.dataJson === 1, `实际 ${summary.dataJson}`)

// ── 用例 2：快照不含正文 ────────────────────────────────────────────
const treeRaw = readFileSync(join(out, 'tree.json'), 'utf8')
check('tree.json 不含正文文本', !treeRaw.includes('正文占位'), '发现正文泄漏')

rmSync(tmp, { recursive: true, force: true })

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)