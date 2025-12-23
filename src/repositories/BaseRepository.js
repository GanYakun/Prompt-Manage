// Base repository class with common database operations
class BaseRepository {
  constructor(databaseManager, tableName) {
    this.db = databaseManager;
    this.tableName = tableName;
  }

  // Generate unique ID
  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get current timestamp
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Basic CRUD operations
  async create(data) {
    const id = data.id || this.generateId();
    const now = this.getCurrentTimestamp();
    
    const record = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };

    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await this.db.run(sql, values);
    return record;
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await this.db.get(sql, [id]);
  }

  async findAll(orderBy = 'created_at DESC') {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`;
    return await this.db.all(sql);
  }

  async update(id, data) {
    const now = this.getCurrentTimestamp();
    const updateData = {
      ...data,
      updated_at: now
    };

    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => updateData[col]), id];

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    const result = await this.db.run(sql, values);
    return result.changes > 0;
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  async count() {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const result = await this.db.get(sql);
    return result.count;
  }

  async exists(id) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const result = await this.db.get(sql, [id]);
    return !!result;
  }

  // Transaction support
  async transaction(fn) {
    return await this.db.transaction(fn);
  }
}

module.exports = BaseRepository;