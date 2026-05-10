# 🚀 Internal Link SEO Tool - Online Deployment Guide

Hướng dẫn đầy đủ để deploy Internal Link SEO Tool lên môi trường online.

## 📋 Tổng quan Deployment

Tool sẽ được deploy thành 3 phần:
1. **Backend API** (Express.js) - Xử lý logic và database
2. **Frontend** (React) - Giao diện người dùng
3. **Database** (PostgreSQL) - Lưu trữ dữ liệu

## 🎯 Platform Khuyến nghị

### **Vercel** (Free & Recommended)
- ✅ Free tier đủ cho small projects
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy deployment
- ✅ Built-in analytics

### Alternative Platforms
- **Railway** - Full-stack deployment
- **Heroku** - Traditional but paid
- **Netlify** - Frontend only
- **DigitalOcean** - VPS hosting

---

## 🚀 Quick Deploy với Vercel

### Bước 1: Chuẩn bị

1. **Tạo tài khoản Vercel:**
   - Đăng ký tại [vercel.com](https://vercel.com)
   - Connect GitHub account

2. **Cài đặt Vercel CLI:**
```bash
npm install -g vercel
vercel login
```

3. **Tạo PostgreSQL database:**
   - Sử dụng [Supabase](https://supabase.com) (free tier)
   - Hoặc [ElephantSQL](https://www.elephantsql.com)
   - Hoặc Railway PostgreSQL

### Bước 2: Deploy tự động

```bash
# Chạy script deploy tự động
./deploy.sh
```

Script sẽ:
- Deploy backend API
- Deploy frontend
- Cấu hình environment variables
- Hiển thị URLs

### Bước 3: Cấu hình Database

1. **Tạo database tables:**
   - Copy SQL từ `web-app/backend/README.md`
   - Run trong database console

2. **Set environment variables trong Vercel:**
   ```bash
   # Backend environment variables
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add JWT_REFRESH_SECRET
   vercel env add FRONTEND_URL
   ```

---

## 🔧 Manual Deployment

### Backend Deployment

1. **Deploy to Vercel:**
```bash
cd web-app/backend
vercel --prod
```

2. **Set Environment Variables:**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add FRONTEND_URL
```

3. **Update CORS:**
- Edit `server.js` to allow your frontend domain
- Redeploy backend

### Frontend Deployment

1. **Deploy to Vercel:**
```bash
cd web-app/frontend
vercel --prod
```

2. **Set API URL:**
```bash
vercel env add REACT_APP_API_URL
# Enter your backend URL: https://your-backend.vercel.app/api
```

### Database Setup

1. **Create PostgreSQL database** trên Supabase/ElephantSQL

2. **Run schema SQL:**
```sql
-- Copy từ web-app/backend/README.md
CREATE TABLE users (...);
CREATE TABLE projects (...);
-- etc.
```

3. **Test connection:**
- Update DATABASE_URL trong Vercel
- Check backend logs

---

## ⚙️ Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend.vercel.app/api
REACT_APP_NAME=Internal Link SEO Tool
```

---

## 🧪 Testing sau khi Deploy

### 1. Health Check
```
GET https://your-backend.vercel.app/health
```

### 2. User Registration
- Truy cập frontend URL
- Đăng ký tài khoản mới
- Kiểm tra database

### 3. Create Project
- Tạo project mới
- Test crawling functionality
- Verify data storage

### 4. Full Workflow
- Crawl website
- Generate suggestions
- Review và approve links

---

## 🔒 Security Setup

### 1. JWT Secrets
```bash
# Generate secure random strings
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

### 2. Database Security
- Không sử dụng default credentials
- Enable SSL connections
- Set up database backups

### 3. CORS Configuration
```javascript
// server.js
const corsOptions = {
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
};
```

---

## 🌐 Custom Domain (Optional)

### Vercel Custom Domain
1. Go to Vercel dashboard
2. Project Settings > Domains
3. Add your domain
4. Configure DNS records

### DNS Configuration
```
Type: CNAME
Name: www (or @)
Value: your-project.vercel.app
```

---

## 📊 Monitoring & Analytics

### Vercel Analytics
- Built-in performance monitoring
- Real user monitoring
- Error tracking

### Additional Tools
- **Sentry** - Error monitoring
- **LogRocket** - Session replay
- **Google Analytics** - User behavior

---

## 🐛 Troubleshooting

### Common Issues:

1. **API Calls Failing**
   ```
   Solution: Check REACT_APP_API_URL and CORS settings
   ```

2. **Database Connection**
   ```
   Solution: Verify DATABASE_URL format and credentials
   ```

3. **Build Failures**
   ```
   Solution: Check Node.js version and dependencies
   ```

4. **CORS Errors**
   ```
   Solution: Update FRONTEND_URL in backend environment
   ```

### Debug Steps:
1. Check Vercel function logs
2. Test API endpoints with Postman
3. Verify environment variables
4. Check browser network tab

---

## 💰 Cost Estimation

### Free Tier (Vercel + Supabase)
- **Backend**: 100GB bandwidth/month
- **Frontend**: Unlimited bandwidth
- **Database**: 500MB storage
- **Cost**: $0/month

### Paid Upgrades (nếu cần)
- **Supabase Pro**: $25/month (2GB storage)
- **Vercel Pro**: $20/month (unlimited bandwidth)
- **Custom Domain**: $10-20/year

---

## 🚀 Production Checklist

- [ ] Environment variables configured
- [ ] Database tables created
- [ ] CORS settings updated
- [ ] HTTPS enabled (automatic)
- [ ] Custom domain configured (optional)
- [ ] User registration tested
- [ ] Project creation tested
- [ ] Crawling functionality tested
- [ ] Error monitoring set up
- [ ] Backups configured

---

## 📞 Support

Nếu gặp vấn đề deployment:

1. **Check Vercel logs** trong dashboard
2. **Verify environment variables** đã set đúng
3. **Test API endpoints** với Postman
4. **Check browser console** cho errors
5. **Review deployment guides** trong README files

---

## 🎉 Success!

Sau khi deploy thành công, bạn sẽ có:

- 🌐 **Frontend URL**: https://your-app.vercel.app
- 🔧 **Backend API**: https://your-api.vercel.app
- 🗄️ **Database**: PostgreSQL on cloud
- 🔐 **Authentication**: JWT-based
- 📊 **Dashboard**: Real-time analytics

**Tool của bạn đã sẵn sàng phục vụ users online! 🎊**

---

*Happy deploying! 🚀*