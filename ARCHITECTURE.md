# 架构 — Website-Site-Toolchain

> 治理定位：`delivery=tool`、`lifecycle=active`（`governance/desired-state.json`）。
> 本文按 2026-11-03 的实际目录结构生成；数据流与边界须由维护者在实现变更时同步复核。

## 1. 定位

结构签名门禁工具链。为四个角色文本归档站（原神 / 星穹铁道 / 鸣潮 / 绝区零）提供

## 2. 组件与依赖方向

```text
工具层：tools/ (2)
资产层：snapshot/ (331)
测试层：tests/ (1)
支撑层：.github/ (3)、docs/ (1)
根级层：根级文件 (6)
```

| 组件 | 目录 | 文件数 | 代表文件 |
|---|---|---|---|
| `snapshot` | `snapshot/` | 331 | `snapshot/genshin/data/character-aether.json`, `snapshot/genshin/data/character-aino.json`, `snapshot/genshin/data/character-albedo.json` |
| 根级文件 | `/` | 6 | `.editorconfig`, `.gitattributes`, `.gitignore` |
| `tools` | `tools/` | 2 | `tools/snapshot-content.mjs`, `tools/verify-snapshot.mjs` |
| `docs` | `docs/` | 1 | `docs/agent-contract.md` |
| `tests` | `tests/` | 1 | `tests/run-tests.mjs` |

依赖方向：入口层（应用 / 页面）调用领域层（业务模块），领域层依赖基础设施层（脚本、配置、模型资产）；反向引用不允许。

## 3. 数据流

扫描站点快照 → 计算结构签名 → 与基线比对 → 门禁判定。

## 4. 外部依赖

| 依赖 | 用途 | 不可用时 |
|---|---|---|
| Node.js / npm | 签名计算与门禁 | 无法判定结构漂移 |

## 5. 边界与非目标

- 不做长期在线服务；离线即可完成主要工作。
- 不引入与工具体积不匹配的重型运行时。
- 不入库：密钥 / token / 口令 / 连接串、本机绝对路径、`local/` 与 `AGENTS.md`、构建产物。
- 治理正文只在 `ReSerendipity/.github/governance`，本仓不复制规则正文。

## 6. 变更影响面

| 改什么 | 必须同步 | 由谁校验 |
|---|---|---|
| 目录结构 / 入口 | 本文「组件与依赖方向」与「数据流」 | 维护者 |
| CI 与门禁 | 本仓 `README.md` 的测试命令；治理仓 §20 远端载体口径 | `audit-drift.py` |
| 依赖清单 | 锁文件与 `.github/dependabot.yml` 的生态段 | Dependabot / `lock-consistency` |
| README 展示图 | §8.1 真实性红线（图必须来自真实运行） | 治理仓 `readme-image-provenance` |
