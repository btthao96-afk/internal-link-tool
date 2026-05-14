# Internal Link SEO Tool - Complete Setup Guide

Công cụ tự động tạo internal link suggestions để tối ưu SEO của website. Bao gồm cả local tool và web application đa người dùng.

## 🎯 Tính năng

### Local Tool
✅ **Website Crawler** - Quét toàn bộ website
✅ **Keyword Extraction** - Trích xuất từ khóa từ nội dung
✅ **Relevance Engine** - Tìm các trang liên quan
✅ **Smart Suggestions** - Gợi ý vị trí link & anchor text
✅ **Dashboard** - Giao diện duyệt và approve suggestions
✅ **Analytics** - Thống kê chi tiết

### Web Application
✅ **Multi-user Support** - Hỗ trợ nhiều người dùng
✅ **User Authentication** - Đăng ký, đăng nhập, JWT tokens
✅ **Project Management** - Quản lý projects riêng biệt
✅ **Real-time Dashboard** - Dashboard với thống kê
✅ **Responsive UI** - Giao diện responsive với React + Tailwind
✅ **API Backend** - RESTful API với Express.js
✅ **Online Deployment** - Deploy lên Vercel/Netlify

---

## 🌐 Online Deployment

### Quick Deploy (Khuyến nghị)

```bash
# 1. Cài đặt Vercel CLI
npm install -g vercel
vercel login

# 2. Chạy script deploy tự động
./deploy.sh
```

### Manual Deploy

```bash
# Backend
cd web-app/backend
vercel --prod

# Frontend
cd ../frontend
vercel --prod
```

### Chi tiết: Xem [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📋 Prerequisites

- **Node.js** (v16+)
- **PostgreSQL** (v12+) hoặc sử dụng SQLite
- **npm** hoặc **yarn**

---

## 🚀 Quick Start

### 1. Setup Database (PostgreSQL)

Cả Local Tool và Web App đều dùng PostgreSQL nhưng **2 schema khác nhau** (Web App có thêm bảng users, sessions, projects vì multi-user).

```bash
# Cài PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Tạo database
createdb internal_link_tool

# Verify connection
psql -d internal_link_tool -c "SELECT version();"
```

**Chạy schema cho Local Tool:**
```bash
psql -d internal_link_tool -f backend/src/db/schema.sql
```
> Tạo 7 bảng: `pages`, `keywords`, `relationships`, `suggestions`, `implemented_links`, `crawl_sessions`, `analytics`.

**HOẶC chạy schema cho Web App (multi-user):**
```bash
psql -d internal_link_tool -f web-app/backend/src/config/schema.sql
```
> Tạo 11 bảng: bao gồm `users`, `user_sessions`, `projects` cộng với các bảng của Local Tool (có thêm `project_id` để phân biệt theo user).
>
> Schema này cũng seed sẵn 1 admin user: `admin@internallinktool.com` / `admin123`.

**Verify schema:**
```bash
psql -d internal_link_tool -c "\dt"
# Hoặc xem 1 bảng cụ thể:
psql -d internal_link_tool -c "\d users"
```

> ⚠️ Đừng chạy cả 2 schema cùng lúc lên cùng 1 database — chọn 1 trong 2 tuỳ bạn dùng Local Tool hay Web App.

### 2. Setup Backend API (Web App)

```bash
cd web-app/backend

# Tạo .env file
cp .env.example .env

# Sửa DATABASE_URL trong .env
# DATABASE_URL=postgresql://user:password@localhost:5432/internal_link_tool
# JWT_SECRET=your-secret-key-here
# JWT_REFRESH_SECRET=your-refresh-secret-here

# Cài dependencies
npm install

# Chạy database migrations
npm run db:setup

# Start API server
npm start

# API server sẽ chạy tại http://localhost:5000
```

### 3. Setup React Frontend (Web App)

```bash
cd web-app/frontend

# Cài dependencies
npm install

# Start React app
npm start

# Frontend sẽ chạy tại http://localhost:3000
```

### 4. Setup Local Tool (Optional)

```bash
cd backend

# Tạo .env file
cp .env.example .env

# Sửa DATABASE_URL trong .env
# DATABASE_URL=postgresql://user:password@localhost:5432/internal_link_tool

# Cài dependencies
npm install

# Start server
npm start

# Server sẽ chạy tại http://localhost:3001
```

### 5. Setup Frontend Dashboard (Local Tool)

```bash
cd dashboard

# Cài dependencies
npm install

# Start dashboard
npm start

# Dashboard sẽ mở tại http://localhost:3000
```

### 6. Run Local Tool Workflow

Trong một terminal mới:

```bash
cd backend

# Chạy toàn bộ workflow
node scripts/workflow.js https://example.com 50

# Các bước sẽ chạy tự động:
# 1. Crawl website (50 pages)
# 2. Extract keywords
# 3. Build page relationships
# 4. Generate suggestions
```

---

## 📂 Project Structure

Repo có **2 phần độc lập**: Local Tool (single-user, CLI workflow) và Web App (multi-user, có auth + database).

```
internal-link-tool/
│
├── 🅰️  LOCAL TOOL (single-user, chạy local)
│   │
│   ├── backend/                 # Backend — Express API + core logic
│   │   ├── src/
│   │   │   ├── config/         # Database connection + constants
│   │   │   │   ├── database.js
│   │   │   │   └── constants.js
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── crawler.js          # Quét website
│   │   │   │   ├── nlp.js              # Tokenize + TF-IDF (hỗ trợ tiếng Việt)
│   │   │   │   ├── relevanceEngine.js  # Tính độ liên quan
│   │   │   │   └── suggestionGenerator.js
│   │   │   ├── db/             # PostgreSQL
│   │   │   │   ├── schema.sql          # 7 bảng: pages, keywords, ...
│   │   │   │   └── queries.js
│   │   │   └── routes/api.js   # REST endpoints (port 3001)
│   │   ├── scripts/workflow.js # CLI: crawl → NLP → suggestions
│   │   ├── server.js           # Express bootstrap
│   │   ├── .env.example        # Cần copy → .env và sửa DATABASE_URL
│   │   └── package.json
│   │
│   └── dashboard/              # Frontend — React (port 3000)
│       ├── src/
│       │   ├── App.js
│       │   └── components/
│       └── package.json
│
├── 🅱️  WEB APP (multi-user, có auth + projects)
│   │
│   └── web-app/
│       ├── backend/            # Backend — Express + JWT auth (port 5000)
│       │   ├── src/
│       │   │   ├── auth/authService.js     # bcrypt + JWT
│       │   │   ├── middleware/auth.js      # Bảo vệ route
│       │   │   ├── routes/
│       │   │   │   ├── auth.js             # /api/auth (login, register)
│       │   │   │   └── projects.js         # /api/projects CRUD
│       │   │   ├── db/projectQueries.js
│       │   │   ├── config/schema.sql       # 11 bảng: users, projects, ...
│       │   │   ├── models/index.js
│       │   │   └── services/crawler.js
│       │   ├── server.js
│       │   ├── .env.example                # DATABASE_URL + JWT_SECRET
│       │   ├── Dockerfile                  # Container deploy
│       │   ├── vercel.json                 # Vercel serverless config
│       │   └── package.json
│       │
│       └── frontend/           # Frontend — React + Tailwind (port 3000)
│           ├── src/
│           │   ├── App.js
│           │   ├── components/InternalLinkSeoTool.js   # Tool chính (live)
│           │   ├── context/AuthContext.js
│           │   └── pages/                  # Login, Register, Dashboard, ...
│           ├── public/
│           ├── tailwind.config.js
│           └── package.json
│
├── docs/
│   └── chat-history.md         # Lịch sử phát triển tool
│
├── DEPLOYMENT.md               # Hướng dẫn deploy production
├── deploy.sh                   # Script deploy 1 lệnh
└── README.md                   # (file này)
```

### 🌳 Branches

| Branch | Nội dung | Dùng cho |
|---|---|---|
| `main` | Full source code (BE + FE + database schema) | Phát triển, clone về để chạy local |
| `gh-pages` | Chỉ chứa build static (HTML/CSS/JS đã compile) của `web-app/frontend` | GitHub Pages auto serve tại https://btthao96-afk.github.io/internal-link-tool/ |

→ **Khi review code, luôn xem branch `main`**, không phải `gh-pages`.

---

## 🔌 API Endpoints

### Crawler

**POST** `/api/start` - Start crawling
```json
{
  "url": "https://example.com",
  "maxPages": 100
}
```

**GET** `/api/status` - Get crawling status

### Analysis

**POST** `/api/process` - Process NLP for all pages

**POST** `/api/relationships` - Build relationship graph

**POST** `/api/generate-suggestions` - Generate link suggestions

### Suggestions

**GET** `/api/pending?limit=50` - Get pending suggestions

**POST** `/api/suggestions/:id/approve` - Approve suggestion

**POST** `/api/suggestions/:id/reject` - Reject suggestion

### Pages

**GET** `/api/all` - Get all pages

**GET** `/api/page/:id` - Get page details

**GET** `/api/stats` - Get statistics

---

## 🎮 Usage Examples

### 1. Crawl Website

```bash
cd backend
node scripts/workflow.js https://myblog.com 100
```

### 2. Via API

```bash
# Start crawl
curl -X POST http://localhost:3001/api/start \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 50}'

# Process NLP
curl -X POST http://localhost:3001/api/process

# Build relationships
curl -X POST http://localhost:3001/api/relationships

# Generate suggestions
curl -X POST http://localhost:3001/api/generate-suggestions

# Get suggestions
curl http://localhost:3001/api/pending?limit=50

# Approve suggestion
curl -X POST http://localhost:3001/api/suggestions/123/approve \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Dashboard

1. Mở http://localhost:3000
2. Xem statistics
3. Nhấn vào "Suggestions" tab
4. Review & approve/reject suggestions

---

## ⚙️ Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/internal_link_tool

# Server
PORT=3001
NODE_ENV=development

# Crawler
CRAWLER_MAX_PAGES=100
CRAWLER_TIMEOUT=10000

# Analysis
RELEVANCE_THRESHOLD=70
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## 🧠 How It Works

### Phase 1: Crawling
- Quét các trang từ URL gốc
- Trích xuất title, H1, meta description, nội dung
- Lưu vào database

### Phase 2: NLP Analysis
- Tokenize nội dung
- Remove stopwords
- Extract keywords
- Tính TF-IDF scores

### Phase 3: Build Relationships
- So sánh keywords giữa các trang
- Tính semantic similarity
- Tìm pages liên quan nhất (relevance score > 70%)

### Phase 4: Generate Suggestions
- Cho mỗi trang, tìm các pages cần link tới
- Tạo anchor text tự nhiên
- Xác định vị trí link tối ưu
- Lưu suggestions với score

### Phase 5: Dashboard Review
- Xem pending suggestions
- Approve hoặc reject
- Export hoặc implement

---

## 🔍 Database Schema

### Tables

- **pages**: Các trang crawled
- **keywords**: Keywords trích xuất từ pages
- **relationships**: Mối quan hệ giữa pages
- **suggestions**: Link suggestions
- **implemented_links**: Audit trail
- **crawl_sessions**: Lịch sử crawl

---

## 📊 Sample Output

```
=============================================================
INTERNAL LINK TOOL - WORKFLOW
=============================================================

📍 STEP 1: Crawling website...
[1/50] Crawling: https://example.com
[2/50] Crawling: https://example.com/about
...
✅ Crawled 50 pages

📍 STEP 2: Processing NLP and extracting keywords...
✅ NLP processing complete

📍 STEP 3: Building page relationship graph...
✅ Relationship graph built

📍 STEP 4: Generating internal link suggestions...
✅ Suggestions generated

=============================================================
WORKFLOW COMPLETE! 🎉
=============================================================

Summary:
- Pages crawled: 50
- Pages analyzed: 50
- Keywords extracted: 892
- Relationships found: 2341
- Suggestions created: 187
```

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: 
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL đúng trong .env

### Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Solution**:
```bash
# Tìm process đang dùng port
lsof -i :3001

# Hoặc dùng port khác
PORT=3002 npm start
```

### No Suggestions Generated
**Solution**:
- Kiểm tra crawl hoàn thành (>= 10 pages)
- Tăng RELEVANCE_THRESHOLD trong constants
- Kiểm tra database có data

---

## 🚀 Next Steps

1. **Customize NLP** - Thêm domain-specific stopwords
2. **Implement Links** - Tích hợp CMS API
3. **Advanced Analytics** - Thêm A/B testing
4. **Mobile Optimization** - Responsive dashboard
5. **Batch Processing** - Crawl multiple websites

---

## 📝 License

MIT

---

## 🤝 Support

Nếu bạn gặp vấn đề hoặc có đề xuất, vui lòng tạo issue.

Happy linking! 🔗
