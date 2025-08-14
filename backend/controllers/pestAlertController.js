const PestAlert = require('../models/PestAlert');

exports.createPestAlert = async (req, res) => {
  try {
    const { title, description, location, severity, reported_by } = req.body;
    if (!title || !description || !reported_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = await PestAlert.create({ title, description, location, severity, reported_by });
    res.status(201).json({ message: 'Pest alert created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPestAlerts = async (req, res) => {
  try {
    const alerts = await PestAlert.getAll();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPestAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await PestAlert.getById(id);
    if (!alert) return res.status(404).json({ error: 'Not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, severity } = req.body;
    const updated = await PestAlert.update(id, { title, description, location, severity });
    if (!updated) return res.status(404).json({ error: 'Not found or not updated' });
    res.json({ message: 'Pest alert updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PestAlert.delete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found or not deleted' });
    res.json({ message: 'Pest alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
