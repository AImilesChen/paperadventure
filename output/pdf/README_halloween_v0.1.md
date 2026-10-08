# 万圣节／秋日 H05/C05｜内部试玩包 v0.1

依据 `content/theme-design/halloween.md` 先定两个故事，再从 `content/theme-design/halloween-content-source-v0.1.md` 转为内部打印草稿。H05 是友好的纸质南瓜灯故事；C05 **目前只有中性秋日课堂措辞**，另有 Halloween 课堂措辞可由成人选择后派生和复核。两者属于同一世界，两个场景版本，不当作更多商品出售。

| 场景 | 玩家/组包 | 成人指南 |
| --- | --- | --- |
| 家庭 H05 A4 | [Player Pack](halloween-H05-player-v0.1-A4.pdf) | [Host Guide](halloween-H05-host-v0.1-A4.pdf) |
| 家庭 H05 US Letter | [Player Pack](halloween-H05-player-v0.1-Letter.pdf) | [Host Guide](halloween-H05-host-v0.1-Letter.pdf) |
| 课堂 C05 A4 | [Group Player Pack](halloween-C05-player-v0.1-A4.pdf) | [Teacher Guide](halloween-C05-teacher-v0.1-A4.pdf) |
| 课堂 C05 US Letter | [Group Player Pack](halloween-C05-player-v0.1-Letter.pdf) | [Teacher Guide](halloween-C05-teacher-v0.1-Letter.pdf) |

玩家包各 6 页，指南各 3 页。`scripts/generate_halloween_samples.py` 是卡片与答案的生成真源；更改内容源时必须同步改脚本、重生输出及哈希。`content/halloween-pdf-manifest.v0.1.json` 标记 `public: false`；`scripts/check_theme_samples.py halloween` 检查页数、纸张、哈希、答案隔离并渲染全部页面到 `tmp/pdfs/halloween-qa/`。

第二关 H05 有三格纸上庆典地图工作区，C05 有两格中性秋日路线工作区；配合独立路线条使用。它们是文字路线排布板，尚非完成的场景地图插画。H05 第五关另有四张可填写的纸质印记卡。

没有明火、真实灯、电路、惊吓或糖果依赖。**仍不能发布：**家庭/课堂真人试玩，A4/Letter 彩色与灰度实物打印，素材许可、英文文案、法律/税务/商品许可复核，以及课堂措辞变体的独立校验均未完成。
