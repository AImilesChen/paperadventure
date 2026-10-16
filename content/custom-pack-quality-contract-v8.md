# Custom pack quality contract v8

New creator-v3 orders and eligible same-order rebuilds snapshot `packQualityVersion: 11`. The paper layout remains version 4.

Quality version 11 preserves the quality-v10 closing and all previously checked story, checkpoint, game, PDF and storage gates. It corrects the no-charge closing refresh by normalising the four stored checkpoint result digits whether the database represents them as strings or numbers. A replacement cannot publish unless exactly four digits from 1 through 3 are present, and the ending in both PDFs must print that complete four-digit code.

Eligible quality-v10 deliveries receive a same-order closing/PDF refresh. The refresh reuses the saved story and five checked checkpoints, makes no provider call, creates no checkout and keeps the prior PDFs available until both replacement PDFs pass their checks.
