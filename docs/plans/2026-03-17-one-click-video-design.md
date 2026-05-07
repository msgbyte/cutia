# TIA-52 一键成片设计说明

## 背景

当前编辑器已经具备以下能力：

- `MediaView` 支持导入图片、视频、音频素材，并手动拖入时间线。
- `TimelineManager`、`element-utils`、`transition-utils` 已具备轨道、元素、转场拼装能力。
- `AIView` 已承载“生成图片/视频”“角色”“历史”等自动化能力，是最接近“一键成片”的现有入口。

当前缺口同样明确：

- 没有固定风格模板。
- 没有基于当前素材自动生成时间线草稿的流程。
- 没有可撤销的“整条时间线替换”命令。

## 复现信号

- [apps/web/src/components/editor/panels/assets/views/media.tsx](/root/.config/superpowers/worktrees/cutia/.symphony-workspaces/symphony-full-workflow/TIA-52/apps/web/src/components/editor/panels/assets/views/media.tsx) 只支持导入素材和单个添加到时间线。
- [apps/web/src/components/editor/panels/assets/views/ai.tsx](/root/.config/superpowers/worktrees/cutia/.symphony-workspaces/symphony-full-workflow/TIA-52/apps/web/src/components/editor/panels/assets/views/ai.tsx) 目前只有 `Generate`、`Characters`、`History` 三个子视图。
- [apps/web/src/lib/actions/definitions.ts](/root/.config/superpowers/worktrees/cutia/.symphony-workspaces/symphony-full-workflow/TIA-52/apps/web/src/lib/actions/definitions.ts) 中不存在与模板成片相关的 action。

## 方案比较

### 方案 A：新增左侧一级面板 Tab

优点：

- 可见性最高。
- 模板能力和 AI 生成解耦。

缺点：

- 需要改动 `assets-panel-store`、`tabbar`、面板映射，UI 侵入面较大。
- 对当前“AI 辅助编辑能力集中在 AI 面板”这一信息架构不够一致。

### 方案 B：在 AI 面板中新增“模板成片”子视图

优点：

- 只改动 `AIView` 内部结构，落点集中。
- 用户已经会在 AI 面板寻找自动化能力，符合心理预期。
- 可以直接复用当前项目素材、toast、动作系统。

缺点：

- 入口比一级 Tab 稍深一层。

### 方案 C：在顶部 Header 放一个“一键成片”按钮并弹出模态框

优点：

- 操作最显眼。

缺点：

- Header 已较拥挤，增加后会稀释现有主操作。
- 模态框仍需承载模板说明、素材校验和覆盖确认，复杂度并不比 AI 面板低。

## 结论

采用 **方案 B**：

- 在 `AIView` 中新增“模板成片”子视图。
- 用户从当前项目素材库中导入素材后，进入该视图选择模板。
- 模板生成逻辑由纯函数负责，UI 只收集选择并触发 action。
- 真正的时间线替换通过新命令完成，保证撤销/重做成立。

## 功能边界

本次只做固定模板的一键成片草稿，不做：

- AI 分镜理解。
- 自动配乐推荐。
- 素材级勾选筛选器。
- 智能识别人脸、语音节拍或字幕生成联动。

默认规则：

- 使用当前项目素材库中全部非临时素材。
- 视觉素材仅取 `image` / `video`。
- 音频素材仅取 `audio`，作为可选背景音轨顺序铺开。
- 若当前时间线已有内容，生成前要求确认覆盖。

## 模板模型

定义固定模板配置，至少包含：

- `id` / `name` / `description`
- `pace`: 视频和图片的目标节奏
- `imageDuration`
- `videoDurationPolicy`: 保留原时长、截短上限、最小时长兜底
- `transition`: 类型与时长
- `heroText`: 首屏文案样式
- `closingText`: 收尾文案样式
- `visualMotion`: 对图片/视频施加的轻量缩放与位移节奏

首版提供 3 个模板：

1. `clean-cut`
   - 节奏均衡
   - `dissolve` 转场
   - 适合通用展示
2. `story-pulse`
   - 节奏更快
   - `wipe-left` 转场
   - 适合 vlog / 节奏剪辑
3. `memory-album`
   - 图片停留更久
   - `fade` 风格收尾文案
   - 适合相册型内容

## 数据流

1. 用户在媒体面板导入素材。
2. 在 AI 面板切换到“模板成片”。
3. 选择一个固定模板并点击生成。
4. UI 通过 `invokeAction("generate-template-cut", { templateId })` 触发动作。
5. `use-editor-actions` 中的 handler：
   - 读取当前项目与素材。
   - 校验是否存在可用视觉素材。
   - 若当前时间线非空且用户尚未确认覆盖，则中断并提示。
   - 调用纯函数生成 `TimelineTrack[]`。
   - 执行新命令替换 active scene tracks。
6. 编辑器现有订阅链触发预览刷新、保存和后续编辑。

## 时间线生成规则

### 视觉轨

- 主视频轨始终存在，并承载全部图片/视频元素。
- 图片使用模板定义的默认时长。
- 视频默认保留原始时长，但根据模板节奏截断到统一上限，避免过长素材破坏节奏。
- 每个元素串行排列，`startTime` 取前一元素结束时间。

### 文本轨

- 生成一个头部标题元素，内容取模板名称或模板预设文案。
- 生成一个尾部收尾元素，提示“继续编辑”或模板 tagline。
- 文本样式由模板定义，保证模板风格差异可见。

### 音频轨

- 若存在音频素材，则创建一条音频轨并从 `0s` 开始顺序铺开。
- 若不存在音频素材，不额外补充占位音轨。

### 转场

- 在主视频轨相邻视觉元素之间补转场。
- 使用现有 `transition-utils` 的相邻元素约束，不做重叠式复杂调度。

## 命令与撤销

新增“模板成片替换时间线”命令：

- `execute()` 保存当前 tracks，再写入新 tracks。
- `undo()` 恢复旧 tracks。

这样可以满足：

- 用户点击后立刻看到结果。
- `undo/redo` 保持可用。
- 不需要把整个流程拆成几十个小命令再组合。

## UI 交互

`AIView` 新增一个 `Templates` 子视图，包含：

- 模板卡片列表
- 模板标签：节奏、适用素材数量、转场类型
- “使用当前素材生成”按钮
- 无视觉素材时展示空状态，并提供“去 Media 面板导入素材”按钮

若当前时间线已有任意元素：

- 先弹出覆盖确认对话框。
- 用户确认后才触发 action。

## 测试策略

### 单元测试

新增纯函数测试，验证：

- 只传图片时能生成主视频轨 + 文本轨。
- 同时传图片/视频/音频时能生成三条轨道。
- 模板差异会反映在元素时长、转场和文本上。
- 没有视觉素材时返回错误。

### 命令测试

本次不强行上复杂 EditorCore 集成测试，先通过纯函数测试覆盖主要编排逻辑。

### 构建验证

- `bun test`
- `bun run lint:web`
- `bun run build:web`

## 风险与取舍

- 当前首版默认使用“全部素材”，没有素材选择器，适合快速草稿，不适合精细挑片。
- 音频素材顺序铺开是保守策略，不尝试自动 beat sync。
- 模板差异主要来自节奏、转场、文字和轻量动效，不做复杂视觉特效，避免超出当前编辑器能力边界。
