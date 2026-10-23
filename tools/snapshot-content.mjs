#!/usr/bin/env node
/**
 * snapshot-content.mjs — 从私有内容仓导出「结构签名快照」
 *
 * 用途：为公开工具链仓提供门禁所需的**结构**输入，不含任何游戏正文。
 * 为什么不是全文镜像：本仓内容正文 93,586 个 md、原神单仓 1.53 GiB，
 * 全文镜像既超 GitHub 体积建议，也构成向公众再分发游戏文本（NOTICE.md 已声明
 * 权利归 HoYoverse）。而门禁实际校验的是 frontmatter 结构、字段完整性、
 * 文件路径与翻译键，这些都能从 data/ 与路径导出。
 *
 * 输出（全部为结构，无正文）：
 *   snapshot/data/*.json           —— data/ 原样复制（728KB，本身即结构化数据）
 *   snapshot/tree.json             —— 每个 md 的路径 + frontmatter 键集合 + 字符数
 *   snapshot/translations.json     —— 翻译键清单（不含译文本体）
 *
 * 显式排除：正文内容、图片、archive/、node_modules/、.git/
 *
 * 用法：
 *   node tools/snapshot-content.mjs --src <私有仓根> --out <公开仓>/snapshot
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { resolve, join, relative, dirname } from 'node:path'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const SRC = resolve(arg('src', '.'))
const OUT = resolve(arg('out', 'snapshot'))

// 内容目录（各仓区域名不同，故由扫描决定：含「NN 编号角色站」的顶层目录）
const SKIP_DIRS = new Set(['node_modules', '.git', 'archive', 'core', 'docs', 'scripts', 'snapshot'])
// 备份/临时目录：不是内容的一部分，导出会让门禁把它们误判为角色站。
// 前缀匹配覆盖 .backup / .tmp / .reports 与 backup_20260826_235942 这类带时间戳的目录。
const SKIP_PREFIX = /^(\.backup|\.tmp|\.reports|backup_|_archive)/i

/** 解析 YAML frontmatter 的键名（不解析值——值可能含正文） */
function frontmatterKeys(text) {
  if (!text.startsWith('---')) return []
  const end = text.indexOf('\n---', 3)
  if (end < 0) return []
  const block = text.slice(3, end)
  return block
    .split('\n')
    .map((l) => l.match(/^([A-Za-z_][\w-]*)\s*:/))
    .filter(Boolean)
    .map((m) => m[1])
}

function walk(dir, acc) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || SKIP_PREFIX.test(e.name)) continue
      walk(p, acc)
    } else if (e.isFile() && e.name.endsWith('.md')) {
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.size > 512 * 1024) continue // 超大文件跳过（多为报告/日志）
      let keys = []
      try {
        keys = frontmatterKeys(readFileSync(p, 'utf8').slice(0, 4096))
      } catch {
        keys = []
      }
      acc.push({
        path: relative(SRC, p).split('\\').join('/'),
        bytes: st.size,
        fmKeys: keys.sort(),
      })
    }
  }
  return acc
}

mkdirSync(OUT, { recursive: true })

// 1. data/ 原样复制（结构化数据，非正文）
const srcData = join(SRC, 'data')
const outData = join(OUT, 'data')
let dataCount = 0
if (existsSync(srcData)) {
  mkdirSync(outData, { recursive: true })
  for (const f of readdirSync(srcData)) {
    if (!f.endsWith('.json')) continue
    writeFileSync(join(outData, f), readFileSync(join(srcData, f)))
    dataCount++
  }
}

// 2. 路径 + frontmatter 键集合 + 字节数（无正文）
// 紧凑序列化：tree.json 是纯结构清单，缩进换行会让原神单仓膨胀到 15MB，压成一行后约 6MB。
const tree = walk(SRC, [])
writeFileSync(
  join(OUT, 'tree.json'),
  JSON.stringify({ fileCount: tree.length, files: tree })
)

// 3. 统计摘要
const withFm = tree.filter((t) => t.fmKeys.length > 0).length
const keyFreq = {}
for (const t of tree) for (const k of t.fmKeys) keyFreq[k] = (keyFreq[k] || 0) + 1

writeFileSync(
  join(OUT, 'summary.json'),
  JSON.stringify(
    {
      mdFiles: tree.length,
      withFrontmatter: withFm,
      dataJson: dataCount,
      frontmatterKeyFrequency: Object.entries(keyFreq).sort((a, b) => b[1] - a[1]),
    },
    null,
    2
  )
)

console.log(`✓ 快照导出完成 → ${OUT}`)
console.log(`  md 文件结构: ${tree.length}（含 frontmatter ${withFm}）`)
console.log(`  data JSON:   ${dataCount}`)
console.log(`  注意: 快照不含任何正文，仅路径/frontmatter 键/字节数`)