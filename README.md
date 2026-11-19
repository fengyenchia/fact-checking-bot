# <img src="public/thread-mark.svg" alt="" width="26" /> Threads 情境式查證 Demo

在模擬的演唱會門票交易中，用 Widget 查證對話、網址和 Threads 帳號，也可以直接輸入問題。

Widget 已有功能選單、使用說明、插圖、載入畫面與查證結果。快速對話可在結果頁繼續追問。UI 依設計稿調整中。[Figma 設計稿](https://www.figma.com/design/rSoJO3KgefdfqOF7AKrtj7/%E5%B0%8F%E5%91%A8%E5%90%8C%E5%AD%B8%E3%84%89%E6%98%A5%E7%A7%8B%E5%A4%A7%E5%A4%A2?node-id=0-1&t=O2TUSN6b7i3xs69W-1)

## 本機啟動

```powershell
pnpm install
pnpm dev
```

- 開啟終端顯示的網址，點第一篇門票串文的頭貼 → 送出「轉好帳了」→ 點「查證」。
- 本機可先用預覽案例與模擬回覆。連結 AI 補查使用 OpenAI 金鑰。要測 AI 回覆、案例檢索與後台紀錄，請一併設定 Neon。

## 連接 Neon、OpenAI 與 Vercel

1. 初次建立 Neon 資料庫時執行 [schema.sql](lib/server/schema.sql)，再從 **Connect** 複製 pooled connection string。
2. 複製 [環境變數範本](.env.example) 為 `.env.local`，填入 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_PASSWORD` 和 `ADMIN_SESSION_SECRET`。範本內有產生登入簽署金鑰的指令。填好後重啟開發伺服器。
3. 部署到 Vercel 時，在專案的 **Settings → Environment Variables** 設定同名變數，沿用同一個 Neon 資料庫。新增或修改變數後重新部署。
4. 到 `/admin/login` 登入，在 `/admin/cases` 新增案例並更新首頁案例卡。在 `/admin/accounts` 加入模擬賣家帳號，再用 Widget 查證一次，回 `/admin` 核對紀錄。

## 頁面入口

| 路徑 | 用途 |
| --- | --- |
| `/` | Threads 首頁。點第一篇門票文頭貼進聊天室。 |
| `/messages` · `/messages/giveme_money` | 聊天列表與門票聊天室。「查證」在聊天室內開啟 Widget。 |
| `/admin/login` · `/admin` | 後台登入與測試紀錄。按場次分組，可展開各筆輸入與回覆。 |
| `/admin/cases` · `/admin/accounts` | 維護官方案例、更新首頁案例卡、管理可疑 Threads 帳號。 |

- **技術**：Next.js App Router、TypeScript、Tailwind CSS、Tabler Icons、Motion、shadcn、Neon PostgreSQL／pgvector、OpenAI。 [套件清單](package.json)

## 可調整的 Demo 內容

| 想改什麼 | 位置 | 改哪裡 |
| --- | --- | --- |
| 第一篇門票串文 | [data/posts.ts](data/posts.ts#L12) | 改 `featuredPost` 的主題 `topic`、正文 `text`、時間或互動數。改主題或正文後，到後台按「更新首頁案例卡」。 |
| 首頁其他串文 | [data/posts.ts](data/posts.ts#L21) | 在 `posts` 增修一般串文的帳號、正文、時間與互動數。 |
| 賣家帳號與聊天室劇本 | [data/scenarios/ticket.ts](data/scenarios/ticket.ts#L1) | 改 `ticketSellerName`、`ticketSellerId`、預填回覆 `ticketReply`、訊息間隔 `messageIntervalMs`，以及 `openingMessages`、`followUpMessages` 的台詞與示例網址。聊天室路徑跟著賣家 ID 更新，後台測試帳號須同步調整。 |
| 本機預覽案例卡 | [data/preview-cases.ts](data/preview-cases.ts#L7) | 改 `previewCases` 的標題、短摘要與來源。首頁未連 Neon 時使用這組卡。 |
| 官方案例與首頁選卡 | 後台 `/admin/cases` | 顯示案例總筆數，並可編輯商品類別、案例原文、發布日期、縣市和來源。在 Neon 直接修改資料後，按「重新讀取案例」載入最新清單。要重選首頁案例時按「更新首頁案例卡」。 |
| 可疑 Threads 帳號 | 後台 `/admin/accounts` | 維護帳號 ID、案件狀態、查詢人數和資料連結。 |
| 網址查證的官方主機 | [lib/server/official-hosts.ts](lib/server/official-hosts.ts#L1) | 更新 `services` 的品牌別名、主網域、官方主機與來源。 |
| TWNIC 通報網址比對 | [通報網址快照](data/通報TWNIC詐騙網址彙整表_20261008.json) · [比對程式](lib/server/reported-urls.ts) | 使用 2026-10-08 的本機資料。按解析後的完整主機、連接埠、路徑、查詢參數和片段比對。 |
| 連結 AI 補查 | [搜尋指令](lib/server/openai.ts#L110) · [來源核對](lib/server/official-site-search.ts) | 搜尋 App Store／Google Play，再核對開發者網站的完整主機。 |
| Widget 預覽回覆與通報入口 | [查證流程](lib/server/verification.ts) · [165 報案](lib/server/verification.ts#L18) · [數發部通報](components/chatbot/types.ts#L3) | 未啟用 AI 回覆時使用固定建議。連結、對話及帳號查證依結果顯示數發部通報按鈕，快速對話依 AI 建議顯示。 |

## AI 指令詞（Prompts）與 RAG

### 目前大概會回什麼

以下依現有規則與指令整理。AI 文字為示意，實際用詞及引用案例會依輸入、前文和案例庫而變。

| 功能與測試輸入 | 介面會顯示什麼 | AI 回覆示意 |
| --- | --- | --- |
| 快速對話 ·「買演唱會票，對方說轉帳失敗，要我再付一次。」 | 顯示 AI 建議，有相關案例時附卡片。下方可繼續追問。 | 「先不要再匯款。從銀行 App 確認第一筆交易，並保留對話與付款紀錄。」 |
| 快速對話 ·「對方傳來付款驗證網站，要求輸入簡訊驗證碼。」 | AI 若建議直接通報，會出現「前往數發部通報」。建議先查證時，可顯示連結或帳號查證按鈕。 | 「先停止操作、別輸入驗證碼。保留網址和對話截圖，通報這則可疑訊息。」 |
| 連結查證 · `https://myship.payment-check.invalid/` | 顯示「潛在風險」，說明品牌線索與主網域不符，底部提供數發部通報。 | 「請從平台官網或 App 核對訂單，先不要在這個連結輸入付款或驗證資料。」 |
| 帳號查證 · `@giveme_money` | 命中顯示風險標題、已填的查詢人數與來源、狀態和數發部通報按鈕。「核實中」或「正在核實」顯示「潛在風險」。未命中顯示「目前查無此帳號的資料。」 | AI 說明保存於查證紀錄。 |
| 對話評估 · 勾選賣家「你可以先付第二次嗎？」 | 依劇本規則顯示「極高風險」、可疑線索與數發部通報。相關案例直接顯示在結果底部，可橫向滑動。 | AI 補充文字保存在查證紀錄。Widget 結果頁顯示規則判定和案例卡。 |

### 指令詞與輸入內容

| 想改什麼 | 目前做法與修改位置 |
| --- | --- |
| 回覆內容和語氣 | 用繁體中文簡短說明風險和下一步。有可疑線索時建議暫停交易並走官方管道。查無相關案例時直接提供查證結果與建議。AI 沿用規則判定，避免重複個資、帳號與網址。見 [查證回覆指令](lib/server/verification.ts#L220)。 |
| 快速對話的追問和按鈕 | 將本輪文字、同場最近兩筆成功的問答和相關案例交給 AI。前文每筆最多取問題 300 字元、回覆 400 字元。指令讓模型依情境輸出 `[check:url]`、`[check:account]` 或 `[check:report]`，程式轉成固定按鈕。見 [前文查詢](app/api/widget/route.ts#L105)與[按鈕](components/chatbot/quick-chat.tsx#L60)。 |
| 案例卡文字 | 儲存時把商品類別和原文交給 AI，輸出 `title`、`methodTags`、`cardSummary`。指令要求標題一行且 10 字以內、1 至 5 個手法標籤、卡片短摘要最多 30 字。見 [generateCaseMetadata](lib/server/openai.ts#L56)。 |
| 模型與回覆長度 | 程式預設 `gpt-6-luna`，可用 `OPENAI_MODEL` 覆寫。請求上限是 600 個輸出 token，取得的文字再取前 600 字元。見 [環境變數範本](.env.example#L18)與 [generateExplanation](lib/server/openai.ts#L83)。 |

AI 回覆與 RAG 同時需要 `DATABASE_URL` 和 `OPENAI_API_KEY`。未啟用時使用固定建議。連結 AI 補查只需要 `OPENAI_API_KEY`，固定使用 `gpt-6-luna`。AI 或案例檢索失敗時，已完成的規則判定仍可查看，快速對話會提示稍後重試。

### RAG 怎麼挑案例

RAG 先從案例庫找相關案例，再把找到的資料交給 AI 參考。

| 階段 | 目前做法 |
| --- | --- |
| 建立向量 | 建檔或修改商品類別、原文時，用標題、商品類別、手法標籤及**案例原文**建立向量。使用 `text-embedding-3-small` 的 1536 維向量，存入 Neon pgvector。短摘要用於卡片顯示。見 [向量輸入](lib/server/openai.ts#L42)與[案例儲存](lib/admin/data.ts#L109)。 |
| Widget 搜尋 | 對話評估用選取的賣家原話，快速對話用本輪文字加上前兩筆成功的問題。勾選劇本對話或文字提到購票時，會用「門票」作商品線索。單獨做連結或帳號查證時，AI 說明根據判定結果，不會搜尋案例。見 [查證流程](lib/server/verification.ts#L171)。 |
| 篩選與排名 | 只搜尋已收錄、有向量、來源為 HTTPS 的案例。相似度至少 `0.25`，且須達 `0.40` 或命中商品／手法線索。商品類別命中加 `0.15`，手法標籤出現在查詢文字加 `0.12`。依總分取最多三筆。見 [findCases](lib/server/retrieval.ts#L22)。 |
| 回覆與卡片 | **快速對話和對話評估都會在每筆結果最下方直接顯示最多三張案例卡，可橫向滑動。** Threads 首頁門票串文使用同款卡片。AI 參考案例標題和**原文**，卡片顯示標題、短摘要，可點擊前往 165 打詐儀錶板。查無案例時省略整個案例區。見 [查證流程](lib/server/verification.ts#L205)與[共用案例卡](components/case-card.tsx)。 |
| 首頁選卡 | 後台按「更新首頁案例卡」時，用第一篇門票串文的主題與正文搜尋，再按劇本版本保存選卡順序。首頁直接讀取已選案例的最新文案。見 [prepareHomepageCards](lib/server/retrieval.ts#L65)。 |

## 技術架構

### 測試動線與查證

- 首頁有三篇固定串文，第一篇門票文可進聊天室，並顯示最多三張案例卡。聊天列表的賣家列項或「新訊息」也可進聊天室。
- 聊天室預填唯讀的「轉好帳了」。送出後每 1 秒顯示一則賣家訊息。瀏覽器保留場次與進度，重整或回聊天室可續看。本機開發和 Vercel Preview 可按「重新開始」建立新場次，既有測試紀錄仍保留。
- Widget 開啟後先顯示選單。頂部標題與底部關閉按鈕固定，插圖、選單及使用說明內容可上下捲動。選擇連結查證、對話評估、帳號查證或快速對話後，進入對應的輸入及結果畫面。返回選單會保留草稿。每次送出只提交目前類別的內容，失敗時可重試。
- 進入聊天室後預先載入 Widget 插圖、讀取圈和客服頭貼。小型 PNG 使用原始靜態檔。面板開啟時以 Motion 淡入並上移 10 px，動畫長 0.17 秒，配合使用者的減少動態效果設定。
- Widget 功能頁切換時淡入並上移 6 px，動畫長 0.15 秒。查證結果與快速對話的每筆回覆整區淡入 0.2 秒，配合使用者的減少動態效果設定。
- 黃色與黑色按鈕、查證入口和共用 Button 都有按住時的變色回饋，手機觸控時立即顯示。

| 輸入 | 查證流程 |
| --- | --- |
| 對話評估 | 逐句選取賣家訊息。伺服器依劇本版本和訊息 ID 還原內容，再顯示該句對應的風險線索。 |
| 連結查證 | 依序檢查網址格式、完整官方主機、TWNIC 通報網址、品牌仿冒線索，最後用 AI 搜尋補查。結果頁以色塊顯示完整主機、主網域、次網域、來源與狀態。 |
| 帳號查證 | 將 Threads ID 去除開頭的 `@`、轉為小寫後比對清單。結果見 [帳號查證元件](components/chatbot/account-check-result.tsx)。 |
| 快速對話 | 用自由文字、近期問答和相關案例生成繁中說明。回覆可附查證或通報按鈕。 |

連結查證依下列順序執行，命中即回傳結果。 [判定程式](lib/server/verification.ts#L72)

1. **連結無效**。格式錯誤或解析不到主網域時，在輸入頁提示「連結無效，請重新輸入！」。
2. **比對已知服務**。HTTPS 網址的完整主機命中清單且使用預設連接埠時，顯示「已核對」。例如 iOPEN Mall，服務名稱和連結放在來源欄。
3. **比對 TWNIC 通報清單**。比對解析後的完整主機、連接埠、路徑、查詢參數和片段，命中顯示「曾被通報」。比對鍵共用 HTTP／HTTPS，資料來源為本機 JSON 快照。
4. **檢查品牌仿冒線索**。使用清單內品牌的別名，比對次網域標籤或主網域名稱中的前後綴。例如 `myship.payment-check.invalid` 含賣貨便線索，但主網域不符，顯示「潛在風險」並指出對照品牌及原因。
5. **AI 搜尋補查**。未確認的 HTTPS 主機且使用預設連接埠時，用 OpenAI Web Search 找 App Store 或 Google Play 的應用程式頁面。只送完整主機名稱搜尋，程式再讀取商店頁面並核對開發者網站是否指向相同主機。有佐證時顯示「已核對」並附商店來源，來源不足、搜尋失敗或尚未設定 API 時顯示「無法確認」。

- 短網址核對範圍為原始主機。連結補查程式已接入，正式 Vercel 環境的搜尋與來源讀取須納入上線驗收。
- 連結結果的大標顯示判定，全址與主次網域放在黃色色塊，另有橘色來源和藍色狀態色塊。結果為「潛在風險」或「曾被通報」時，底部顯示風險提醒與「前往數發部通報」。見 [連結結果元件](components/chatbot/url-check-result.tsx)。
- 對話評估為極高風險或帳號查證命中時，顯示數發部通報。快速對話依 AI 建議顯示數發部通報，其他符合報案規則的快速對話可顯示 165 報案。
- 查證由 `POST /api/widget` 驗證輸入及寫入紀錄。伺服器用場次 ID 串起多輪，用場次 ID 和提交 ID 辨識重送。 [Widget API](app/api/widget/route.ts)

### 資料儲存

| Neon 資料表 | 保存內容 |
| --- | --- |
| `cases` | 案例原文、來源、AI 生成欄位與向量。 |
| `homepage_cards` | 各劇本版本的首頁選卡及順序。 |
| `suspicious_accounts` | 可疑 Threads 帳號、案件狀態、查詢人數與資料連結。 |
| `widget_submissions` | 各輪的輸入、選取訊息、劇本版本、分項結果、AI 回覆與引用案例。 |

- 管理員登入後可維護資料，受測者可直接使用 Demo。查證提交紀錄沒有自動到期。開啟 Widget、取消勾選等操作不另存事件。 [Neon schema](lib/server/schema.sql)
- 舊可疑帳號表若仍有 `reason`，在 Neon SQL Editor 執行 [清理 SQL](lib/server/migrations/simplify-suspicious-accounts.sql)，移除此欄位及其中的舊資料。目前帳號表使用 `id`、`case_status`、`lookup_count`、`source_url` 和 `updated_at`。

### 資料夾索引

| 路徑 | 用途 |
| --- | --- |
| [app/](app/) | 首頁、聊天室、管理頁和 Widget API。 |
| [components/](components/) | Threads 畫面、Widget、案例卡和後台元件。 |
| [data/](data/) | 固定串文、聊天室劇本、預覽案例及 TWNIC 通報網址快照。 |
| [lib/server/](lib/server/) · [lib/admin/](lib/admin/) | 查證、RAG、OpenAI、資料庫與後台驗證。 |
| [public/](public/) | 靜態素材。 |
