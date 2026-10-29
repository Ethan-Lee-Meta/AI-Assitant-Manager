# 微信小游戏发布助手：已审查适配版

本目录收录一套可供 AI 编码助手执行的 **SKILL.md 工作流**，用于将有合法使用权的小游戏工程推进到微信开发版测试及后续审核准备。

## 上游来源（没有直接复制上游代码）

- 上游：<https://github.com/oscargzh/wechat-minigame-publisher-skill>
- 审阅基准提交：[`9eb9683b9901504586a6107e06998c467416502e`](https://github.com/oscargzh/wechat-minigame-publisher-skill/commit/9eb9683b9901504586a6107e06998c467416502e)（2026-10-29）。
- 上游仓库根目录在审查时**未发现独立 LICENSE 文件**；其部分混淆扩展内有 MIT LICENSE，但该许可不自动覆盖整个上游仓库。因此这里仅保存来源链接与独立编写的改造版工作流，不镜像上游 SKILL、附带扩展或 node_modules。
- 上游代码库包含已提交的 node_modules；不要把数千个第三方依赖拷进游戏仓库。

## 为什么需要改造

原版附有 Cocos 2.x/3.x 代码混淆扩展，并要求自动重写代码、故意插入不执行实际业务的“废代码”。这不是游戏原创性或性能优化的可靠做法，也可能提高维护和测试成本。

本版重点：
1. 默认不修改业务逻辑、不删除署名和版权声明。
2. 混淆是经确认后使用的可选步骤，绝不是小游戏发布前置要求。
3. 独立区分构建、本地测试、上传开发版、提审、正式发布的授权。
4. 发布限额、平台 API 和用户资料要求按发布当日的微信官方规则复核。
5. 支持两款设计阶段的游戏，未建工程时先生成技术需求与最小可玩原型计划。

## 使用说明

在能够读取本地工作区 Skills 的 AI 编码环境中，使其读取 `SKILL.md`，并提供待发布游戏仓库/工程路径。首次运行先做**只读检查**，根据报告选择修复任务，最后再考虑开发版上传。

本仓库中只是**文档型 Skill**；复制到 GitHub 不会自动安装到本机 Cocos、不会激活微信开发者工具、不会生成微信游戏 AppID，也不会开始上传。

## 现有游戏项目适配

见 [references/two-games.md](references/two-games.md)。当前保存的是发布工作流，不是《掌心乡野》或《拓印小铺》的正式源码与美术资源。

## 官方核对链接

- <https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/subpackage.html>
- <https://developers.weixin.qq.com/minigame/dev/guide/base-ability/code-package.html>
- <https://developers.weixin.qq.com/minigame/dev/guide/base-ability/subPackage/useSubPackage.html>

官方资料、后台规则与引擎版本均可能变化；以实际发布时微信平台有效要求为准。
