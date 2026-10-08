# 万圣节／秋日 H05/C05｜内部试玩包 v0.1

依据 `content/theme-design/halloween.md` 先定两个故事，再从 `content/theme-design/halloween-content-source-v0.1.md` 转为内部打印草稿。H05 是友好的纸质南瓜灯故事；C05 有中性 Autumn 和成人主动选择的 Halloween/Pumpkin 两套课堂措辞内部稿。两种表达属于同一场景，不新增世界或额外商品。

| 场景 | 玩家/组包 | 成人指南 |
| --- | --- | --- |
| 家庭 H05 A4 | [Player Pack](halloween-H05-player-v0.1-A4.pdf) | [Host Guide](halloween-H05-host-v0.1-A4.pdf) |
| 家庭 H05 US Letter | [Player Pack](halloween-H05-player-v0.1-Letter.pdf) | [Host Guide](halloween-H05-host-v0.1-Letter.pdf) |
| 课堂 C05 A4 | [Group Player Pack](halloween-C05-player-v0.1-A4.pdf) | [Teacher Guide](halloween-C05-teacher-v0.1-A4.pdf) |
| 课堂 C05 US Letter | [Group Player Pack](halloween-C05-player-v0.1-Letter.pdf) | [Teacher Guide](halloween-C05-teacher-v0.1-Letter.pdf) |
| 课堂 C05 Halloween A4 | [Group Player Pack](variants/halloween-C05-halloween-player-v0.1-A4.pdf) | [Teacher Guide](variants/halloween-C05-halloween-teacher-v0.1-A4.pdf) |
| 课堂 C05 Halloween US Letter | [Group Player Pack](variants/halloween-C05-halloween-player-v0.1-Letter.pdf) | [Teacher Guide](variants/halloween-C05-halloween-teacher-v0.1-Letter.pdf) |

玩家包各 6 页，指南各 3 页。`scripts/generate_halloween_samples.py` 是卡片与答案的生成真源；更改内容源时必须同步改脚本、重生输出及哈希。基本包及措辞版分别有 `content/halloween-pdf-manifest.v0.1.json` 和 `content/halloween-classroom-halloween-pdf-manifest.v0.1.json`，均标记 `public: false`。`scripts/check_theme_samples.py halloween` 与 `scripts/check_classroom_variants.py` 检查页数、纸张、哈希、答案隔离和两版相同解，并从当前文件重渲染页面。

第一关 H05/C05 各有四张图文邀请候选卡，H05 比对狐狸/猫头鹰封印、星数和日/月邮戳，C05 比对无刻脸纸南瓜/月亮图案、旗帜数与圆/方框；所有图形旁有文字标签。第二关 H05 有六个未连线地点的纸地图，C05 中性秋日和教师选择的 Halloween 措辞稿各有五个相同地点的纸地图；配合独立混序路线条，在地图上画线并在下方写路线顺序。图上不预连正确路径，路线的终点和成果由纸条决定；地图仍是内部简化纸图，未经过儿童试玩或实物打印。H05 第五关另有四张可填写的纸质印记卡。成人/教师指南第 2 页各有独立纸质结局卡，只在最终答案确认后分享，玩家包不含结局卡。

没有明火、真实灯、电路、惊吓或糖果依赖。**仍不能发布：**家庭/课堂真人试玩，包括两套课堂措辞分别试用；A4/Letter 彩色与灰度实物打印；素材许可、英文文案及法律/税务/商品许可复核。变体的自动答案和版式校验已通过，不能代替课堂理解与舒适度测试。
