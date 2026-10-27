# genshin-family-toolchain

结构签名门禁工具链。为四个角色文本归档站（原神 / 星穹铁道 / 鸣潮 / 绝区零）提供
**不接触游戏正文**的门禁校验，因此可以公开托管、使用公开仓的免费 Actions 额度。

[![Snapshot Gates](https://github.com/ReSerendipity/Website-Site-Toolchain/actions/workflows/gates.yml/badge.svg)](https://github.com/ReSerendipity/Website-Site-Toolchain/actions/workflows/gates.yml)

> 治理规范：[ReSerendipity/.github/governance](https://github.com/ReSerendipity/.github/tree/main/governance)

## 为什么不是全文镜像

私有内容仓合计 1.53 GiB / 93,586 个 Markdown，且正文版权归 HoYoverse（见各仓
`NOTICE.md`）。全文镜像既超出 GitHub 建议体积，也构成向公众再分发游戏文本。

而门禁实际校验的是 **frontmatter 结构、字段完整性、文件路径与编号规范**——这些都能
从 `data/*.json` 与文件路径导出。本仓只接收这三类结构信息。

## 目录

| 路径 | 作用 |
|---|---|
| `tools/snapshot-content.mjs` | 从私有仓导出结构签名（路径 + frontmatter 键 + 字节数） |
| `tools/verify-snapshot.mjs` | 对快照跑门禁：frontmatter 漂移、JSON 完整性、编号规范、空文件 |
| `tests/run-tests.mjs` | 工具链自测（合成数据，不接触真实内容） |
| `snapshot/` | 快照产物（提交入库，CI 直接读取） |
| `.github/workflows/gates.yml` | 公开仓 CI：push / PR / 每周一 |

## 用法

在私有内容仓根目录导出快照：

```bash
node <本仓>/tools/snapshot-content.mjs --src . --out <本仓>/snapshot
```

然后在公开仓运行门禁：

```bash
npm run gate
```

## 快照里有什么、没有什么

**有**：每个 Markdown 的相对路径、字节数、frontmatter 的**键名**列表；`data/` 下的
结构化 JSON（角色 ID、编号等字段）。
**没有**：任何正文、图片、脚本、`archive/`。

`tests/run-tests.mjs` 中有一条断言专门检查「tree.json 不含正文文本」，防止导出器
将来误带正文。

## 与私有仓的关系

- 公开仓：本仓库，免费 CI，负责结构门禁。
- 私有仓：内容正文 + 构建 + Pages 部署，门禁在其本地 pre-commit 与手动触发中长期运行。
- 快照需要随内容更新而刷新；刷新动作由所有者手动执行并提交，**不建立自动同步**
  （避免私有仓 CI 反向消耗额度）。

## 许可

MIT。本仓不含游戏内容，`data/*.json` 中的字段为结构化元数据。