# SEO Metrics giải thích

## Inbound (in-degree)
Số trang trỏ link tới trang này. Càng cao → Google đánh giá trang càng quan trọng.
- Mục tiêu: mỗi URL có ≥ 2-3 inbound
- < 2 = weak, = 0 = orphan

## Outbound (out-degree)
Số link trang này trỏ ra. Quá cao (> 50) sẽ làm loãng link juice.
- Khuyến nghị: 3-10 internal link / bài 1000 từ

## Anchor diversity
Số anchor text khác nhau được dùng để link tới 1 target.
- ≥ 3 = healthy
- 1 = "anchor robotic" — dễ bị penalty

## Same-cluster ratio
Tỷ lệ link nằm trong cùng cluster ngữ nghĩa.
- > 80% = silo structure tốt
- < 50% = cấu trúc lộn xộn

## Density
`density = total_links / (n_urls × (n_urls - 1))`
Càng gần 1 = graph càng dày. Quá dày = spam linking.
- Healthy: 0.01 - 0.05 (1-5%)

## PageRank-like (in skill)
Inbound count + weighted by inbound từ trang có nhiều inbound.
- Top 10% = authority pages → nên link từ đó về trang cần boost

## Crawl depth
Số click tối thiểu từ homepage đến trang.
- ≤ 3 = Google crawl được hết
- > 5 = nguy cơ không index

## Generic anchor %
Tỷ lệ anchor "xem thêm", "tại đây", "click here".
- Mục tiêu < 20% (càng thấp càng tốt)
- > 30% = thiếu context SEO

## Orphan rate
`orphans / total_urls`
- 0% = tốt nhất
- < 5% = chấp nhận được
- > 10% = audit gấp

## Anchor over-optimization
Tỷ lệ 1 target nhận cùng 1 loại anchor (đặc biệt `exact`).
- > 50% = nguy cơ Google penalty
- Khuyến nghị: 10-20% exact, 30-40% partial, còn lại long-tail/branded
