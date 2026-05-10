# Internal Link SEO Tool - Frontend

React frontend cho Internal Link SEO Tool web application.

## 🚀 Deployment Options

### 1. Vercel (Recommended - Free & Easy)

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
cd web-app/frontend
vercel --prod
```

4. **Set Environment Variables:**
```bash
vercel env add REACT_APP_API_URL
```

#### Vercel Environment Variables:
- `REACT_APP_API_URL`: Your backend API URL (e.g., `https://your-backend.vercel.app/api`)

### 2. Netlify

#### Setup:
1. **Connect GitHub repository** to Netlify
2. **Set build settings:**
   - Build command: `npm run build`
   - Publish directory: `build`
3. **Set environment variables** in Netlify dashboard
4. **Deploy automatically** on git push

### 3. Firebase Hosting

#### Setup:
1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login and initialize:**
```bash
firebase login
firebase init hosting
```

3. **Deploy:**
```bash
firebase deploy
```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Backend API URL
REACT_APP_API_URL=https://your-backend-api-url.com/api

# App Configuration
REACT_APP_NAME=Internal Link SEO Tool
REACT_APP_VERSION=1.0.0
```

## Features

- **User Authentication**: Login, register, and profile management
- **Project Management**: Create, view, and manage internal linking projects
- **Dashboard**: Overview of projects, statistics, and recent activity
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live data updates and notifications

## Tech Stack

- **React 18** - Modern React with hooks and concurrent features
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client with interceptors
- **React Hot Toast** - Toast notifications
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running (see backend README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

## Project Structure

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Navbar.js       # Main navigation
├── context/            # React context providers
│   └── AuthContext.js  # Authentication state management
├── pages/              # Page components
│   ├── LoginPage.js    # User login
│   ├── RegisterPage.js # User registration
│   ├── DashboardPage.js# Main dashboard
│   ├── ProjectsPage.js # Project management
│   ├── ProjectDetailPage.js # Project details
│   └── ProfilePage.js  # User profile
├── App.js              # Main app component with routing
├── index.js            # App entry point
└── index.css           # Global styles and Tailwind
```

## Key Components

### Authentication Context
Manages user authentication state, login/logout, and token refresh.

### Protected Routes
Components that require authentication automatically redirect to login.

### API Integration
Axios interceptors handle authentication tokens and refresh automatically.

## Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Contributing

1. Follow the existing code style
2. Use meaningful commit messages
3. Test your changes thoroughly
4. Update documentation as needed

## License

This project is part of the Internal Link SEO Tool suite.
