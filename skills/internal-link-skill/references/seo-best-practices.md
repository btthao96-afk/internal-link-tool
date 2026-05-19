# Internal Linking SEO Best Practices

## 1. Nguyên tắc cơ bản

### 1.1 Cấu trúc Pyramid (Silo)
- Homepage → Category pages → Subcategory → Article pages
- Mỗi article nên link về category cha và 2-3 article cùng silo

### 1.2 Số lượng link hợp lý
- Bài 500-1000 từ: 2-3 internal link
- Bài 1000-2000 từ: 3-5 internal link
- Bài 2000+ từ: 5-10 internal link
- **Không vượt quá 100 link tổng (cả internal + external)** trong 1 trang

### 1.3 Crawl depth
- Mọi trang quan trọng phải cách homepage ≤ 3 click
- Bài "orphan" (không có link tới) cần được phát hiện và sửa ngay

## 2. Quy tắc về anchor text

| Quy tắc | Mô tả |
|---------|-------|
| Đa dạng hóa | Mỗi trang đích nên có ≥ 3 anchor text khác nhau |
| Tự nhiên | Anchor phải fit context, không gượng ép |
| Mô tả rõ | User đọc anchor phải biết trang đích nói gì |
| Tránh keyword stuffing | Không lặp exact match keyword quá nhiều |

## 3. Link Equity (Sức mạnh link)

- Link đầu tiên trong trang có trọng số cao nhất
- Link trong nội dung chính > link trong footer/sidebar
- Link contextual (giữa đoạn văn) > link cuối bài

## 4. Technical Requirements

- ✅ Dùng `<a href>` thuần (không phải JS click handler)
- ✅ URL tuyệt đối hoặc tương đối nhất quán
- ✅ Không dùng `rel="nofollow"` cho internal link (trừ login, admin)
- ✅ Sử dụng URL canonical
- ❌ Tránh redirect chains (A→B→C)
- ❌ Tránh link tới trang 404

## 5. Đo lường hiệu quả

### KPIs cần theo dõi:
- **Crawl rate** - Tần suất Google crawl các trang
- **Pages per session** - User đi qua bao nhiêu trang
- **Average position** - Vị trí ranking trên Google
- **CTR internal link** - Tỷ lệ click vào internal link

### Công cụ:
- Google Search Console
- Google Analytics 4
- Screaming Frog SEO Spider
- Ahrefs Site Audit

## 6. Các sai lầm phổ biến

1. **Over-optimization**: Nhồi nhét quá nhiều internal link
2. **Anchor text giống nhau**: Bị penalty
3. **Link tới trang không liên quan**: User bounce cao
4. **Bỏ qua mobile**: Link quá gần nhau khó tap trên mobile
5. **Không update khi xóa bài**: Để lại broken link
