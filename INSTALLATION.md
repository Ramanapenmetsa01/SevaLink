# 🚀 SevaLink Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (local installation or MongoDB Atlas account) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sevalink
```

### 2. Install Dependencies
```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Environment Setup
```bash
# Copy environment file
cd server
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Required - Update these
MONGODB_URI=mongodb://localhost:27017/sevalink
JWT_SECRET=your-super-secret-jwt-key-here

# Optional - For full functionality
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key
```

### 4. Start Development Servers
```bash
# From the root directory
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 🎯 What You'll See

### Home Page Features
- ✅ **Stunning Hero Section** with animated gradients
- ✅ **Service Cards** for all 4 main services
- ✅ **Interactive Navigation** with login/signup buttons
- ✅ **Responsive Design** for all devices
- ✅ **Modern UI/UX** with Tailwind CSS and Framer Motion

### Authentication System
- ✅ **Login/Signup Forms** with validation
- ✅ **JWT Token Management**
- ✅ **Role-based Access** (Citizen, Volunteer, Admin)
- ✅ **Protected Routes**

### AI Chatbot Widget
- ✅ **Floating Chat Button**
- ✅ **Interactive Chat Interface**
- ✅ **Voice Input Ready** (placeholder)

## 📱 Test the Application

### 1. Create an Account
1. Click "Get Started" on the home page
2. Fill out the signup form
3. Choose your role (Citizen/Volunteer)
4. Submit the form

### 2. Login
1. Use the login form with your credentials
2. You'll be redirected to the dashboard

### 3. Explore Features
- Navigate through different sections
- Test the responsive design on mobile
- Try the chatbot widget (bottom right)

## 🛠️ Development Commands

```bash
# Install dependencies
npm run install-all

# Start development (both frontend and backend)
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Build for production
npm run build

# Start production server
npm start
```

## 🗄️ Database Setup

### Option 1: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use default connection: `mongodb://localhost:27017/sevalink`

### Option 2: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## 🔑 API Keys Setup

### Gemini Pro API (For AI Chatbot)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env` as `GEMINI_API_KEY`

### Google Translate API (Optional)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Translate API
3. Create credentials
4. Add to `.env` as `GOOGLE_TRANSLATE_API_KEY`

## 🚀 Deployment Options

### Frontend (Vercel - Recommended)
```bash
# Build the client
cd client
npm run build

# Deploy to Vercel
npx vercel --prod
```

### Backend (Railway - Recommended)
1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically

### Full Stack (Render)
1. Connect repository to Render
2. Configure build and start commands
3. Set environment variables

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Kill process on port 3000 or 5000
npx kill-port 3000
npx kill-port 5000
```

**2. MongoDB Connection Error**
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access for Atlas

**3. Module Not Found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**4. Build Errors**
```bash
# Clear cache and rebuild
npm run clean
npm run install-all
npm run build
```

## 📊 Project Structure

```
sevalink/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── hooks/         # Custom hooks
├── server/                # Node.js backend
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── index.js          # Server entry point
└── docs/                 # Documentation
```

## 🎨 UI/UX Features

- **Modern Design System** with consistent colors and typography
- **Smooth Animations** using Framer Motion
- **Responsive Layout** for all screen sizes
- **Accessibility** features built-in
- **Dark Mode Ready** (theme context included)

## 🔐 Security Features

- **JWT Authentication** with secure tokens
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** on all forms
- **CORS Protection** configured
- **Helmet.js** for security headers

## 📞 Support

If you encounter any issues:

1. Check this installation guide
2. Review the troubleshooting section
3. Check the console for error messages
4. Ensure all environment variables are set correctly

---

**Built with ❤️ for the hackathon community**
