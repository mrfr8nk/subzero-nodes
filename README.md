# SUBZERO-MD Bot Deployment Platform

A modern, full-stack web application for deploying and managing WhatsApp bots with an intuitive dashboard, coin-based economy, and referral system.

![SUBZERO-MD Platform](https://img.shields.io/badge/Platform-SUBZERO--MD-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

## ✨ Features

### 🚀 Core Features
- **One-Click Bot Deployment**: Deploy WhatsApp bots instantly with customizable configurations
- **Coin Economy System**: Virtual currency for resource management and bot deployment costs
- **Referral Program**: Earn coins by referring new users to the platform
- **Real-time Dashboard**: Monitor deployments, transactions, and referral analytics
- **Google OAuth Authentication**: Secure login with Google accounts

### 🎨 User Experience
- **Dark Mode Support**: System preference detection with manual toggle
- **Mobile-First Design**: Fully responsive interface optimized for all devices
- **Modern UI**: Clean, professional interface built with shadcn/ui components
- **Email Verification**: Secure account verification with resend functionality

### 📊 Management Features
- **Deployment Tracking**: Monitor bot status, uptime, and performance
- **Transaction History**: Complete audit trail of all coin transactions
- **Referral Analytics**: Track referral performance and earnings
- **User Dashboard**: Comprehensive overview of account status and activities

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **Wouter** - Lightweight client-side routing
- **TanStack Query** - Powerful data fetching and state management
- **React Hook Form** - Performant form handling with Zod validation

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type safety across the entire stack
- **MongoDB** - Document database for flexible data storage
- **Passport.js** - Authentication middleware with Google OAuth
- **Express Sessions** - Secure session management

### Development Tools
- **Vite** - Next-generation frontend build tool
- **ESLint** - Code linting for consistency
- **Prettier** - Code formatting
- **Drizzle ORM** - Type-safe database toolkit

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB database
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/subzero-md-platform.git
   cd subzero-md-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=mongodb://localhost:27017/subzero-md
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_secure_session_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and config
│   │   └── styles/        # Global styles and Tailwind config
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   └── utils/            # Server utilities
├── shared/               # Shared types and schemas
└── docs/                # Documentation files
```

## 🔧 Configuration

### Google OAuth Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Navigate to APIs & Services > Library
   - Search for and enable "Google+ API"

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized domains: `https://your-domain.com`
   - Add redirect URI: `https://your-domain.com/api/auth/google/callback`

4. **Update Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### Database Configuration

The application uses MongoDB for data persistence. Update your `.env` file:

```env
DATABASE_URL=mongodb://localhost:27017/subzero-md
# or for MongoDB Atlas
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/subzero-md
```

## 🚢 Deployment

### Render.com Deployment

1. **Connect Repository**
   - Link your GitHub repository to Render

2. **Configure Environment Variables**
   - Set all required environment variables in Render dashboard
   - **Important:** Set the following URLs for production:
     ```env
     RENDER_EXTERNAL_URL=https://your-app.onrender.com
     FRONTEND_URL=https://your-app.onrender.com
     BACKEND_URL=https://your-app.onrender.com
     ```
   - The `RENDER_EXTERNAL_URL` is crucial for correct email verification links

3. **Deploy**
   - Render will automatically build and deploy your application

### Other Platforms

The application is compatible with:
- **Vercel** - Frontend deployment with serverless functions
- **Railway** - Full-stack deployment with automatic SSL
- **DigitalOcean App Platform** - Containerized deployment
- **Heroku** - Traditional PaaS deployment

## 📚 API Documentation

### Authentication Endpoints
- `GET /api/auth/user` - Get current user
- `GET /api/auth/google` - Initialize Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/logout` - Sign out user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/balance` - Get coin balance

### Deployments
- `GET /api/deployments` - List user deployments
- `POST /api/deployments` - Create new deployment
- `PUT /api/deployments/:id` - Update deployment
- `DELETE /api/deployments/:id` - Delete deployment

### Transactions
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions` - Create transaction

### Referrals
- `GET /api/referrals` - Get referral data
- `POST /api/referrals/apply` - Apply referral code

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure mobile responsiveness
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. **Check the documentation** - Most common issues are covered here
2. **Search existing issues** - Your question might already be answered
3. **Create a new issue** - Provide detailed information about your problem
4. **Join our community** - Connect with other users and contributors

## 🚀 Roadmap

### Upcoming Features
- [ ] Bot template marketplace
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] API rate limiting and quotas
- [ ] Advanced user roles and permissions

### Recent Updates
- ✅ Dark mode implementation with system preference detection
- ✅ Mobile-responsive design improvements
- ✅ Email verification system with resend functionality
- ✅ Enhanced navigation and user experience
- ✅ Theme toggle component integration

## 🙏 Acknowledgments

- **shadcn/ui** - For the beautiful component library
- **Radix UI** - For accessible headless components
- **Tailwind CSS** - For the utility-first CSS framework
- **React** - For the component-based architecture
- **Express.js** - For the robust server framework

---

Made with ❤️ by the SUBZERO-MD team

## 📞 Contact

- **Project Repository**: [GitHub](https://github.com/your-username/subzero-md-platform)
- **Documentation**: [Wiki](https://github.com/your-username/subzero-md-platform/wiki)
- **Issues**: [Bug Reports](https://github.com/your-username/subzero-md-platform/issues)