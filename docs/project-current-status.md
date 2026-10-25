# Paper Adventure 当前上线状态

更新：2026-10-25。本表是当前结论；被后续决定覆盖的过程记录保存在 project-control-history-through-20261024.md。

| 项目 | 当前状态 | 证据或下一动作 |
|---|---|---|
| 经营名称、地址、客服邮箱 | 已完成 | mileschen；已提供浙江台州地址；support@paperadventure.app |
| Terms/Privacy/Refund/Cookie | 已正式发布 | v4，2026-10-24 生效；PR #103；policy-formal-deployment.json |
| 固定标价、不额外收费 | 已部署 | PR #101；自动计税关闭；新订单金额必须与标价相等 |
| Stripe 账户和正式商品 | 用户已创建 | 四个正式价格 ID 已提供，不要求重新创建 |
| 正式密钥和 Webhook Secret | 已暂存 | 现有 STRIPE_LIVE_SECRET_KEY / STRIPE_LIVE_WEBHOOK_SECRET；不读取或输出值 |
| 固定价格的税务开通门槛 | 本轮代码已移除，待部署验收 | 不再要求 TAX_CONFIGURED，不增加新的法律前置条件 |
| 暂存正式密钥的运行选择 | 本轮代码已完成，待部署验收 | PAYMENT_CREDENTIAL_SOURCE=staged_live；保留原测试 Secret；缺值关闭结账 |
| 正式价格表 | 尚未接入线上 | live-price-map.json；在配置切换时接入并核验 Stripe 对象与权限 |
| 当前线上支付模式 | 最近验证为 test | 正式切换尚未执行，不能描述成已开启真实收款 |
| 后台操作入口 | 当前访问受阻 | 内置浏览器 Cloudflare 登录页，读取两次超时；非法律阻塞，不索取密钥 |

## 切换时仅需完成的动作

1. 使用既有暂存 Secret 选择 staged_live；启用四项已提供的正式价格映射，并核对 Price 读取权限。
2. 核对正式 Webhook 是否启用、地址和签名 Secret 匹配。
3. 协调 CHECKOUT_ENABLED、LIVE_PAYMENTS_ENABLED、LEGAL_RELEASED、TEST_CHECKOUT_ENABLED 和部署目标 live；不以单独改健康检查目标冒充成功。
4. 线上 GET 检查模式、政策和商品状态。真实购买由用户完成，不自动扣款、退款或调用 AI。

## 后续可选完善

Cookie/分析工具运行验收、素材来源台账、数据请求处理手册可另行推进；不把所有未完善事项都当作这次上线阻塞。正式政策不重复审批，已提交经营资料不重复索取。
