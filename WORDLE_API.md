# Wordle API Integration

This document describes the Wordle game API endpoints integrated into the PexNet API for seamless integration with the Angular Wordle game.

## Overview

The Wordle integration provides a complete backend solution for:
- Daily word generation and management
- User game statistics tracking
- Global leaderboards
- One-game-per-day enforcement
- Discord user authentication integration

## Database Models

### WordleDailyWord
- Stores daily words with sequential IDs
- Ensures consistent words across all users for each day
- Auto-generates new words when needed

### WordleGameStats
- Records individual game sessions
- Prevents multiple plays per day per user
- Stores guess patterns and completion times

### WordleUserStats
- Aggregated user statistics for performance
- Real-time streak tracking
- Guess distribution analytics

## API Endpoints

### Daily Word Management

#### `GET /api/wordle/daily-word`
- **Purpose**: Get today's Wordle word
- **Authentication**: None required
- **Response**: `{ word: string, date: string, wordId: number }`
- **Notes**: Auto-generates new words if none exists for today

### Game Statistics

#### `POST /api/wordle/stats`
- **Purpose**: Save completed game statistics
- **Authentication**: Required (Discord OAuth)
- **Body**: 
  ```json
  {
    "discordId": "string",
    "wordId": number,
    "attempts": number, // 0-6
    "guesses": ["string"], // 5-letter words
    "solved": boolean,
    "timeToComplete?": number // milliseconds
  }
  ```
- **Validation**: 
  - One game per user per word
  - Valid attempt range (0-6)
  - Valid guess format (5 letters)

#### `GET /api/wordle/stats/:discordId`
- **Purpose**: Retrieve user's aggregate statistics
- **Authentication**: None required (public stats)
- **Response**: 
  ```json
  {
    "totalGames": number,
    "totalWins": number,
    "winPercentage": number,
    "currentStreak": number,
    "maxStreak": number,
    "guessDistribution": { "1": 0, "2": 5, ... },
    "lastPlayedDate": "YYYY-MM-DD"
  }
  ```

### Play Status

#### `GET /api/wordle/played-today/:discordId`
- **Purpose**: Check if user has already played today
- **Authentication**: None required
- **Response**: 
  ```json
  {
    "hasPlayed": boolean,
    "gameResult": {
      "attempts": number,
      "solved": boolean,
      "guesses": ["string"]
    } // null if not played
  }
  ```

### Leaderboards

#### `GET /api/wordle/leaderboard?limit=10`
- **Purpose**: Global user rankings
- **Authentication**: None required
- **Query Parameters**: `limit` (default: 10)
- **Response**: 
  ```json
  {
    "users": [{
      "discordId": "string",
      "username": "string",
      "winPercentage": number,
      "currentStreak": number,
      "totalGames": number
    }]
  }
  ```
- **Sorting**: Win percentage → Current streak → Total games
- **Minimum**: 5 games played to appear on leaderboard

## Integration with Angular Hub

### CORS Configuration
The API is configured to accept requests from:
- `http://localhost:4200` (Angular hub)
- `http://localhost:4201` (Angular Wordle game)
- Production frontend URLs

### Authentication Flow
1. User authenticates via Discord in the main hub
2. Discord ID is passed to the Wordle game via:
   - **Query Parameters**: `?discordId=123&username=user`
   - **PostMessage API**: Cross-iframe communication

### Communication Methods

#### Option 1: Query Parameters
```typescript
// In pexnet-hub wordle-page.component.ts
const wordleUrl = `http://localhost:4201?discordId=${userDiscordId}&username=${username}`;
```

#### Option 2: PostMessage (Recommended)
```typescript
// In pexnet-hub
window.addEventListener('message', (event) => {
  if (event.data.type === 'REQUEST_USER_DATA') {
    event.source.postMessage({
      type: 'USER_DATA',
      discordId: userDiscordId,
      username: username
    }, '*');
  }
});

// In pexnet-wordle
window.parent.postMessage({ type: 'REQUEST_USER_DATA' }, '*');
```

## Game Flow

1. **Daily Word**: Game requests today's word from `/api/wordle/daily-word`
2. **Play Check**: Verify if user played today via `/api/wordle/played-today/:discordId`
3. **Game Play**: User completes puzzle in Angular frontend
4. **Stats Save**: Game results posted to `/api/wordle/stats`
5. **Stats Display**: Retrieve user stats from `/api/wordle/stats/:discordId`

## Data Seeding

### Initial Setup
```bash
npm run seed:wordle
```

This script:
- Clears existing daily words (development only)
- Seeds 100+ words starting 30 days ago
- Ensures today has a valid word
- Displays current word for testing

### Word Management
- Words are selected deterministically by day
- Same word for all users on same date (UTC)
- Automatic generation of new words as days progress
- 500+ word dictionary included

## Security Features

### Rate Limiting
- One game per user per day enforced at database level
- Unique constraint on `(discordId, wordId)`

### Input Validation
- 5-letter word validation for guesses
- Attempt range validation (0-6)
- Discord ID format validation
- Date/time validation

### CORS Protection
- Restricted to specific origins
- Credentials enabled for session handling
- Production-ready configuration

## Testing

### Development Testing
1. Start the API: `npm run dev`
2. Seed test data: `npm run seed:wordle`
3. Test endpoints with Postman or browser
4. Verify CORS with Angular frontend

### API Testing Examples
```bash
# Get today's word
curl http://localhost:3000/api/wordle/daily-word

# Check if user played
curl http://localhost:3000/api/wordle/played-today/USER_DISCORD_ID

# Get user stats
curl http://localhost:3000/api/wordle/stats/USER_DISCORD_ID

# Get leaderboard
curl http://localhost:3000/api/wordle/leaderboard?limit=5
```

## Production Deployment

### Environment Variables
Add to your `.env` file:
```env
# Existing variables...

# Optional: Custom word lists
WORDLE_CUSTOM_WORDS=ABOUT,ABOVE,ABUSE...

# Optional: Timezone settings
WORDLE_TIMEZONE=UTC
```

### Database Indexes
The models automatically create these indexes:
- `WordleDailyWord`: `date`, `wordId`
- `WordleGameStats`: `(discordId, wordId)`, `discordId`, `date`
- `WordleUserStats`: `discordId`

### Monitoring
- Monitor daily word generation
- Track API response times
- Watch for duplicate play attempts
- Monitor user engagement metrics

## Troubleshooting

### Common Issues
1. **CORS Errors**: Verify frontend URLs in `app.ts`
2. **Duplicate Games**: Check database constraints
3. **Missing Words**: Run seeding script
4. **Authentication**: Verify Discord OAuth setup

### Debug Endpoints
- Check API health: `GET /api/ping`
- View API docs: `GET /api-docs`
- Monitor logs for word generation

This integration provides a complete, production-ready backend for the PexNet Wordle game with robust error handling, security features, and performance optimizations.
