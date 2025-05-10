# Xequtive Backend

Backend service for the Xequtive taxi booking platform.

## Tech Stack

- Node.js + Express
- Firebase Admin SDK
- Firestore (NoSQL)
- Mapbox for distance/fare calculations
- Zod for input validation
- Security: dotenv, helmet, cors

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
MAPBOX_TOKEN=your-mapbox-token
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_SECRET=your-jwt-secret
```

3. Start the development server:

```bash
npm run dev
```

## API Endpoints

See the [API Documentation](./API_DOCUMENTATION.md) for detailed information about all available endpoints, request/response formats, and authentication requirements.

## Development

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests

## Project Structure

```
src/
├── index.js          # Application entry point
├── routes/           # API routes
├── middleware/       # Custom middleware
├── controllers/      # Route controllers
├── services/        # Business logic
├── models/          # Data models
└── utils/           # Utility functions
```

## Security

- CORS configuration
- Helmet for HTTP headers
- Environment variables
- Firebase Authentication
- Input validation with Zod

## License

Private and Confidential - Xequtive © 2024
