# PexNet API
🧠 Node.js API for PexNet game6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Visit the test page:** Discord OAuth2 authentication

## Features

- **Discord OAuth2 Authentication** - Secure user authentication via Discord
- **User Management** - Create, read, and update user profiles
- **Wordle Game Integration** - Complete backend for daily Wordle puzzles
- **Session Management** - Persistent login sessions
- **RESTful API** - Clean and organized endpoint structure
- **TypeScript** - Type-safe development
- **MongoDB Integration** - Robust data storage
- **Swagger Documentation** - Auto-generated API docs

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd pexnet-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord OAuth2 credentials and MongoDB connection
   ```

4. **Seed Wordle data (recommended):**
   ```bash
   npm run seed:wordle
   ```

5. **Test the API (optional):**
   ```bash
   npx ts-node test-wordle-api.ts
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Visit the test page:**
   - Open http://localhost:3000 to test Discord authentication
   - API documentation available at http://localhost:3000/api-docs

## Discord OAuth2 Setup

For detailed Discord OAuth2 setup instructions, see [DISCORD_OAUTH_SETUP.md](./DISCORD_OAUTH_SETUP.md)

## Wordle Integration

For complete Wordle API documentation and integration guide, see [WORDLE_API.md](./WORDLE_API.md)

## API Endpoints

### Authentication
- `GET /api/auth/discord` - Start Discord OAuth2 flow
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - Logout current user

### Users
- `GET /api/users/i/:id` - Get user by ID
- `POST /api/users/add` - Create user (auth required)
- `PUT /api/users/i/:id` - Update user (auth required)

### Wordle Game
- `GET /api/wordle/daily-word` - Get today's word
- `POST /api/wordle/stats` - Save game statistics (auth required)
- `GET /api/wordle/stats/:discordId` - Get user statistics
- `GET /api/wordle/leaderboard` - Get global leaderboard
- `GET /api/wordle/played-today/:discordId` - Check if user played today

### Utility
- `GET /api/ping` - Health check endpoint

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run swagger` - Generate Swagger documentation
- `npm run seed:wordle` - Seed Wordle daily words for testing

## Tech Stack

- **Node.js & Express** - Server framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB & Mongoose** - Database and ODM
- **Passport.js** - Authentication middleware
- **Discord OAuth2** - Authentication provider
- **Swagger** - API documentation
