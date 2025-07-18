# Xequtive Backend

This is the backend service for the Xequtive transportation platform. It provides APIs for fare calculation, booking management, user authentication, and admin dashboard functionality.

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Documentation](#api-documentation)
3. [Dashboard API](#dashboard-api)
4. [Environment Variables](#environment-variables)
5. [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Firebase account and project

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/xequtive-backend.git
cd xequtive-backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables by copying `.env.example` to `.env` and filling in your values.

4. Run the development server:

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## API Documentation

The API provides the following main functionalities:

- User authentication (signup, login, session management)
- Fare calculation and estimation
- Booking creation and management
- User profile management

For detailed API documentation, see:

- [API_DOCUMENTATION.md](./docs/xequtive-frontend/API_DOCUMENTATION.md)

## Dashboard API

The Dashboard API provides administration features for managing the Xequtive platform, including:

- Admin authentication
- Analytics (revenue, bookings, users, traffic)
- System settings management
- System logs

For detailed Dashboard API documentation, see:

- [DASHBOARD_API_DOCUMENTATION.md](./docs/dashboard/DASHBOARD_API_DOCUMENTATION.md)

## Environment Variables

The following environment variables are required:

```
# Server configuration
PORT=5555
NODE_ENV=development

# Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_API_KEY=your-api-key

# Security
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Google APIs
MAPBOX_TOKEN=your-mapbox-token
```

For production, use `.env.production` with appropriate values.

## Project Structure

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── validation/      # Request validation schemas
└── index.ts         # Application entry point

docs/
├── xequtive-frontend/  # Frontend API documentation
└── dashboard/          # Dashboard API documentation
```

## License

This project is proprietary and confidential.
# Build fix applied
