// db.js - SQLite pool for BulkSellerChat model compatibility
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');

// Export a pool-like interface for compatibility
const pool = {
  execute: async (query, params = []) => {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const stmt = await db.prepare(query);
    let result;
    if (query.trim().toLowerCase().startsWith('select')) {
      result = await stmt.all(params);
    } else {
      result = await stmt.run(params);
    }
    await stmt.finalize();
    await db.close();
    // For insert, return insertId
    if (result && result.lastID !== undefined) {
      return [{ insertId: result.lastID }];
    }
    return [result];
  }
};

module.exports = pool;
