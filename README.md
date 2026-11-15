# <img src="public/thread-mark.svg" alt="" width="26" /> Threads 情境式查證 Demo

在模擬的演唱會門票交易中，用 Widget 查證對話、網址和 Threads 帳號，也可以直接輸入問題。

## 本機啟動

```powershell
pnpm install
pnpm dev
```

- 開啟終端顯示的網址，點第一篇門票串文的頭貼 → 送出「轉好帳了」→ 點「查證」。
- 本機可先用預覽案例與模擬回覆。要測 AI、案例檢索與後台紀錄，請設定下方的 Neon 和 OpenAI。

## 連接 Neon、OpenAI 與 Vercel

1. 初次建立 Neon 資料庫時執行 [schema.sql](lib/server/schema.sql)，再從 **Connect** 複製 pooled connection string。
2. 複製 [環境變數範本](.env.example) 為 `.env.local`，填入 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_PASSWORD` 和 `ADMIN_SESSION_SECRET`。範本內有產生登入簽署金鑰的指令。填好後重啟開發伺服器。
3. 部署到 Vercel 時，在專案的 **Settings → Environment Variables** 設定同名變數，沿用同一個 Neon 資料庫。新增或修改變數後重新部署。
4. 到 `/admin/login` 登入，在 `/admin/cases` 新增案例並更新首頁案例卡。在 `/admin/accounts` 加入模擬賣家帳號，再用 Widget 查證一次，回 `/admin` 核對紀錄。

## 頁面入口

| 路徑 | 用途 |
| --- | --- |
| `/` | Threads 首頁。點第一篇門票文頭貼進聊天室。 |
| `/messages` · `/messages/weekend-stage` | 聊天列表與門票聊天室。「查證」在聊天室內開啟 Widget。 |
| `/admin/login` · `/admin` | 後台登入與測試紀錄。 |
| `/admin/cases` · `/admin/accounts` | 維護官方案例、更新首頁案例卡、管理可疑 Threads 帳號。 |

- **技術**：Next.js App Router、TypeScript、Tailwind CSS、Tabler Icons、Motion、shadcn、Neon PostgreSQL／pgvector、OpenAI。 [套件清單](package.json)

## 可調整的 Demo 內容

| 想改什麼 | 位置 | 改哪裡 |
| --- | --- | --- |
| 第一篇門票串文 | [data/posts.ts](data/posts.ts#L12) | 改 `featuredPost` 的主題 `topic`、正文 `text`、時間或互動數。改主題或正文後，到後台按「更新首頁案例卡」。 |
| 首頁其他串文 | [data/posts.ts](data/posts.ts#L21) | 在 `posts` 增修一般串文的帳號、正文、時間與互動數。 |
| 賣家帳號與聊天室劇本 | [data/scenarios/ticket.ts](data/scenarios/ticket.ts#L1) | 改 `ticketSellerId`、預填回覆 `ticketReply`、訊息間隔 `messageIntervalMs`，以及 `openingMessages`、`followUpMessages` 的台詞與示例網址。修改賣家 ID 後，同步調整後台測試帳號。 |
| 本機預覽案例卡 | [data/preview-cases.ts](data/preview-cases.ts#L7) | 改 `previewCases` 的標題、短摘要與來源。首頁未連 Neon 時使用這組卡。 |
| 官方案例與首頁選卡 | 後台 `/admin/cases` | 編輯商品類別、案例原文、發布日期、縣市和來源。要重選首頁案例時按「更新首頁案例卡」。 |
| 可疑 Threads 帳號 | 後台 `/admin/accounts` | 維護帳號 ID、案件狀態、查詢人數和資料連結。 |
| 網址查證的官方主機 | [lib/server/official-hosts.ts](lib/server/official-hosts.ts#L1) | 更新 `services` 的品牌別名、主網域、官方主機與來源。 |
| Widget 模擬回覆與報案連結 | [模擬回覆](lib/server/verification.ts#L183) · [報案連結](lib/server/verification.ts#L14) | 改未啟用 AI 時使用的固定建議，或調整 `reportUrl`。 |

## AI 指令詞（Prompts）與 RAG

| 想微調什麼 | 位置 | 可調整的內容 |
| --- | --- | --- |
| Widget 查證與小客服回覆 | [lib/server/verification.ts](lib/server/verification.ts#L170) | 改 `processSubmission` 呼叫 `generateExplanation` 時傳入的指令，調整語氣、篇幅和下一步建議。 |
| 案例標題、手法標籤、卡片短摘要 | [lib/server/openai.ts](lib/server/openai.ts#L56) | 改 `generateCaseMetadata`。保留 JSON 欄位 `title`、`methodTags`、`cardSummary`，短摘要維持 60 字以內。 |
| 生成模型與輸出上限 | [環境變數範本](.env.example#L17) · [lib/server/openai.ts](lib/server/openai.ts#L83) | 模型用 `OPENAI_MODEL` 覆寫。輸出上限在 `generateExplanation`。 |
| RAG 查詢與案例向量的輸入 | [Widget 查詢](lib/server/verification.ts#L153) · [案例向量文字](lib/server/openai.ts#L42) | 分別調整查詢使用的對話內容，以及案例向量使用的欄位。 |
| 案例排序與首頁選卡 | [案例檢索](lib/server/retrieval.ts#L22) · [首頁選卡](lib/server/retrieval.ts#L65) | RAG 用向量相似度、商品類別與手法標籤排序。首頁用第一篇串文的主題與正文查詢。 |

## 技術架構

### 測試動線與查證

- 首頁有三篇固定串文，第一篇門票文可進聊天室，並顯示最多三張案例卡。聊天列表的賣家列項或「新訊息」也可進聊天室。
- 聊天室預填唯讀的「轉好帳了」。送出後每 1 秒顯示一則賣家訊息。瀏覽器保留場次與進度，重整或回聊天室可續看。本機開發和 Vercel Preview 可按「重新開始」建立新場次，既有測試紀錄仍保留。
- Widget 的三個查證分頁共用送出鍵，可帶上小客服文字一起送出。切換分頁保留草稿，已填項目會顯示膠囊。送出後顯示各項結果，清除已完成的輸入，失敗的內容可重試。

| 輸入 | 查證流程 |
| --- | --- |
| 對話風險 | 逐句選取賣家訊息。伺服器依劇本版本和訊息 ID 還原內容，再說明可疑線索。 |
| 連結查證 | 解析主網域與次網域，依官方主機清單和品牌線索判斷。結果分為符合已知官方主機、疑似仿冒或未知。 |
| 帳號查證 | 將 Threads ID 去除開頭的 `@`、轉為小寫後比對清單。命中顯示「此為可疑帳號」，其餘顯示「未知」。 |
| 小客服 | 用自由文字和相關案例生成繁中說明與下一步建議。 |

- 網址查證只解析輸入文字。HTTPS 的完整主機命中且沒有非預設連接埠時，顯示官方來源。品牌線索符合、主網域不符且完整主機未命中時，顯示「疑似仿冒」。短網址只核對原始主機。
- 由規則判定帳號和網址狀態，AI 根據分項結果寫綜合說明。AI 說明失敗時，已完成的分項仍可查看。有可疑線索時顯示報案入口。
- 查證由 `POST /api/widget` 驗證輸入及寫入紀錄。伺服器用場次 ID 串起多輪，用場次 ID 和提交 ID 辨識重送。 [Widget API](app/api/widget/route.ts)

### 案例檢索與儲存

| 流程 | 行為 |
| --- | --- |
| 儲存案例 | 新增或修改商品類別、原文時，AI 產生標題、手法標籤與短摘要。標題、商品類別、標籤及原文用來建立向量，存入 pgvector。 |
| 首頁選卡 | 後台按「更新首頁案例卡」，依第一篇串文的主題與正文檢索，按劇本版本保存選卡順序。首頁顯示已選案例的最新標題與短摘要。 |
| Widget 選卡 | 用文字、勾選的賣家訊息與同場最多兩筆已成功的提問檢索。依向量相似度、商品類別和手法標籤排序，再把案例原文提供給 AI。 |
| 共用案例卡 | 首頁和 Widget 共用卡片元件，每次最多三張，資料不足時顯示實際筆數。卡片包含標題、短摘要與來源。 [case-card.tsx](components/case-card.tsx) |

| Neon 資料表 | 保存內容 |
| --- | --- |
| `cases` | 案例原文、來源、AI 生成欄位與向量。 |
| `homepage_cards` | 各劇本版本的首頁選卡及順序。 |
| `suspicious_accounts` | 可疑 Threads 帳號、案件狀態、查詢人數與資料連結。 |
| `widget_submissions` | 各輪的輸入、選取訊息、劇本版本、分項結果、AI 回覆與引用案例。 |

- 管理員登入後可維護資料，受測者可直接使用 Demo。查證提交紀錄沒有自動到期。開啟 Widget、取消勾選等操作不另存事件。 [Neon schema](lib/server/schema.sql)

### 資料夾索引

| 路徑 | 用途 |
| --- | --- |
| [app/](app/) | 首頁、聊天室、管理頁和 Widget API。 |
| [components/](components/) | Threads 畫面、Widget、案例卡和後台元件。 |
| [data/](data/) | 固定串文、聊天室劇本、預覽案例。 |
| [lib/server/](lib/server/) · [lib/admin/](lib/admin/) | 查證、RAG、OpenAI、資料庫與後台驗證。 |
| [public/](public/) | 靜態素材。 |
