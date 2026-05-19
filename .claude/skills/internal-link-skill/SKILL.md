---
name: internal-link-skill
description: Phân tích nội dung website và đề xuất internal link để tối ưu SEO. Trích xuất từ khóa, tìm trang liên quan, gợi ý anchor text và vị trí chèn link. Sử dụng khi user yêu cầu tạo internal link, audit cấu trúc link nội bộ, hoặc tối ưu SEO on-page.
---

# Internal Link Skill

Skill này giúp tự động hóa quy trình tối ưu internal link cho website nhằm cải thiện SEO.

## Khi nào dùng skill này

Kích hoạt skill khi user yêu cầu:
- "Tạo internal link cho bài viết X"
- "Đề xuất link nội bộ"
- "Audit internal linking"
- "Tối ưu SEO on-page"
- "Phân tích anchor text"
- "Tìm các trang liên quan để link tới"

## Quy trình thực hiện

### Bước 1: Thu thập dữ liệu
1. Nhận URL hoặc nội dung bài viết nguồn từ user
2. Đọc danh sách các bài viết hiện có (từ sitemap, danh sách URL, hoặc database)
3. Tham khảo `references/seo-best-practices.md` để biết tiêu chuẩn

### Bước 2: Trích xuất từ khóa
1. Dùng `scripts/extract_keywords.py` để lấy keyword chính & phụ
2. Loại bỏ stopwords tiếng Việt (xem `references/vi-stopwords.txt`)
3. Sắp xếp theo độ quan trọng (TF-IDF hoặc tần suất xuất hiện)

### Bước 3: Tìm trang liên quan
1. So khớp keyword giữa bài nguồn và bài đích
2. Tính điểm relevance (0-100)
3. Lọc các bài có điểm >= 60

### Bước 4: Đề xuất anchor text & vị trí chèn
1. Tham khảo `templates/anchor-text-patterns.md` để chọn pattern phù hợp
2. Đề xuất 3-5 anchor text khác nhau cho mỗi link (tránh lặp)
3. Chỉ ra đoạn văn cụ thể nên chèn link
4. Ưu tiên anchor text tự nhiên, contextual

### Bước 5: Xuất output
1. Tạo file Markdown báo cáo (xem `examples/sample-output.md`)
2. Hoặc xuất Excel/CSV nếu user yêu cầu
3. Format: `Source Page | Target Page | Anchor Text | Position | Relevance Score`

## Quy tắc quan trọng

- **KHÔNG** đề xuất quá 5 internal link mới cho 1 bài viết (tránh over-optimization)
- **KHÔNG** dùng cùng 1 anchor text cho nhiều link khác nhau
- **LUÔN** kiểm tra link không bị broken trước khi đề xuất
- **TRÁNH** anchor text generic như "click here", "read more", "tại đây"
- **ƯU TIÊN** anchor text chứa keyword chính của trang đích

## Tài nguyên đi kèm

- `templates/` - Template anchor text, format báo cáo
- `references/` - Best practices SEO, stopwords tiếng Việt
- `scripts/` - Helper scripts Python để extract keyword, tính relevance
- `examples/` - Output mẫu để tham khảo

## Tích hợp với external API (tùy chọn)

Skill có thể kết hợp với:
- **Google Search Console API** - Lấy keyword đang ranking
- **Ahrefs/SEMrush API** - Phân tích backlink, keyword difficulty
- **OpenAI API** - Gợi ý anchor text tự nhiên hơn

Xem `scripts/api_integration.py` để biết cách dùng.
