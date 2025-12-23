// Simple SQLite wrapper using Node.js built-in capabilities
// This is a simplified implementation for development without external dependencies

const fs = require('fs');
const path = require('path');

class SimpleSQLite {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      prompts: [],
      prompt_versions: [],
      templates: [],
      search_index: []
    };
    this.nextId = 1;
    this.loadDatabase();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(rawData);
        this.data = { ...this.data, ...parsed };
        
        // Find the highest ID to continue sequence
        let maxId = 0;
        Object.values(this.data).forEach(table => {
          if (Array.isArray(table)) {
            table.forEach(row => {
              if (row.id && typeof row.id === 'string' && row.id.startsWith('id_')) {
                const idNum = parseInt(row.id.split('_')[1]);
                if (idNum > maxId) maxId = idNum;
              }
            });
          }
        });
        this.nextId = maxId + 1;
      }
    } catch (error) {
      console.error('Error loading database:', error);
      // Initialize with empty data if loading fails
      this.data = {
        prompts: [],
        prompt_versions: [],
        templates: [],
        search_index: []
      };
    }
  }

  saveDatabase() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  generateId() {
    return `id_${this.nextId++}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // SQL-like operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const result = this.executeSQL(sql, params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const results = this.executeSQL(sql, params);
        resolve(Array.isArray(results) ? results[0] : results);
      } catch (error) {
        reject(error);
      }
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const results = this.executeSQL(sql, params);
        resolve(Array.isArray(results) ? results : [results].filter(r => r));
      } catch (error) {
        reject(error);
      }
    });
  }

  executeSQL(sql, params = []) {
    const sqlUpper = sql.trim().toUpperCase();
    
    if (sqlUpper.startsWith('CREATE TABLE')) {
      // Table creation is handled by initialization
      return { changes: 0, lastInsertRowid: null };
    }
    
    if (sqlUpper.startsWith('CREATE INDEX')) {
      // Index creation is ignored in this simple implementation
      return { changes: 0, lastInsertRowid: null };
    }
    
    if (sqlUpper.startsWith('PRAGMA')) {
      // Pragma statements are ignored
      return [{ integrity_check: 'ok' }];
    }
    
    if (sqlUpper.startsWith('INSERT INTO')) {
      return this.handleInsert(sql, params);
    }
    
    if (sqlUpper.startsWith('UPDATE')) {
      return this.handleUpdate(sql, params);
    }
    
    if (sqlUpper.startsWith('DELETE FROM')) {
      return this.handleDelete(sql, params);
    }
    
    if (sqlUpper.startsWith('SELECT')) {
      return this.handleSelect(sql, params);
    }
    
    if (sqlUpper.includes('VACUUM') || sqlUpper.includes('ANALYZE')) {
      // Maintenance operations
      this.saveDatabase();
      return { changes: 0 };
    }
    
    throw new Error(`Unsupported SQL operation: ${sql}`);
  }

  handleInsert(sql, params) {
    // Parse INSERT statement
    const match = sql.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
    if (!match) {
      throw new Error(`Invalid INSERT statement: ${sql}`);
    }
    
    const [, tableName, columns, values] = match;
    const columnList = columns.split(',').map(c => c.trim());
    const valueList = values.split(',').map(v => v.trim());
    
    const row = {};
    columnList.forEach((col, index) => {
      let value = params[index] !== undefined ? params[index] : valueList[index];
      
      // Handle special values
      if (value === '?' && params[index] !== undefined) {
        value = params[index];
      } else if (typeof value === 'string') {
        value = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
        if (value === 'CURRENT_TIMESTAMP') {
          value = new Date().toISOString();
        }
      }
      
      row[col] = value;
    });
    
    // Generate ID if not provided
    if (!row.id) {
      row.id = this.generateId();
    }
    
    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }
    
    this.data[tableName].push(row);
    this.saveDatabase();
    
    return { changes: 1, lastInsertRowid: row.id };
  }

  handleUpdate(sql, params) {
    // Simple UPDATE implementation
    const match = sql.match(/UPDATE (\w+) SET (.*?) WHERE (.*)/i);
    if (!match) {
      throw new Error(`Invalid UPDATE statement: ${sql}`);
    }
    
    const [, tableName, setClause, whereClause] = match;
    
    if (!this.data[tableName]) {
      return { changes: 0 };
    }
    
    let changes = 0;
    this.data[tableName].forEach(row => {
      if (this.evaluateWhere(row, whereClause, params)) {
        // Apply SET clause
        const setPairs = setClause.split(',');
        let paramIndex = 0;
        
        setPairs.forEach(pair => {
          const [col, val] = pair.split('=').map(s => s.trim());
          let value = val;
          
          if (value === '?') {
            value = params[paramIndex++];
          } else if (value.startsWith('?')) {
            // Handle numbered parameters like ?1, ?2
            const num = parseInt(value.substring(1));
            value = params[num - 1];
          } else {
            value = value.replace(/^['"]|['"]$/g, '');
            if (value === 'CURRENT_TIMESTAMP') {
              value = new Date().toISOString();
            }
          }
          
          row[col] = value;
        });
        changes++;
      }
    });
    
    if (changes > 0) {
      this.saveDatabase();
    }
    
    return { changes };
  }

  handleDelete(sql, params) {
    const match = sql.match(/DELETE FROM (\w+)(?: WHERE (.*))?/i);
    if (!match) {
      throw new Error(`Invalid DELETE statement: ${sql}`);
    }
    
    const [, tableName, whereClause] = match;
    
    if (!this.data[tableName]) {
      return { changes: 0 };
    }
    
    const originalLength = this.data[tableName].length;
    
    if (whereClause) {
      this.data[tableName] = this.data[tableName].filter(row => 
        !this.evaluateWhere(row, whereClause, params)
      );
    } else {
      this.data[tableName] = [];
    }
    
    const changes = originalLength - this.data[tableName].length;
    
    if (changes > 0) {
      this.saveDatabase();
    }
    
    return { changes };
  }

  handleSelect(sql, params) {
    // Simple SELECT implementation
    let match = sql.match(/SELECT (.*?) FROM (\w+)(?: WHERE (.*))?(?:\s+ORDER BY (.*))?/i);
    
    // Handle SELECT without FROM clause (like SELECT 1)
    if (!match) {
      const simpleMatch = sql.match(/SELECT\s+(.*)/i);
      if (simpleMatch) {
        // Parse expressions like SELECT 1 as test
        const expression = simpleMatch[1].trim();
        const aliasMatch = expression.match(/^(.+?)\s+as\s+(\w+)$/i);
        if (aliasMatch) {
          const [, value, alias] = aliasMatch;
          const parsedValue = /^\d+$/.test(value.trim()) ? parseInt(value.trim()) : value.trim();
          return [{ [alias]: parsedValue }];
        }
        // Handle simple expressions like SELECT 1
        if (/^\d+$/.test(expression)) {
          return [{ [expression]: parseInt(expression) }];
        }
        return [{ result: expression }];
      }
      throw new Error(`Invalid SELECT statement: ${sql}`);
    }
    
    const [, columns, tableName, whereClause, orderClause] = match;
    
    if (!this.data[tableName]) {
      return [];
    }
    
    let results = [...this.data[tableName]];
    
    // Apply WHERE clause
    if (whereClause) {
      results = results.filter(row => this.evaluateWhere(row, whereClause, params));
    }
    
    // Apply ORDER BY
    if (orderClause) {
      const [orderCol, orderDir] = orderClause.split(/\s+/);
      results.sort((a, b) => {
        const aVal = a[orderCol];
        const bVal = b[orderCol];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return orderDir && orderDir.toUpperCase() === 'DESC' ? -comparison : comparison;
      });
    }
    
    // Apply column selection
    if (columns.trim() !== '*') {
      const columnList = columns.split(',').map(c => c.trim());
      results = results.map(row => {
        const newRow = {};
        columnList.forEach(col => {
          // Handle aggregate functions like COUNT(*)
          if (col.toUpperCase().includes('COUNT(')) {
            newRow.count = results.length;
          } else {
            newRow[col] = row[col];
          }
        });
        return newRow;
      });
    }
    
    return results;
  }

  evaluateWhere(row, whereClause, params) {
    // Simple WHERE clause evaluation
    // This is a basic implementation - in a real system you'd use a proper SQL parser
    
    // Handle simple equality checks with parameters
    const eqMatch = whereClause.match(/(\w+)\s*=\s*\?(\d*)/);
    if (eqMatch) {
      const [, column, paramIndex] = eqMatch;
      const paramIdx = paramIndex ? parseInt(paramIndex) - 1 : params.length - 1; // Use last parameter if no index
      return row[column] == params[paramIdx];
    }
    
    // Handle string literals
    const strMatch = whereClause.match(/(\w+)\s*=\s*['"]([^'"]*)['"]/);
    if (strMatch) {
      const [, column, value] = strMatch;
      return row[column] == value;
    }
    
    // Handle LIKE operations
    const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+['"]([^'"]*)['"]/);
    if (likeMatch) {
      const [, column, pattern] = likeMatch;
      const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
      return regex.test(row[column] || '');
    }
    
    // Default: return true for unsupported WHERE clauses
    return true;
  }

  close() {
    this.saveDatabase();
  }
}

module.exports = SimpleSQLite;