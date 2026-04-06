const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'my-time.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath, err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Tasks Table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending', 
      estimated_duration INTEGER DEFAULT 0,
      actual_duration INTEGER DEFAULT 0,
      start_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_course BOOLEAN DEFAULT 0,
      location TEXT,
      color TEXT,
      is_deadline BOOLEAN DEFAULT 0,
      is_recurring BOOLEAN DEFAULT 0,
      recurring_days TEXT
    )`);

    db.run(`ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT 0`, (err) => {
      if (err && !String(err.message).includes('duplicate column name')) {
        console.error('Failed to add is_recurring column:', err.message);
      }
    });

    db.run(`ALTER TABLE tasks ADD COLUMN recurring_days TEXT`, (err) => {
      if (err && !String(err.message).includes('duplicate column name')) {
        console.error('Failed to add recurring_days column:', err.message);
      }
    });

    // Courses Table
    db.run(`CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT NOT NULL,
      location TEXT,
      day_of_week INTEGER,
      start_time TEXT,
      end_time TEXT,
      color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('Tables initialized.');
  });
}

module.exports = db;
