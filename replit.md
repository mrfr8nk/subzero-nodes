# SUBZERO-MD Bot Deployment Platform

## Overview

SUBZERO-MD is a full-stack web application for deploying and managing WhatsApp bots. The platform provides a comprehensive dashboard for users to deploy bots, manage resources through a coin-based system, track referrals, and monitor deployment statistics. Built with a modern React frontend and Express backend, it features Google OAuth authentication and uses MongoDB for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Single-page application built with React 18 and TypeScript
- **Routing**: Client-side routing using Wouter for lightweight navigation
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture  
- **Express.js Server**: RESTful API server with middleware for logging and error handling
- **Authentication**: Google OAuth 2.0 integration with Passport.js strategy
- **Session Management**: Express sessions stored in MongoDB using connect-mongo
- **Database Layer**: Native MongoDB driver with TypeScript interfaces
- **API Design**: Resource-based endpoints for deployments, transactions, referrals, and user management

### Database Design
- **Users Collection**: Stores user profiles with Google ID, coin balance and referral codes
- **Deployments Collection**: Bot deployment records with status tracking and configuration
- **Transactions Collection**: Financial transaction history for coin system
- **Referrals Collection**: User referral relationships and earnings tracking
- **Sessions Collection**: Express session storage for authentication persistence

### Authentication & Authorization
- **Google OAuth Integration**: Uses Google's OAuth 2.0 for user authentication
- **Session-Based Auth**: Server-side sessions with secure cookie management
- **Protected Routes**: Middleware-based route protection for authenticated endpoints
- **User Context**: React context for client-side authentication state

### Key Features
- **Bot Deployment**: One-click deployment system with configuration options and cost management
- **Coin Economy**: Virtual currency system for resource management and payments
- **Referral System**: User referral tracking with automatic reward distribution
- **Dashboard Analytics**: Real-time statistics for deployments, transactions, and referral performance
- **Mobile Responsive**: Fully responsive design optimized for mobile devices

## External Dependencies

### Database & Storage
- **MongoDB**: Document database with native TypeScript integration
- **Connect-Mongo**: MongoDB session store for Express sessions

### Authentication Services  
- **Google OAuth 2.0**: Google's OAuth 2.0/OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with Google OAuth strategy

### UI & Styling
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide Icons**: Consistent icon library for UI elements

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast build tool with hot module replacement
- **TanStack Query**: Server state management with caching and synchronization
- **Zod**: Schema validation for type-safe data handling

### Production Infrastructure
- **Replit Hosting**: Integrated hosting environment with development tooling
- **WebSocket Support**: Real-time connection capabilities for enhanced user experience

## Environment Configuration

### Required Environment Variables
The application requires several environment variables for proper operation. Reference `.env.example` for the complete list.

**Critical Variables:**
- `DATABASE_URL`: MongoDB connection string
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SESSION_SECRET`: Secure session secret key

### Google OAuth Domain Configuration
For production deployment, add the base domain URL to Google Cloud Console:
- **Authorized domain**: `https://subzero-deploy.onrender.com`
- **NOT the auth route**: The OAuth callback route is automatically handled by the application
- The callback URL pattern is: `{DOMAIN}/api/auth/google/callback`

### Deployment Notes
- Update `FRONTEND_URL` and `BACKEND_URL` in production environment
- Ensure `CORS_ORIGIN` matches your production domain
- Use secure session secrets in production