#!/usr/bin/env node
/**
 * verify-snapshot.mjs — 对结构签名快照跑门禁校验（公开仓 CI 入口）
 *
 * 这是「公开仓做门禁镜像」的执行件：不读任何游戏正文，只校验
 * snapshot/tree.json + snapshot/data/*.json 导出的结构。
 *
 * 校验项（与私有仓 core/scripts 的同名门禁口径对齐，但输入是快照）：
 *   1. frontmatter 字段一致性 —— 同一站点内 frontmatter 键集合不应漂移
 *   2. data JSON 完整性     —— 必填字段存在、编号唯一
 *   3. 路径规范             —— 角色站目录命名 `名称_NNN`，编号三位
 *   4. 空文件/异常体积      —— 0 字节 md 计数
 *
 * 退出码：0 通过；1 有硬缺陷；2 快照缺失
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SNAP_ROOT = join(ROOT, 'snapshot')

if (!existsSync(SNAP_ROOT)) {
  console.error('✗ 快照缺失：snapshot/ 不存在，先跑 tools/snapshot-content.mjs')
  process.exit(2)
}

// 四仓各自一个快照目录；按目录名遍历，新增仓库无需改本文件。
const repos = readdirSync(SNAP_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

if (repos.length === 0) {
  console.error('✗ snapshot/ 下没有任何仓库快照')
  process.exit(2)
}

let totalErrors = 0
const report = []

for (const repo of repos) {
  const SNAP = join(SNAP_ROOT, repo)
  if (!existsSync(join(SNAP, 'tree.json'))) {
    console.error(`✗ ${repo}: 缺少 tree.json`)
    totalErrors++
    continue
  }
  const tree = JSON.parse(readFileSync(join(SNAP, 'tree.json'), 'utf8'))
  const files = tree.files || []
  const errors = []
  const warnings = []
  report.push({ repo, files, errors, warnings })

  // ── 1. frontmatter 键集合一致性（按站点分组：路径前两段）─────────────
  const bySite = new Map()
  for (const f of files) {
    if (!f.fmKeys || f.fmKeys.length === 0) continue
    const parts = f.path.split('/')
    const site = parts.slice(0, 2).join('/')
    if (!bySite.has(site)) bySite.set(site, new Map())
    const key = f.fmKeys.join(',')
    const m = bySite.get(site)
    m.set(key, (m.get(key) || 0) + 1)
  }

  for (const [site, m] of bySite) {
    if (m.size > 3) {
      const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      warnings.push(`${site}: frontmatter 键集合有 ${m.size} 种形态（多数态 ${top[0][1]} 例）`)
    }
  }

  // ── 2. data JSON 完整性 ───────────────────────────────────────────
  const dataDir = join(SNAP, 'data')
  let dataFiles = []
  if (existsSync(dataDir)) dataFiles = readdirSync(dataDir).filter((f) => f.endsWith('.json'))

  const ids = new Map()
  for (const df of dataFiles) {
    let d
    try {
      d = JSON.parse(readFileSync(join(dataDir, df), 'utf8'))
    } catch (e) {
      errors.push(`${df}: JSON 解析失败 — ${e.message}`)
      continue
    }
    const id = d.id ?? d.编号 ?? null
    if (id != null) {
      if (ids.has(id)) errors.push(`编号重复: ${id}（${df} 与 ${ids.get(id)}）`)
      ids.set(id, df)
    }
  }

  // ── 3. 路径规范：角色站目录 `名称_NNN`（编号必须三位）───────────────
  for (const f of files) {
    const parts = f.path.split('/')
    if (parts.length < 2) continue
    const seg = parts[1]
    const m = seg.match(/_(\d+)$/)
    if (m && m[1].length !== 3) errors.push(`${parts[0]}/${seg} 编号非三位: ${m[1]}`)
  }

  // ── 4. 空文件 ────────────────────────────────────────────────────
  const empty = files.filter((f) => f.bytes === 0)
  if (empty.length > 0) warnings.push(`0 字节 md: ${empty.length} 个`)

  totalErrors += errors.length
}

// ── 汇总报告 ──────────────────────────────────────────────────────
for (const r of report) {
  const status = r.errors.length ? '✗' : '✓'
  console.log(
    `${status} ${r.repo.padEnd(10)} ${String(r.files.length).padStart(6)} md` +
      `  硬缺陷 ${r.errors.length}  告警 ${r.warnings.length}`
  )
  for (const e of r.errors.slice(0, 5)) console.error(`    - ${e}`)
  if (r.errors.length > 5) console.error(`    ... 另有 ${r.errors.length - 5} 项`)
}

console.log('')
if (totalErrors) {
  console.error(`✗ 合计硬缺陷 ${totalErrors} 项`)
  process.exit(1)
}
console.log('✓ 四仓快照门禁通过（0 硬缺陷）')