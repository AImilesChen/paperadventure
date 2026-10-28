# First-visit discovery and free-game delivery

The homepage prioritises a complete free game, with theme browsing secondary and an existing, quieter AI creation link. Existing real Celebration player-page excerpts illustrate the download. The free Home and Classroom pages put paper selection and the complete ZIP before preparation instructions. Individual PDFs remain available. Public product pages show the current catalog price and purchase action before detailed facts and retain the full story/material sections.

## Public conversion goals

Configure these exact names in the existing ShipSolo/Plausible site report for paperadventure.app:

| Event | Meaning | Allowed properties |
| --- | --- | --- |
| `home_sample_click` | Homepage link to a specific free edition clicked | `setting`: home/classroom |
| `sample_download_success` | Both sample PDFs validated, ZIP built, browser download initiated | `setting`, `paper`: A4/Letter |
| `sample_browse_themes` | Free-game page link to the corresponding paid catalog clicked | `setting` |
| `product_checkout_click` | Public ready-made product purchase link clicked | `setting`, public catalog `theme` |

The download goal does not confirm disk saving, opening, printing or playing. Individual PDFs are not a complete-pack conversion. An in-flight request blocks duplicate clicks; repeat successful downloads of the same edition/paper in one mounted view emit once. Failed, aborted, HTML or malformed PDF responses emit no success. Changing editions cancels the previous request.

The manual Plausible queue is installed before the existing async tracker. Only these bounded conversions enter basic measurement, subject to its independent opt-out and canonical public-route/referrer rules. Existing GA4/Clarity tracking still requires enhanced consent. No free text, identity, order reference, private checkout URL or customer data enters conversion properties. Link actions are observed in capture phase before routing to preserve their public source context. Measurement failure cannot prevent navigation or delivery.

## Validation and interpretation

Verify desktop and narrow screens, paper/edition changes, paired ZIP contents, independent PDFs, failed-download retry and product links. Use isolated fixtures for failure and private flows. Production verification may download the public free game and inspect aggregate goal counts; it must not create a checkout, charge, refund, support request, email or AI job.

Review real download and purchase-entry actions by source and date. A purchase-entry event is not a paid order. New interactive goals can change measured bounce rate; annotate the release and do not treat a lower post-release rate by itself as proof of improved engagement. Historical goals are not backfilled. Retain the pre-release 32–35-visit sample as a limited baseline.
