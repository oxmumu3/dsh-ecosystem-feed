# 维护者发布公开源

共享源目录与这个公共仓库分开。发布工具只读取 `feed.json`、其引用的 `days/YYYY-MM-DD.md` 和 `schema.md`，不会复制原目录的 README、订阅说明、回填记录或其他兄弟目录。

```sh
npm run sync -- --source /absolute/path/to/dsh-ecosystem-feed
npm test
npm run check
git diff -- feed.json days schema.md
git add -- feed.json days schema.md
git commit -m "data: refresh ecosystem feed"
git push origin main
```

命令参数是维护者本机的源目录，只留本机，不提交个人绝对路径。同步先验证数据与源文件稳定性，再更新公开文件；相同内容重复同步不改写文件。一次 Git 提交作为同一份公开快照，不强推、不改历史。

发布后用不含认证的 HTTP 请求回读正式仓库与 raw URL，核对内容哈希、更新时间和条数。公开归属必须是 `oxmumu3/dsh-ecosystem-feed`；本地提交完成不等于公网已更新。

供云端生产任务接入时，在成功写库后执行相同发布步骤，或向本人同一仓库提交等价的已验证公开文件。当前没有证据证明生产任务已执行这个步骤，因此发布模式仍是显式快照；不为填补此缺口另建抓取管道或读者投递后台。
