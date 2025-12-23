// Core data models for the Prompt Version Manager

export interface Prompt {
  id: string;              // UUID identifier
  title: string;           // User-defined name
  content: string;         // Current prompt text
  tags: string[];          // Categorization tags
  createdAt: Date;         // Initial creation timestamp
  updatedAt: Date;         // Last modification timestamp
  currentVersionId: string; // Reference to latest version
  versionCount: number;    // Total number of versions
}

export interface PromptVersion {
  id: string;              // UUID identifier
  promptId: string;        // Parent prompt reference
  content: string;         // Version content snapshot
  note?: string;           // Optional modification description
  createdAt: Date;         // Version creation timestamp
  versionNumber: number;   // Sequential version number
  isRollback: boolean;     // Indicates if version is from rollback
  sourceVersionId?: string; // Reference to rollback source version
}

export interface Template {
  id: string;              // UUID identifier
  name: string;            // Template name
  content: string;         // Template content pattern
  description: string;     // Usage description
  tags: string[];          // Categorization tags
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last modification timestamp
  usageCount: number;      // Number of times used
}

export interface SearchIndex {
  id: string;              // UUID identifier
  entityId: string;        // Reference to Prompt or Version
  entityType: 'prompt' | 'version' | 'template';
  content: string;         // Searchable text content
  title?: string;          // Searchable title
  tags: string[];          // Searchable tags
  lastIndexed: Date;       // Index update timestamp
}

// Data transfer objects
export interface CreatePromptData {
  title: string;
  content: string;
  tags: string[];
}

export interface CreateTemplateData {
  name: string;
  content: string;
  description: string;
  tags: string[];
}

export interface TemplateCustomizations {
  title?: string;
  additionalTags?: string[];
}

// Diff and comparison types
export interface DiffLine {
  lineNumber: number;
  content: string;
  type: 'addition' | 'deletion' | 'modification' | 'unchanged';
}

export interface DiffResult {
  additions: DiffLine[];
  deletions: DiffLine[];
  modifications: DiffLine[];
  unchanged: DiffLine[];
}

// Search types
export interface SearchQuery {
  keywords: string[];
  tags?: string[];
  dateRange?: DateRange;
  includeHistory?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SearchResult {
  prompt: Prompt;
  matchedContent: string;
  relevanceScore: number;
  matchType: 'title' | 'content' | 'tag' | 'history';
}

// Export/Import types
export interface ExportData {
  version: string;
  exportDate: string;
  prompts?: Prompt[];
  templates?: Template[];
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  totalPrompts: number;
  totalVersions: number;
  totalTemplates: number;
  exportType: 'single' | 'all' | 'templates' | 'complete';
}

export interface ImportResult {
  success: boolean;
  importedPrompts: number;
  importedVersions: number;
  importedTemplates: number;
  errors: string[];
}

// Database row types (for SQLite integration)
export interface PromptRow {
  id: string;
  title: string;
  content: string;
  tags: string; // JSON string
  created_at: string;
  updated_at: string;
  current_version_id: string;
  version_count: number;
}

export interface PromptVersionRow {
  id: string;
  prompt_id: string;
  content: string;
  note?: string;
  created_at: string;
  version_number: number;
  is_rollback: number; // SQLite boolean as integer
  source_version_id?: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  content: string;
  description: string;
  tags: string; // JSON string
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface SearchIndexRow {
  id: string;
  entity_id: string;
  entity_type: string;
  content: string;
  title?: string;
  tags: string; // JSON string
  last_indexed: string;
}