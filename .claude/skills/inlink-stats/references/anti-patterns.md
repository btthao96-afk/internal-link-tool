# Anti-patterns — Cấu trúc inlink xấu

Skill này tự phát hiện 6 anti-pattern phổ biến.

## 1. Over-optimization target 🚨
**Định nghĩa:** 1 target nhận > 50% anchor cùng loại `exact`.
**Tại sao xấu:** Google đọc thấy nhiều backlink với cùng 1 keyword exact → đánh giá "manipulative SEO" → penalty.
**Fix:** Pha trộn anchor — 1-2 exact, còn lại partial/long-tail/branded.

## 2. Confused anchors 🚨
**Định nghĩa:** 1 anchor text exact trỏ tới > 1 target khác nhau.
**Ví dụ:** anchor `"camera iphone 18"` link sang cả `/iphone-18-camera` và `/iphone-18-zoom`.
**Tại sao xấu:** Google không hiểu trang nào mới là "trang chính" về keyword đó → ranking yếu cho cả 2.
**Fix:** 1 anchor exact → 1 target duy nhất. Các target khác dùng partial/long-tail.

## 3. Self-link 🚨
**Định nghĩa:** source == target (link tới chính mình).
**Tại sao xấu:** Vô nghĩa, lãng phí slot link, có thể là bug code.
**Fix:** Skip self-link ở bước allocation.

## 4. Duplicate pairs 🚨
**Định nghĩa:** Cùng cặp (source, target) xuất hiện > 1 lần.
**Tại sao xấu:** 2 link từ A → B chỉ tính như 1 từ góc nhìn Google + làm rối trải nghiệm user.
**Fix:** Dedupe trước khi xuất output.

## 5. Generic anchor quá nhiều ⚠️
**Định nghĩa:** > 20% anchor là "xem thêm", "tại đây", "click here".
**Tại sao xấu:** Mất cơ hội truyền keyword signal, user cũng không biết click vào sẽ đi đâu.
**Fix:** Thay bằng anchor mô tả: "xem thêm về camera iPhone 18" thay vì "xem thêm".

## 6. Long link chains ⚠️
**Định nghĩa:** Chuỗi A → B → C → D → E (≥ 4 hops) trong graph.
**Tại sao xấu:** Google crawl tốn budget, user phải click nhiều lần. Authority phân tán quá rộng.
**Fix:** Rút ngắn chain — trang authority nên link trực tiếp tới end của chain.

## Bonus: Orphan 🚨
**Định nghĩa:** URL có inbound = 0.
**Tại sao xấu:** Google khó tìm thấy, không có link juice.
**Fix:** Tìm 2-3 trang liên quan và thêm link về orphan đó.

---

## Severity matrix

| Anti-pattern | Severity | Tần suất gặp |
|---|---|---|
| Self-link | 🔴 Critical (bug) | Hiếm |
| Duplicate | 🔴 Critical (bug) | Hiếm |
| Over-optimization | 🔴 High | Phổ biến |
| Confused anchors | 🟠 Medium-High | Phổ biến |
| Orphan | 🟠 Medium-High | Rất phổ biến |
| Generic > 20% | 🟡 Medium | Rất phổ biến |
| Long chains | 🟡 Medium | Phổ biến với site lớn |
