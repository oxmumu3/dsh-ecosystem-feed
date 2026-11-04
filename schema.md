# Schema

## feed.json

```json
{
  "name": "dsh-ecosystem-feed",
  "timezone": "Asia/Shanghai",
  "updated_at": "ISO-8601 with offset or Z",
  "latest_day": "YYYY-MM-DD",
  "days": ["YYYY-MM-DD"],
  "coverage": { "note": "…", "range": ["YYYY-MM-DD", "YYYY-MM-DD"], "item_count": 0 },
  "mvp": { "public_pull": true, "usage_examples": ["…"] },
  "items": [ /* 全部精选，新在前（按 status id 降序）；按日正文见 days/ */ ]
}
```

## item

```json
{
  "id": "2117754336331837901",
  "date": "2026-11-04",
  "url": "https://x.com/.../status/...",
  "title": "…",
  "why": "…",
  "tags": ["creator-mode", "practice"],
  "source_handle": "CryptoSarom"
}
```


`tags` 已知取值：official | creator-mode | practice | pain | overseas | creator | infra | narrative | finder | eval | plugin
（`eval`、`plugin` 为低频标签，各 1 条；消费方请按数据动态渲染，不要写死枚举。）

`date` 按帖子发布时间换算到 Asia/Shanghai。

## 约定

- `items` 按 `id`（X status id）降序，新在前；消费方仍建议自行按 `date` + `id` 排一次。
- `latest_day` 是精选最近更新到的那一天，**不等于**运行时的「今天」。
- 一条 item 可能聚合多条同主题链接，`url` 只保留主链接；完整链接见 `days/YYYY-MM-DD.md`。
- `days/` 是人读正文，条目数可与 `items` 不同；**以 `feed.json` 为准**。
