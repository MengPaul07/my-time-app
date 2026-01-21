const db = require('../db/database');

const coursesController = {
  getAll: (req, res) => {
    const { userId } = req.query;
    let sql = `SELECT * FROM courses`;
    const params = [];

    if (userId) {
        sql += ` WHERE user_id = ?`;
        params.push(userId);
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  },

  create: (req, res) => {
    const { name, location, day_of_week, start_time, end_time, color, user_id } = req.body;
    const sql = `INSERT INTO courses (name, location, day_of_week, start_time, end_time, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [name, location, day_of_week, start_time, end_time, color, user_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(`SELECT * FROM courses WHERE id = ?`, [this.lastID], (err, row) => {
          res.json(row);
      });
    });
  },

  update: (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates).filter(k => k !== 'id');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    
    const sql = `UPDATE courses SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [...values, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Updated', changes: this.changes });
    });
  },

  delete: (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM courses WHERE id = ?`, [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Deleted', changes: this.changes });
    });
  }
};

module.exports = coursesController;
