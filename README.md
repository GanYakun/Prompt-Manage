# Prompt Version Manager

A desktop application built with Electron for managing and versioning prompts with full version control capabilities.

## Features

- ✅ **Automatic Version Control**: Every prompt modification creates a new version
- ✅ **Version Comparison**: Compare any two versions with visual diff
- ✅ **Version Rollback**: Restore any previous version while preserving history
- ✅ **Template Library**: Create reusable prompt templates
- ✅ **Full-Text Search**: Search across all prompts, versions, and tags
- ✅ **Export/Import**: Backup and migrate data in JSON format
- ✅ **Offline First**: All data stored locally, no internet required

## Project Structure

```
prompt-version-manager/
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Preload script for IPC
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── database/
│   │   └── DatabaseManager.ts  # SQLite database management
│   ├── repositories/           # Data access layer
│   ├── services/               # Business logic layer
│   └── utils/                  # Utility functions
├── renderer/
│   └── index.html              # Main UI
├── dist/                       # Compiled TypeScript output
├── .kiro/
│   └── specs/                  # Feature specifications
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the application
npm start
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Database Schema

The application uses SQLite with the following tables:

- **prompts**: Main prompt data with current content
- **prompt_versions**: Historical versions of each prompt
- **templates**: Reusable prompt templates
- **search_index**: Full-text search index

## Technology Stack

- **Electron**: Desktop application framework
- **TypeScript**: Type-safe JavaScript
- **SQLite (better-sqlite3)**: Local database
- **Jest**: Testing framework
- **fast-check**: Property-based testing

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases
- **Property-Based Tests**: Universal properties across all inputs

Run tests with:
```bash
npm test
```

## License

MIT