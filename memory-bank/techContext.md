# Technical Context

## Technology Stack

### Frontend
- **Next.js 14+**
  - React Server Components
  - Client-side components with "use client" directive
  - App Router architecture

- **React Ecosystem**
  - React Hooks for state management
  - MaterialReactTable for data grids
  - react-modal for modal dialogs
  - js-cookie for cookie management

- **Styling**
  - CSS Modules (page.module.css)
  - Global styles (globals.css)
  - AWS Amplify UI styles

### Backend
- **AWS Amplify**
  - Authentication via Cognito
  - AppSync/GraphQL API
  - DynamoDB storage
  - Amplify CLI for deployments

### Development Tools
- **TypeScript**
  - Strong type definitions
  - Interface definitions for data models
  - Type safety for API interactions

- **Package Management**
  - npm/Node.js
  - package.json configuration
  - Dependency management

## Data Models

### Member Model
```typescript
type Member = {
    vanId: string;
    name: string;
    preferredEmail: string;
}
```

### Vote Model
```typescript
type Vote = {
    username: string;
    email: string;
    time: string;
    choice: string;
}
```

### Alias Model
```typescript
type Alias = {
    vanId: string;
    alias: string;
}
```

### Poll Result Model
```typescript
type PollResult = {
    name: string;
    question: string;
    votes: Vote[];
    categorizedVotes: CategorizedVotes;
    choiceToVotes: Map<string, number>;
}
```

## File Formats

### Input Files
- **Member Lists**: TSV format
  - Required columns: VANID
  - Optional columns: Name, Email
  - Example: `123456789\tBig Bird\tbird@sesamestreet.org`

- **Vote Data**: CSV format
  - Headers starting with '#'
  - Required fields: User Name, Email Address, Submitted Date and Time, Choice
  - Supports multi-line entries
  - Handles quoted fields

## Development Setup

### Environment Requirements
- Node.js environment
- AWS Amplify CLI
- TypeScript support
- Git version control

### Configuration Files
- **next.config.js**: Next.js configuration
- **tsconfig.json**: TypeScript settings
- **amplify.yml**: Amplify build settings
- **package.json**: Dependencies and scripts

### AWS Resources
- Cognito User Pool
- AppSync API
- DynamoDB Tables
- S3 Storage (if needed)

## Technical Constraints

### Browser Support
- Modern browsers with ES6+ support
- CSS Grid/Flexbox support
- Local storage/Cookie support

### Performance Requirements
- Fast file parsing for large datasets
- Efficient vote matching algorithm
- Responsive UI updates
- Smooth data grid rendering

### Security Requirements
- Secure file handling
- Data encryption
- Authentication
- Access control
- Safe cookie usage

## Development Patterns

### State Management
- React useState for component state
- useEffect for side effects
- Custom hooks for reusable logic
- Cookie persistence for aliases

### Error Handling
- Structured error messages
- Type-safe error handling
- User-friendly error displays
- Validation at multiple levels

### Testing Strategy
- Test data files
- Sample input formats
- Error case testing
- Edge case handling

### Code Organization
- Feature-based component structure
- Type definitions
- Utility functions
- Reusable components
