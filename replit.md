# SUBZERO Deployment Platform

## Overview
SUBZERO is a comprehensive deployment platform designed to simplify application deployment and management through GitHub Actions. It provides users with a streamlined workflow, including automatic repository forking, real-time monitoring, advanced logging, and automated status tracking. The platform aims to offer a professional, hosting-site-like experience, enabling users to deploy and manage their applications with ease and robust feedback mechanisms.

## User Preferences
- Non-technical language preferred
- Focus on functional improvements over technical details
- Real-time feedback and visual indicators important
- Terminal-style interfaces preferred for deployment logs

## System Architecture
The platform features a modern UI/UX with a professional navy blue theme, animated statistics, and a Railway-style animated landing page. Core technical implementations include:
- **GitHub Integration:** Deep integration with GitHub for user authentication, repository forking, and workflow management. It enforces GitHub connection for deployments and uses user's personal GitHub accounts for deployments.
- **Deployment System:** Utilizes GitHub Actions for application deployments, managing workflow file creation, branch management, and environment variable synchronization.
- **Real-time Monitoring & Logging:** Features a sophisticated logging system with real-time log streaming via WebSockets, a professional terminal-style log viewer with color-coding, and automatic application status detection based on log output.
- **User Management:** Includes robust user authentication via Google and GitHub OAuth, account linking, and a system for managing user coin balances.
- **Admin Features:** An admin dashboard with tools for auto-cleanup management, user banning, and system monitoring.
- **UI Components:** Enhanced navigation with consistent icons, mobile-responsive design for deployment forms, and animated UI elements.
- **Backend Enhancements:** Robust retry mechanisms for GitHub API calls, a WebSocket broadcasting system for live updates, and extended storage for deployment lookups.

## External Dependencies
- **GitHub:** Used for OAuth authentication, repository management (forking, branch creation), GitHub Actions for deployments, and accessing workflow logs.
- **Passport.js:** For handling OAuth strategies (Google, GitHub).
- **Framer Motion:** For UI animations and transitions.
- **WebSockets:** For real-time log streaming and status updates.