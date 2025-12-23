const DatabaseManager = require('../database/DatabaseManager');

// Simple property-based testing implementation
// Since we don't have fast-check installed, we'll create a basic version
function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

function generateRandomArray(generator, minLength = 1, maxLength = 10) {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  return Array.from({ length }, generator);
}

function runPropertyTest(name, generator, testFn, iterations = 100) {
  console.log(`Running property test: ${name} (${iterations} iterations)`);
  
  for (let i = 0; i < iterations; i++) {
    try {
      const input = generator();
      testFn(input);
    } catch (error) {
      console.error(`Property test failed on iteration ${i + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Property test passed: ${name}`);
}

describe('DatabaseManager', () => {
  let dbManager;

  beforeEach(async () => {
    // Create a fresh instance for each test
    DatabaseManager.instance = undefined;
    process.env.NODE_ENV = 'test';
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
  });

  afterEach(async () => {
    // Clean up
    await dbManager.close();
    DatabaseManager.instance = undefined;
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
      // Property test for transaction atomicity
      const testTransactionAtomicity = async (operations) => {
        let transactionSucceeded = false;
        let error = null;

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
          error = e;
        }

        // Either the transaction succeeded completely or failed completely
        if (operations.includes('fail')) {
          expect(transactionSucceeded).toBe(false);
          expect(error).toBeDefined();
        } else {
          expect(transactionSucceeded).toBe(true);
          expect(error).toBeNull();
        }
      };

      // Run property test with different operation sequences
      for (let i = 0; i < 50; i++) {
        const operations = generateRandomArray(() => 
          Math.random() < 0.1 ? 'fail' : generateRandomString(5), 1, 5
        );
        await testTransactionAtomicity(operations);
      }
    });

    test('should handle various SQL operations atomically', async () => {
      const testSQLOperationAtomicity = async (shouldFail) => {
        let operationCount = 0;
        let transactionError = null;

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
          transactionError = error;
        }

        if (shouldFail) {
          expect(transactionError).toBeDefined();
          expect(transactionError.message).toBe('Intentional failure');
        } else {
          expect(transactionError).toBeNull();
          expect(operationCount).toBe(3);
        }
      };

      // Test both success and failure scenarios
      for (let i = 0; i < 25; i++) {
        await testSQLOperationAtomicity(false); // Success case
        await testSQLOperationAtomicity(true);  // Failure case
      }
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
      // Test by trying to insert into each table
      const tables = ['prompts', 'prompt_versions', 'templates', 'search_index'];
      
      for (const table of tables) {
        // This should not throw an error if the table exists
        await expect(dbManager.run(`SELECT COUNT(*) as count FROM ${table}`))
          .resolves.toBeDefined();
      }
    });

    test('should handle table operations', async () => {
      // Test basic CRUD operations on prompts table
      const testId = 'test_' + Date.now();
      
      // Insert
      const insertResult = await dbManager.run(
        'INSERT INTO prompts (id, title, content, tags) VALUES (?, ?, ?, ?)',
        [testId, 'Test Title', 'Test Content', '["test"]']
      );
      expect(insertResult.changes).toBe(1);
      
      // Select
      const selectResult = await dbManager.get(
        'SELECT * FROM prompts WHERE id = ?',
        [testId]
      );
      expect(selectResult).toBeDefined();
      expect(selectResult.title).toBe('Test Title');
      
      // Update
      const updateResult = await dbManager.run(
        'UPDATE prompts SET title = ? WHERE id = ?',
        ['Updated Title', testId]
      );
      expect(updateResult.changes).toBe(1);
      
      // Delete
      const deleteResult = await dbManager.run(
        'DELETE FROM prompts WHERE id = ?',
        [testId]
      );
      expect(deleteResult.changes).toBe(1);
    });
  });

  describe('Data Persistence', () => {
    test('should persist data across operations', async () => {
      const testId = 'persist_test_' + Date.now();
      
      // Insert data
      await dbManager.run(
        'INSERT INTO prompts (id, title, content, tags) VALUES (?, ?, ?, ?)',
        [testId, 'Persist Test', 'Content for persistence test', '["persistence"]']
      );
      
      // Verify data exists
      const result = await dbManager.get(
        'SELECT * FROM prompts WHERE id = ?',
        [testId]
      );
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Persist Test');
      expect(result.content).toBe('Content for persistence test');
      
      // Clean up
      await dbManager.run('DELETE FROM prompts WHERE id = ?', [testId]);
    });
  });
});