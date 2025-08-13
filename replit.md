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
- **Dual Authentication**: Google OAuth 2.0 and email/password authentication with verification
- **Session-Based Auth**: Server-side sessions with secure cookie management and MongoDB storage
- **Email Services**: Automated verification emails, welcome emails, and password reset functionality
- **Protected Routes**: Middleware-based route protection for authenticated endpoints  
- **User Context**: React context for client-side authentication state
- **Security Features**: Password hashing with bcrypt, secure token generation, email verification with expiry
- **Cross-Domain Support**: CORS configuration for development and production deployments

### Key Features
- **Bot Deployment**: One-click deployment system with configuration options and cost management
- **Coin Economy**: Virtual currency system for resource management and payments
- **Referral System**: User referral tracking with automatic reward distribution
- **Dashboard Analytics**: Real-time statistics for deployments, transactions, and referral performance
- **Mobile Responsive**: Fully responsive design optimized for mobile devices
- **Admin Controls**: Comprehensive admin dashboard with user management, cost settings, and super admin capabilities
- **User Management**: Account settings with self-deletion functionality and admin controls for user management
- **Configurable Costs**: Admin-controlled deployment and daily charge rates instead of hardcoded values
- **Device-Based Security**: Advanced device fingerprinting system with configurable account limits per device to prevent abuse

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
The application automatically detects the correct callback URL based on the hosting platform:

**Supported Platforms:**
- **Replit**: Automatically uses `REPLIT_DEV_DOMAIN`
- **Render.com**: Automatically uses `RENDER_EXTERNAL_URL` or detects `.onrender.com` domains
- **Koyeb**: Automatically uses `KOYEB_PUBLIC_DOMAIN`
- **Vercel**: Automatically uses `VERCEL_URL`
- **Heroku**: Automatically uses `HEROKU_APP_NAME`

**Manual Configuration (Optional):**
- Set `CALLBACK_URL` environment variable to override automatic detection
- Example: `CALLBACK_URL=https://your-domain.com/api/auth/google/callback`

**Google Cloud Console Setup:**
Add your domain's callback URL to Google Cloud Console OAuth settings:
- Pattern: `https://your-domain.com/api/auth/google/callback`
- The application will log the detected URL on startup for verification

### Recent Changes (January 2025)

#### Device Fingerprinting Migration (January 2025)
- **Replaced IP-Based with Device Fingerprinting**: Complete overhaul of duplicate account prevention system
  - Removed all IP tracking, storage, and validation logic from authentication flows  
  - Implemented advanced device fingerprinting using multiple browser characteristics
  - Device fingerprints generated using canvas rendering, WebGL info, audio context, screen properties, and browser settings
  - Updated Google OAuth and local authentication to use device fingerprints instead of IP addresses
  - Admin notifications now track device-based instead of IP-based duplicate account attempts
  - Configurable max accounts per device setting (replaces max accounts per IP)
  - Enhanced privacy through cryptographic hashing of device characteristics
  - More reliable duplicate detection that works across network changes and VPNs
- **Enhanced Admin Controls**: Super admins can now demote and delete other existing admins
- **User Account Management**: Users can delete their own accounts through account settings page
- **Configurable Cost System**: Deployment costs and daily charges are now configurable through admin settings
- **Improved Error Handling**: Added ObjectId validation to prevent MongoDB BSON errors and WebSocket connection validation
- **Security Enhancements**: Admins cannot self-delete through user interface for security
- **Device Fingerprint-Based Duplicate Account Prevention**: Implemented comprehensive device fingerprinting system to prevent users from creating multiple accounts
  - Advanced device fingerprinting using canvas, WebGL, audio context, and browser characteristics
  - Configurable maximum accounts per device (default: 1)
  - Admin notifications for duplicate device detections  
  - Error handling for both Google OAuth and local signup flows
  - Admin controls for device restriction configuration
  - Fixed unhandled promise rejections with global error handlers
  - Enhanced WebSocket connection stability with better error handling
  - Removed legacy IP-based tracking and restrictions in favor of more reliable device fingerprinting
- **Branding Update**: Replaced WhatsApp logos throughout the application with robot/bot icons to better represent the bot platform branding
  - Updated all page headers and navigation with Bot icon from Lucide React
  - Maintained consistent blue gradient styling across all logo instances
  - Updated website manifest with proper app name and theme colors
- **Chat Message Tagging System**: Implemented comprehensive tagging system for admin notifications
  - Added support for @issue, @request, and @query tags in chat messages
  - Persistent message storage in MongoDB with tag metadata
  - Automatic admin notifications when users send tagged messages
  - Visual indicators for tagged messages with color-coded badges
  - Tag highlighting in message content with special styling
  - Message history preserved across server restarts and reboots
  - Enhanced chat UI with tag instructions and feedback indicators
- **Smart GitHub Account Management**: Overhauled GitHub deployment system for improved reliability
  - Removed priority-based queue system in favor of intelligent account selection
  - Implemented real-time GitHub API checks to determine account availability
  - Automatic switching between GitHub accounts based on current workload
  - Simplified admin interface with removal of priority and queue length controls
  - Enhanced deployment reliability through smart load balancing across multiple GitHub accounts
- **Auto-Logout for Banned Users**: Implemented immediate logout system for account security
  - Banned users are automatically logged out when accessing protected routes
  - Enhanced security middleware with forceLogout flag detection
  - Improved user experience with proper error messaging for banned accounts
- **Enhanced Dark Theme Support**: Fixed font visibility issues in deployments and referrals sections
  - Updated text colors to be lighter and more readable in dark mode
  - Improved contrast for better accessibility across all UI components
  - Consistent color scheme for dark theme throughout the application
- **Advanced Chat System Features**: Implemented comprehensive message management capabilities
  - Message replies with visual threading and context preservation
  - In-line message editing with edit history tracking
  - Message deletion for users (own messages) and admins (all messages)
  - Enhanced dropdown menus for message actions (reply, edit, delete)
  - Real-time updates for edited and deleted messages across all clients
  - Improved message tagging system with better visual indicators
  - Enhanced admin controls for user restriction and moderation
- **Enhanced GitHub Token Management**: Improved API validation and monitoring system
  - Removed default GitHub tokens in favor of admin-only configuration
  - Enhanced API status checking with automatic refresh and last used tracking
  - Improved deployment cost validation with detailed balance comparison
  - Real-time token validation status with rate limiting information
  - Automatic refresh of GitHub account status every 30 seconds
  - Better error messaging for insufficient funds with exact shortfall amounts

### Deployment Notes
- Update `FRONTEND_URL` and `BACKEND_URL` in production environment
- Ensure `CORS_ORIGIN` matches your production domain
- Use secure session secrets in production