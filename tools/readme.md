genuser.sh
快速、零依赖的用户名（账号前缀）生成器。输入「名 [中间名] 姓」格式的姓名列表，按指定的格式模板批量展开成用户名，常用于 AD 域账号枚举字典、UPN 前缀、系统账号命名规范校验等场景。
特性
单文件 Bash 脚本：无第三方依赖，Kali / Ubuntu / macOS 均可直接运行。
灵活的占位符系统：支持全名原样保留与首字母大小写控制。
开箱即用的字典处理：自动去重、重名序号、域名后缀拼接，一步产出可用字典。
管道友好：支持 stdin 输入，方便串联其他工具。
安装
```bash
chmod +x genuser.sh
```
用法
```bash
./genuser.sh -i <姓名文件> -f <格式串> [选项]
```
必选参数
参数	说明
`-i`, `--input FILE`	姓名文件，每行一个全名（`名 [中间名] 姓`），使用 `-` 表示从 stdin 读取
`-f`, `--format STR`	逗号分隔的格式串，例如 `'first.last,flast,lastf'`
可选参数
参数	说明
`-o`, `--output FILE`	输出文件（默认 stdout）
`-d`, `--domain STR`	为每个结果追加后缀，如 `@corp.local`
`-nd`, `--no-dup`	去重（保留首次出现顺序）
`-n`, `--number`	重名自动加序号 1、2、3…（需配合 `{n}` 占位符）
`-L`, `--lower`	全部转小写
`-q`, `--quiet`	静默模式（不输出进度与统计信息）
`-h`, `--help`	显示帮助信息
占位符
占位符	含义	示例（Alexa Whitehat）
`first`	名，保持原文大小写	`Alexa`
`last`	姓，保持原文大小写	`Whitehat`
`f`	名首字母小写	`a`
`F`	名首字母大写	`A`
`l`	姓首字母小写	`w`
`L`	姓首字母大写	`W`
`m`	中间名首字母小写	`m`
`M`	中间名首字母大写	`M`
`{n}`	重名序号占位（仅花括号写法生效）	`1`、`2`、`3`…
> 注意：裸写的 `first` / `last` 永远被识别为占位符，因此格式串中无法直接输出字面单词 first 或 last；需要字面内容时请改用其他字符组合。
示例
1. 基础：生成常见 AD 用户名组合
```bash
./genuser.sh -i names.txt \
  -f 'first.last,f.last,flast,lastf,last.f,firstlast,first_last,first-last,fmlast,firstl,lastfirst' \
  -o ad_usernames.txt -nd -L
```
2. 处理带中间名的姓名
输入 `names.txt`：
```text
Alexa Whitehat
Jack Goldenhand
Jane M. Lee
Michael O'Brien
```
输出（`-L -nd`）：
```text
alexa.whitehat
a.whitehat
awhitehat
whitehata
whitehat.a
alexawhitehat
alexa_whitehat
alexa-whitehat
jmlee
j.m.lee
whitehatjmlee
...
```
3. 重名自动加序号
注意 `firstlast1` 中的 `1` 是字面量，会让所有人末尾都带 1。正确做法：
```bash
./genuser.sh -i names.txt -f 'flast,firstlast{n}' -n -nd -L
```
结果：`awhitehat`、`alexawhitehat1`、`jackgoldenhand1`…
4. 拼接域名（直接出 UPN）
```bash
./genuser.sh -i names.txt -f 'flast,first.last' -d '@corp.local' -nd -L > upns.txt
```
5. 管道串联
```bash
cat names.txt | ./genuser.sh -i - -f 'flast,first.last' -L -nd -q | sort -u > dict.txt
```
6. 保留原名大小写
去掉 `-L` 即可得到 `Alexa.Whitehat`、`A.Whitehat` 这类形式：
```bash
./genuser.sh -i names.txt -f 'First.Last,F.Last,FLAST' -o mixed.txt -nd
```
输入文件格式
每行一个全名，字段以空格分隔：第一个词为名，最后一个词为姓，中间部分视为中间名。
空行与 `#` 开头的注释行会被自动忽略。
含连字符或撇号的姓氏（如 `O'Brien`、`Smith-Jones`）会原样保留，建议配合 `-L` 统一小写。

常见问题
Q：为什么输出里出现了字面的 `f` 或 `l`？

A：检查格式串中是否误用了脚本不认识的占位符。本脚本只认上表列出的关键字，其余字符一律原样输出。

Q：去重后行数比预期少？

A：不同格式对同一姓名可能产生相同结果（如 `flast` 与 `firstl` 在单字母名时重合），`-nd` 会将其合并，这是正常现象。

Q：中文姓名能用吗？

A：脚本按空格分词，中文姓名无空格时会被整体当作「名」，姓为空，导致输出不符合预期。建议先整理为 `名 姓` 的两段式格式。

与 fmfug 的关系
本脚本的格式串语法参考了 `fmfug` 的风格，弥补了其在单字母占位符（首字母大小写）上的不足。两者可以配合使用：用 fmfug 生成基础全名组合，再用本脚本补充首字母变体。

本脚本仅提供字符串变换功能，适用于账号命名规范梳理、字典生成、CTF 与授权渗透测试等场景。请在合法授权的前提下使用，未经授权使用他人账号字典进行枚举属于违法行为。
