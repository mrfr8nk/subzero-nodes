# SUBZERO-MD Bot Deployment Platform

## Overview

SUBZERO-MD is a full-stack web application for deploying and managing WhatsApp bots. The platform provides a comprehensive dashboard for users to deploy bots, manage resources through a coin-based system, track referrals, and monitor deployment statistics. Built with a modern React frontend and Express backend, it features authentication integration with Replit's OIDC system and uses PostgreSQL with Drizzle ORM for data persistence.

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
- **Authentication**: Replit OIDC integration with Passport.js strategy
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **Database Layer**: Drizzle ORM with Neon serverless PostgreSQL connection
- **API Design**: Resource-based endpoints for deployments, transactions, referrals, and user management

### Database Design
- **Users Table**: Stores user profiles with coin balance and referral codes
- **Deployments Table**: Bot deployment records with status tracking and configuration
- **Transactions Table**: Financial transaction history for coin system
- **Referrals Table**: User referral relationships and earnings tracking
- **Sessions Table**: Express session storage for authentication persistence

### Authentication & Authorization
- **OIDC Integration**: Uses Replit's OpenID Connect for user authentication
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
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with schema migration support

### Authentication Services  
- **Replit OIDC**: OAuth 2.0/OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with OpenID Connect strategy

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