# Anchor Types

4 loại anchor được hỗ trợ trong `anchors.csv`:

## 1. `exact`
- Trùng 100% với keyword chính của trang đích
- **Ví dụ**: target keyword "camera iphone 18" → anchor "camera iphone 18"
- Dùng dè dặt (10-20% tổng), dễ bị Google đánh giá over-optimization nếu lạm dụng

## 2. `partial`
- Chứa keyword chính + từ phụ
- **Ví dụ**: "hướng dẫn chọn camera iphone 18 tốt nhất"
- Loại an toàn nhất, nên chiếm 30-40% tổng số anchor

## 3. `branded`
- Chứa tên thương hiệu
- **Ví dụ**: "Nội thất The One — bàn làm việc đẹp"
- Dùng 10-20%, tăng trust và brand awareness

## 4. `generic`
- Anchor chung chung không chứa keyword
- **Ví dụ**: "xem chi tiết", "tìm hiểu thêm", "tại đây"
- Chỉ dùng tối đa 10%, ưu tiên placement ở footer hoặc CTA cuối bài

## 5. `long-tail` (bonus)
- Cụm 5-8 từ tự nhiên chứa keyword
- **Ví dụ**: "cách lắp đặt camera iphone 18 tại nhà siêu dễ"
- Tốt cho SEO long-tail traffic, 10-20%

## Quy tắc phân bổ trong skill này

- Tổng `ratio` trong `anchors.csv` PHẢI = 100 (skill cảnh báo nếu khác)
- 1 target không nhận quá 50% anchor cùng loại `exact`
- 1 cặp `(source, target)` chỉ có 1 anchor duy nhất
- Anchor có token trùng với `main_keyword` của target được ưu tiên matching

## Mẫu phân bổ khuyến nghị

```csv
anchor,ratio,type
keyword chính,15,exact
hướng dẫn keyword chính,20,partial
cách dùng keyword chính hiệu quả,15,long-tail
brand x keyword chính,10,branded
tin tức keyword chính,15,partial
review keyword chính 2026,10,long-tail
xem chi tiết,5,generic
tìm hiểu thêm,5,generic
keyword phụ liên quan,5,partial
```
