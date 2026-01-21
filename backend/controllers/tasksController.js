const db = require('../db/database');

const tasksController = {
  getAll: (req, res) => {
    const { userId, date } = req.query;
    let sql = `SELECT * FROM tasks`;
    const params = [];

    // Simple filtering for now. 
    // Ideally we filter by userId and date range like the Supabase query did.
    // Supabase query was: .gte('start_time', startOfDay).lte('start_time', endOfDay)
    
    if (userId) {
        sql += ` WHERE user_id = ?`;
        params.push(userId);
    }
    
    // Date filtering logic implies we need smart WHERE clauses
    // For simplicity in this demo, let's just return all and filter user_id
    // Or implment the date range check in SQL:
    if (date) {
        // Assume 'date' param is "YYYY-MM-DD" representing the local calendar day
        // We want to cover the full 24h of that day in the SERVER'S local time.
        
        // Construct local dates
        const startOfDay = new Date(date + 'T00:00:00');
        const endOfDay = new Date(date + 'T23:59:59.999');
        
        sql += (userId ? ' AND' : ' WHERE') + ` start_time >= ? AND start_time <= ?`;
        params.push(startOfDay.toISOString());
        params.push(endOfDay.toISOString());
    }
    
    sql += ` ORDER BY start_time ASC`;

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  },

  create: (req, res) => {
    const { title, description, start_time, estimated_duration, is_deadline, is_course, user_id } = req.body;
    const sql = `INSERT INTO tasks (title, description, start_time, estimated_duration, is_deadline, is_course, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;
    
    db.run(sql, [title, description, start_time, estimated_duration, is_deadline, is_course, user_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Fetch the created task to return it
      db.get(`SELECT * FROM tasks WHERE id = ?`, [this.lastID], (err, row) => {
          res.json(row);
      });
    });
  },

  update: (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (keys.length === 0) return res.json({ message: 'No updates provided' });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    
    const sql = `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [...values, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Updated', changes: this.changes });
    });
  },

  delete: (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM tasks WHERE id = ?`, [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Deleted', changes: this.changes });
    });
  }
};

module.exports = tasksController;
