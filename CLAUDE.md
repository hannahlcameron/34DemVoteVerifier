# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Democratic party vote verification web application built with Next.js 14 and AWS Amplify. It validates votes against membership lists to ensure election integrity for Democratic party elections.

## Development Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Testing
npm run test               # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:e2e          # Setup test data and run dev server

# Linting
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix ESLint issues
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: AWS Amplify (Cognito, AppSync GraphQL, DynamoDB)
- **UI**: Material-UI, Material React Table, React Modal
- **Testing**: Jest + React Testing Library + jsdom
- **External APIs**: Zoom API integration for poll data retrieval

### Core Structure
```
app/
├── components/        # React components (tabs, modals, forms)
├── hooks/            # Custom hooks (useVoteProcessing, useAliases, useZoomIntegration)
├── styles/           # CSS modules for components
├── api/              # Next.js API routes (including Zoom OAuth endpoints)
└── vote-verification.ts  # Core business logic for vote validation

test/
├── components/       # Component unit tests
├── integration/      # Integration tests for vote processing
└── data/            # Test data files (TSV member lists, CSV votes)
```

### Key Data Models
```typescript
interface Member {
  vanId: string;        # Unique voter ID
  name: string;         # Full name
  preferredEmail: string;
}

interface Vote {
  username: string;     # Voter username
  email: string;        # Voter email
  time: string;         # Vote timestamp
  choice: string;       # Vote choice
}
```

## Core Features

### Vote Verification Process
1. **Member List Processing**: Handles TSV files with full (6+ columns) or simple (3 columns) formats
2. **Vote Data Processing**: Parses CSV files from various poll platforms
3. **Matching Strategies**: Email-based matching with alias support for alternative emails
4. **Categorization**: Separates votes into valid, invalid, and duplicate categories
5. **Multi-Poll Support**: Processes multiple polls simultaneously

### Component Architecture
- **TabNavigation**: Main interface with Members, Polls, and Aliases tabs
- **MembersTab**: Member list upload and management
- **PollsTab**: Vote file processing and results display
- **AliasModal**: Alternative email/name management
- **VoteSummary**: Results visualization with Material React Table

## Testing Strategy

### Test Structure
- **Unit Tests**: Individual component testing with React Testing Library
- **Integration Tests**: Full vote processing workflows
- **Test Data**: Comprehensive test files covering edge cases

### Key Test Patterns
```bash
# Run specific test
npm run test -- --testNamePattern="vote verification"

# Run tests for specific component
npm run test -- PollsTab.test.tsx

# Run with coverage
npm run test:coverage
```

## Development Patterns

### State Management
- Custom hooks for complex state (`useVoteProcessing`, `useAliases`, `useZoomIntegration`)
- React Context for global state when needed
- In-memory storage for aliases (Map-based)
- Secure token storage in httpOnly cookies for Zoom OAuth

### File Processing
- Robust CSV/TSV parsing with Papa Parse
- Error handling for malformed data
- Support for various poll platform formats
- Zoom API integration for direct poll data retrieval

### TypeScript Configuration
- Strict mode enabled
- Path aliases: `@/` maps to `app/`
- Comprehensive type definitions for all data models

## Code Quality

### ESLint Configuration
- React and React Hooks rules
- JSX accessibility rules
- TypeScript-specific rules
- Auto-fix available via `npm run lint:fix`

### CSS Approach
- CSS Modules for component-specific styles
- Global CSS for application-wide styles
- Material-UI theme integration

## AWS Amplify Integration

### Backend Services
- **Authentication**: Cognito user pools
- **API**: AppSync GraphQL endpoint
- **Storage**: DynamoDB for data persistence
- **Deployment**: Automated via `amplify.yml`

### Local Development
- Amplify sandbox for local testing
- Mock data available in `test/data/` directory
- No AWS credentials required for basic development

## Zoom API Integration

### Setup Requirements
1. Create a Zoom app at https://marketplace.zoom.us/develop/create
2. Configure OAuth redirect URI: `http://localhost:3000/api/zoom/callback`
3. Add environment variables to `.env.local`:
   ```
   ZOOM_CLIENT_ID=your_zoom_client_id
   ZOOM_CLIENT_SECRET=your_zoom_client_secret
   ZOOM_REDIRECT_URI=http://localhost:3000/api/zoom/callback
   NEXTAUTH_URL=http://localhost:3000
   ```

### API Endpoints
- `GET /api/zoom/auth` - Initiates OAuth flow
- `GET /api/zoom/callback` - Handles OAuth callback
- `GET /api/zoom/meetings` - Lists user's past meetings with poll counts
- `GET /api/zoom/polls/[meetingId]` - Retrieves poll data for specific meeting

### Features
- OAuth 2.0 authentication with Zoom
- Meeting list with poll count indicators
- Direct poll data import from Zoom meetings
- Secure token storage in httpOnly cookies
- Fallback to manual file upload if Zoom integration unavailable

### Limitations
- Poll data only available after meeting ends
- Some meetings may require manual poll report generation in Zoom UI
- Meetings shown are limited to last 30 days
- Guest vote data may be incomplete in some cases