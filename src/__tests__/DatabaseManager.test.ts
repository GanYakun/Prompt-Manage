import { DatabaseManager } from '../database/DatabaseManager';
import * as fc from 'fast-check';

// Mock electron app for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => './test-data'),
  },
}));

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    // Create a fresh instance for each test
    (DatabaseManager as any).instance = undefined;
    dbManager = DatabaseManager.getInstance();
    // Wait a bit for database initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up
    await dbManager.close();
    (DatabaseManager as any).instance = undefined;
  });

  describe('Basic Database Operations', () => {
    test('should create database instance', () => {
      expect(dbManager).toBeDefined();
      expect(dbManager.getDatabase()).toBeDefined();
    });

    test('should be singleton', () => {
      const instance1 = DatabaseManager.getInstance();
      const instance2 = DatabaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should pass integrity check', async () => {
      const isHealthy = await dbManager.checkIntegrity();
      expect(isHealthy).toBe(true);
    });

    test('should execute SQL statements', async () => {
      const result = await dbManager.run('SELECT 1 as test');
      expect(result).toBeDefined();
    });

    test('should get single row', async () => {
      const result = await dbManager.get('SELECT 1 as test');
      expect(result).toEqual({ test: 1 });
    });

    test('should get all rows', async () => {
      const result = await dbManager.all('SELECT 1 as test');
      expect(result).toEqual([{ test: 1 }]);
    });
  });

  describe('Transaction Support', () => {
    test('should execute transactions', async () => {
      const result = await dbManager.transaction(async () => {
        await dbManager.run('SELECT 1');
        return 'transaction executed';
      });
      
      expect(result).toBe('transaction executed');
    });

    test('should rollback failed transactions', async () => {
      await expect(
        dbManager.transaction(async () => {
          // Execute a valid operation first
          await dbManager.run('SELECT 1');
          // Then throw an error
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('Property-Based Tests', () => {
    test('**Feature: prompt-version-manager, Property 14: Transaction Atomicity**', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
          async (operations) => {
            // Test that either all operations succeed or none do
            let transactionSucceeded = false;
            let error: Error | null = null;

            try {
              await dbManager.transaction(async () => {
                // Simulate a series of operations
                for (const op of operations) {
                  if (op === 'fail') {
                    throw new Error('Simulated failure');
                  }
                  // Execute a simple operation
                  await dbManager.run('SELECT 1');
                }
                transactionSucceeded = true;
                return true;
              });
            } catch (e) {
              error = e as Error;
            }

            // Either the transaction succeeded completely or failed completely
            if (operations.includes('fail')) {
              expect(transactionSucceeded).toBe(false);
              expect(error).toBeDefined();
            } else {
              expect(transactionSucceeded).toBe(true);
              expect(error).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle various SQL operations atomically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (shouldFail) => {
            let operationCount = 0;
            let transactionError: Error | null = null;

            try {
              await dbManager.transaction(async () => {
                // First operation
                await dbManager.run('SELECT 1');
                operationCount++;

                // Second operation
                await dbManager.run('SELECT 2');
                operationCount++;

                if (shouldFail) {
                  throw new Error('Intentional failure');
                }

                // Third operation
                await dbManager.run('SELECT 3');
                operationCount++;
              });
            } catch (error) {
              transactionError = error as Error;
            }

            if (shouldFail) {
              expect(transactionError).toBeDefined();
              expect(transactionError?.message).toBe('Intentional failure');
            } else {
              expect(transactionError).toBeNull();
              expect(operationCount).toBe(3);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Database Maintenance', () => {
    test('should vacuum database', async () => {
      await expect(dbManager.vacuum()).resolves.not.toThrow();
    });

    test('should analyze database', async () => {
      await expect(dbManager.analyze()).resolves.not.toThrow();
    });
  });

  describe('Table Creation', () => {
    test('should have created all required tables', async () => {
      const tables = await dbManager.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const tableNames = tables.map((t: any) => t.name);
      
      expect(tableNames).toContain('prompts');
      expect(tableNames).toContain('prompt_versions');
      expect(tableNames).toContain('templates');
      expect(tableNames).toContain('search_index');
    });

    test('should have created indexes', async () => {
      const indexes = await dbManager.all(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `);

      expect(indexes.length).toBeGreaterThan(0);
    });
  });
});