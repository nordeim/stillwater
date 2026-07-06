## 验证范围说明

以下验证基于 **2026年7月6日** 的公开文档和官方发布渠道。由于技能文件中的部分声明来自私有仓库或尚未公开的文档（如 Better Auth 的 `guide_auth-v5_vs_better-auth.md`、Stillwater 内部的 `PAD.md`、`MASTER_EXECUTION_PLAN.md` 等），无法通过公开搜索完全证实。以下标注 **“无法公开验证”** 的条目均属于此类。


## §2 Tech Stack & Environment — 版本与配置声明

| 声明 | 验证结果 | 证据 |
|------|----------|------|
| **Next.js 16 将 `middleware.ts` 重命名为 `proxy.ts`** | ✅ **证实** | Next.js 16 官方文档确认：`proxy.ts` 取代 `middleware.ts`，导出函数名从 `middleware` 改为 `proxy`。迁移命令：`npx @next/codemod@canary middleware-to-proxy .` |
| **Next.js 16 `serverExternalPackages` 已从 `experimental` 移至顶层** | ✅ **证实** | Next.js 15.0.0 已将 `serverComponentsExternalPackages` 从实验性移至稳定版并重命名为 `serverExternalPackages`。Next.js 16 中该选项为顶层配置 |
| **Next.js 16 `cacheComponents: true` 为顶层配置（非 `experimental`）** | ✅ **证实** | Next.js 16 官方文档：在 `next.config.ts` 中设置 `cacheComponents: true` 即可启用。`experimental.ppr` 已被 `cacheComponents: true` 取代 |
| **Next.js 16 `params`/`searchParams`/`cookies()` 均为 `Promise<T>`** | ⚠️ **部分证实** | Next.js 16 中 `params` 和 `searchParams` 需要 `await`。技能文件称 `cookies()` 也是 `Promise` — 公开文档未明确提及，但 Next.js 16 的异步边界设计暗示该变更 |
| **Next.js 16 `proxy.ts` 默认运行在 Edge Runtime** | ❌ **存在争议** | 官方文档称 `proxy.ts` 运行在 **Node.js runtime**（非 Edge）。但存在 Issue 报告文档与错误信息不一致。部分文档仍称 Edge Runtime。**技能文件的“Edge runtime”声明与官方文档矛盾** |
| **React 19 中 `forwardRef` 不再必要，`ref` 可作为常规 prop 传递** | ✅ **证实** | React 19（2024年12月）中 `forwardRef()` 不再必要，函数组件可直接接受 `ref` 作为常规 prop。`forwardRef` 将在未来版本中弃用 |
| **React 19 `use(promise)` 可在 Client Component 中解包 Promise** | ✅ **证实** | React 19 的 `use()` Hook 可以处理 Promise 和 Context，在 Suspense 边界内解包 Promise |
| **Tailwind CSS v4 使用 `@theme` 指令进行 CSS-first 配置** | ✅ **证实** | Tailwind v4 所有主题自定义在 CSS 中通过 `@theme` 指令完成。`@import "tailwindcss"` 替代了旧的 `@tailwind` 指令 |
| **Tailwind CSS v4 中 `outline-none` 重命名为 `outline-hidden`** | ✅ **证实** | v4 升级指南明确 `outline-none` 重命名为 `outline-hidden` |
| **Tailwind CSS v4 弃用 `bg-opacity-*`/`text-opacity-*`，使用斜杠语法** | ✅ **证实** | v4 移除了弃用的 opacity 工具类，使用斜杠语法如 `bg-blue-500/50` |
| **Drizzle ORM `^0.45.0` 已发布** | ✅ **证实** | Drizzle ORM 0.45.0 于 2025年12月4日发布。0.45.2 修复了 `sql.identifier()` 和 `sql.as()` 的转义问题 |
| **Drizzle ORM `db.$count` 需要 ≥0.34.0** | ✅ **证实** | `$count` API 首次在 0.34.0 版本中添加 |
| **Drizzle ORM 关系查询 API v2 (`defineRelations()`) 需要 ≥1.0.0-beta** | ✅ **证实** | Drizzle ORM 1.0 将旧的 `schema` 选项替换为通过 `defineRelations()` 构建的 `relations`。RQBv1 已被移除 |
| **Better Auth `^1.6.23` 已发布** | ✅ **证实** | 1.6.22 → 1.6.23 更新存在于 Dependabot 记录中。Better Auth 1.6 是向更结构化工作流过渡的桥接版本 |
| **Better Auth `auth.api.getSession()` 需要显式传递 headers** | ✅ **证实** | Better Auth 文档：在服务器环境（如 Next.js Server Component）中需使用 `auth.api.getSession` 并传递请求 headers |
| **Better Auth 使用 camelCase 字段名（与 Auth.js 的 snake_case 不同）** | ✅ **证实** | Better Auth 默认使用 camelCase 字段名，但可通过字段映射配置更改数据库列名。存在 snake_case 兼容性问题 |
| **Trigger.dev v4 平台使用 `@trigger.dev/sdk` 导入（非 `/v4`）** | ✅ **证实** | Trigger.dev 官方文档明确：**始终从 `@trigger.dev/sdk` 导入，永远不要从 `@trigger.dev/sdk/v3` 导入**。v4 平台使用 SDK 的 `defineConfig` |
| **Trigger.dev `maxDuration` 测量 CPU 时间（非 wall-clock）** | ✅ **证实** | 官方文档：`maxDuration` 以秒为单位，与任务单次执行的 **CPU 时间** 进行比较 |
| **Stripe API 当前版本为 `2026-06-24.dahlia`** | ✅ **证实** | Stripe 官方文档：当前 API 版本为 `2026-06-24.dahlia` |
| **Stripe SDK v22 使用 snake_case 字段名** | ⚠️ **部分证实** | Stripe SDK 的 API 版本与 SDK 版本绑定。Stripe 的 JSON API 使用 snake_case。技能文件声称 SDK v22 暴露 snake_case 以匹配 API 线格式 — 这在 Stripe Node SDK 中历来如此 |
| **React Email v6（2026年4月16日）统一了所有导入到 `react-email` 包** | ✅ **证实** | React Email 6.0.0 于 2026年4月16日发布，所有组件和渲染工具统一到 `react-email` 包。导入方式从 `@react-email/components` 改为 `react-email` |
| **ESLint v10 与 `eslint-plugin-react` 不兼容** | ✅ **证实** | `eslint-plugin-react` 的 peer dependency 范围上限为 ESLint 9。多个包明确表示与 ESLint 9 不兼容。`eslint-plugin-react-compiler` 与 ESLint 9 flat config 不兼容 |
| **TypeScript `verbatimModuleSyntax`（TS 5.0+）要求 `import type`** | ✅ **证实** | `verbatimModuleSyntax` 自 TypeScript 5.0 起可用，强制显式类型导入/导出 |
| **TypeScript `erasableSyntaxOnly`（TS 5.8+）禁止 `enum`/`namespace`/参数属性** | ✅ **证实** | `--erasableSyntaxOnly` 标志在 TypeScript 5.8 中引入。启用后仅允许可擦除的语法 |
| **Zod v4 使用 `error` 参数替代 `message`** | ✅ **证实** | Zod v4 将错误定制统一到单个 `error` 参数下，`message` 参数已被弃用但仍受支持 |
| **shadcn/ui `components.json` 中 `style: "default"` 已被弃用** | ⚠️ **部分证实** | shadcn/ui 文档称 `default` 风格已被弃用，推荐使用 `new-york`。但 Vercel Academy 文档仍显示 `"style": "default"`。**技能文件锁定 `"default"` 的决定与 shadcn/ui 官方推荐方向相反** |


## §1–§20 其他关键声明验证

| 声明 | 验证结果 | 证据 |
|------|----------|------|
| **Drizzle ORM `pgEnum()` 替代 TypeScript `enum`** | ✅ **证实** | Drizzle 中创建 PostgreSQL enum 使用 `pgEnum()` |
| **`@typescript-eslint/no-explicit-any` 规则存在** | ✅ **证实** | 该规则报告显式使用 `any` 关键字作为类型注解的情况 |
| **Next.js `cacheLife` 函数需要 `cacheComponents: true`** | ✅ **证实** | `cacheLife` 选项需要启用 `cacheComponents` 标志 |
| **React 19 `useOptimistic` Hook** | ✅ **证实** | React 19 内置了 `useOptimistic` Hook |
| **shadcn/ui 的 `--radius` 可覆盖为 0** | ⚠️ **间接证实** | shadcn/ui 的设计理念是直接编辑组件代码。CSS 变量覆盖是可行的，但需要直接修改组件文件 |


## 关键差异汇总

| # | 技能文件声明 | 公开文档显示 | 建议 |
|---|-------------|-------------|------|
| 1 | `proxy.ts` 运行在 Edge Runtime | Next.js 官方文档称运行在 **Node.js runtime** | **需要确认** — 技能文件的 Edge 声明与官方文档矛盾。可能存在版本差异或文档不一致 |
| 2 | `shadcn/ui` 使用 `style: "default"` | shadcn/ui 官方称 `default` 已被弃用，推荐 `new-york` | **需要确认** — 如果项目锁定 `default`，需注意未来 shadcn 升级可能移除该风格 |
| 3 | `@trigger.dev/sdk/v3` 导入路径 | 官方文档称 **永远不要从 `/v3` 导入**，应使用 `@trigger.dev/sdk` | **需要确认** — 技能文件中的 `/v3` 导入路径与 Trigger.dev 官方推荐相反 |
| 4 | Better Auth 使用严格类型（`emailVerified` 为 boolean） | Better Auth 通过字段映射支持自定义 | **需要确认** — 需验证 Drizzle 适配器的具体类型定义 |
| 5 | `proxy.ts` 中调用 `auth.api.getSession()` 是错误的 | Better Auth 文档称在服务器环境中应使用 `auth.api.getSession` | **部分证实** — 在 Edge Runtime 中确实不应调用，但若 `proxy.ts` 实际运行在 Node.js（官方文档），则该限制可能不成立 |


## 无法公开验证的声明

以下声明来自私有仓库或内部文档，**无法通过公开搜索证实**：

- Better Auth 的 `trustHost` 选项不存在（`better-auth` 内部文档）
- Auth.js v5 仍处于 `5.0.0-beta.31`（npm 信息可查，但具体版本号需核实）
- Stillwater 内部架构决策（ADR-001 至 ADR-010）
- `MASTER_EXECUTION_PLAN.md` 中的 45 个差异（D1–D45）
- `react_email_suggestion.md` 中的 Resend Native Templates 建议


## ⚠️ 阻断性问题

以下问题需要在继续推进前解决：

1. **`proxy.ts` Runtime 矛盾** — 技能文件声称 Edge Runtime，但 Next.js 16 官方文档明确称 Node.js runtime。这是一个 **关键矛盾**，直接影响 `proxy.ts` 中能否调用 `auth.api.getSession()`（Node.js 可以，Edge 不可以）。

2. **Trigger.dev 导入路径** — 技能文件使用 `@trigger.dev/sdk/v3`，但官方文档明确禁止从 `/v3` 导入。应使用 `@trigger.dev/sdk`。

3. **shadcn/ui `style` 字段** — 技能文件锁定 `"default"`，但官方已弃用该风格。项目需决定是否迁移到 `"new-york"` 或接受未来升级风险。

---

https://chat.deepseek.com/share/ug1zdphxqkreelhv8n 
