const { pool } = require('../config/database'); // Import pool like other models

// Create Pest Alert
exports.createPestAlert = async (moderatorId, pestName, symptoms, severity, recommendations) => {
  const [result] = await pool.execute(
    'INSERT INTO PestAlerts (moderatorId, pestName, symptoms, severity) VALUES (?, ?, ?, ?)',
    [moderatorId, pestName, symptoms, severity]
  );
  const pestAlertId = result.insertId;

  for (const rec of recommendations) {
    await pool.execute(
      'INSERT INTO PestRecommendations (pestAlertId, recommendation) VALUES (?, ?)',
      [pestAlertId, rec]
    );
  }
  return pestAlertId;
};
