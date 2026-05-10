# Internal Link SEO Tool - Backend API

Express.js backend API cho Internal Link SEO Tool web application.

## 🚀 Deployment Options

### 1. Vercel (Recommended for quick deployment)

#### Setup:
1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd web-app/backend
vercel --prod
```

4. **Set Environment Variables:**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
```

#### Vercel Environment Variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh token secret
- `NODE_ENV`: production

### 2. Railway

#### Setup:
1. **Connect GitHub repository** to Railway
2. **Add PostgreSQL database** in Railway dashboard
3. **Set environment variables** in Railway dashboard
4. **Deploy automatically** on git push

### 3. Heroku

#### Setup:
1. **Create Heroku app:**
```bash
heroku create your-app-name
```

2. **Add PostgreSQL addon:**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. **Set environment variables:**
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret
```

4. **Deploy:**
```bash
git push heroku main
```

### 4. DigitalOcean App Platform

#### Setup:
1. **Connect GitHub repository**
2. **Choose App Platform**
3. **Add PostgreSQL database**
4. **Configure environment variables**
5. **Deploy**

### 5. AWS/Docker

#### Setup:
1. **Build Docker image:**
```bash
docker build -t internal-link-backend .
```

2. **Run locally:**
```bash
docker run -p 5000:5000 internal-link-backend
```

3. **Deploy to AWS ECS/Fargate**

## 🗄️ Database Setup

### PostgreSQL on Cloud

#### Option 1: Supabase (Free tier available)
1. Create project at https://supabase.com
2. Get connection string from Settings > Database
3. Run migrations in SQL Editor

#### Option 2: ElephantSQL
1. Create database at https://www.elephantsql.com
2. Get connection string
3. Run schema.sql manually

#### Option 3: Railway PostgreSQL
- Automatically created when adding PostgreSQL service

### Database Schema

Run this SQL to create tables:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  website VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  website_url VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at TIMESTAMP
);

-- Pages table
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  title VARCHAR(500),
  content TEXT,
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Links table
CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  source_page_id INTEGER REFERENCES pages(id),
  target_page_id INTEGER REFERENCES pages(id),
  anchor_text VARCHAR(500),
  relevance_score DECIMAL(3,2),
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# CORS (for production)
FRONTEND_URL=https://your-frontend-domain.com
```

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/crawl` - Start crawling

### Project Data
- `GET /api/projects/:id/pages` - Get project pages
- `GET /api/projects/:id/links` - Get project links
- `GET /api/projects/stats` - Get user statistics

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📊 Monitoring

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Security

- **Helmet.js** for security headers
- **Rate limiting** to prevent abuse
- **CORS** configured for production
- **Input validation** with express-validator
- **JWT tokens** with expiration
- **Password hashing** with bcrypt

## 📈 Performance

- **Connection pooling** for database
- **Caching** for frequently accessed data
- **Rate limiting** to prevent overload
- **Error handling** with proper logging
- **Health checks** for monitoring

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure database is accessible from deployment platform

2. **JWT Token Errors**
   - Check JWT_SECRET and JWT_REFRESH_SECRET
   - Ensure tokens are properly signed

3. **CORS Errors**
   - Update FRONTEND_URL in environment variables
   - Check CORS configuration in server.js

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for missing environment variables

## 📞 Support

For deployment issues:
1. Check logs in your deployment platform
2. Verify environment variables are set correctly
3. Test API endpoints with tools like Postman
4. Check database connectivity

## 🚀 Next Steps

After backend deployment:
1. Deploy frontend to Vercel/Netlify
2. Update frontend API base URL
3. Test end-to-end functionality
4. Set up monitoring and alerts