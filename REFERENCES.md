# 实现参考与边界

核对日：2026-11-03（America/Mexico_City）。依据作者原帖、仓库源码和实际公开响应，未运行第三方技能或发送消息。

## Zara Zhang：中心源与个人 Agent 分工

[Follow Builders 发布帖](https://x.com/zarazhangrui/status/2039368866741277074)与[作者仓库](https://github.com/zarazhangrui/follow-builders)提供直接参考：中心维护精选，用户 Agent 根据自己的语言、频率和风格组织内容，再利用已有渠道交付。本项目沿用这种供给与消费分工，并保留消费者偏好。

实际[订阅协议](https://github.com/zarazhangrui/follow-builders/blob/c0ef32e2dc67e2e4945a2548bc6dcadf0b7d0f61/SKILL.md)需要技能或脚本；交付脚本直接支持 Telegram、Email 和聊天输出，其他渠道依赖宿主。非持久环境的 cron 示例会直接发送原始 JSON，不能当作“任意 Agent 都能自动生成完整简报”的证据。本项目的纯 prompt 首报与去重需要自己验证。

## 向阳乔木：公开成果供多个消费端复用

[乔木 AI 资讯](https://airss.qiaomu.ai/)和[第一方 qmreader](https://github.com/joeseesun/qmreader)展示了公开内容服务与不同阅读端的分工。`rss.qiaomu.ai` 的来源目录和条目 GET API 本次实际返回成功；属于读取已有内容，不等于创建订阅或发送消息。文档中的资产 RSS 与机器目录本次返回 503，不作为可用入口交付。

[Lex 中文精读全文 RSS](https://lex.qiaomu.ai/feed.xml)与[机器目录](https://lex.qiaomu.ai/llms.txt)本次可读取，包含稳定链接、日期和正文入口。这支持把公开成果做成可直接消费的轻量源。没有核实乔木已提供“个人 Agent 定时按偏好重混并投递任意渠道”的完整方案。

## 本项目的取舍

借鉴公开、稳定且可复用的源，把个性化留给读者 Agent。当前只需要一份 JSON 和一段可复制的 prompt；插件与消息渠道保持可选。资料中的功能声明、端点可用、真实执行和收件结果分别判断。
