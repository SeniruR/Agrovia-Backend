
const PestAlert = require('../models/PestAlert');

// Validation helper
const validatePestAlertData = (data, isUpdate = false) => {
  const errors = [];
  if (!isUpdate && !data.title) errors.push('Title is required');
  if (!isUpdate && !data.description) errors.push('Description is required');
  if (!isUpdate && !data.reported_by) errors.push('Reporter ID is required');
  if (data.severity && !['low', 'medium', 'high', 'critical'].includes(data.severity)) errors.push('Invalid severity level');
  if (data.status && !['active', 'resolved', 'monitoring', 'escalated'].includes(data.status)) errors.push('Invalid status');
  if (data.pest_type && !['insect', 'disease', 'weed', 'rodent', 'bird', 'other'].includes(data.pest_type)) errors.push('Invalid pest type');
  if (data.affected_area && (isNaN(data.affected_area) || data.affected_area < 0)) errors.push('Affected area must be a positive number');
  if (data.estimated_loss && (isNaN(data.estimated_loss) || data.estimated_loss < 0)) errors.push('Estimated loss must be a positive number');
  if (data.latitude && (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90)) errors.push('Latitude must be between -90 and 90');
  if (data.longitude && (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180)) errors.push('Longitude must be between -180 and 180');
  if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) errors.push('Invalid email format');
  return errors;
};

exports.createPestAlert = async (req, res) => {
  try {
    const validationErrors = validatePestAlertData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationErrors });
    }
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({ url: `/uploads/${file.filename}`, originalName: file.originalname, size: file.size, uploadedAt: new Date().toISOString() }));
    }
    let tags = [];
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') { tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag); }
      else if (Array.isArray(req.body.tags)) { tags = req.body.tags; }
    }
    const alertData = { ...req.body, images, tags, weather_conditions: req.body.weather_conditions ? JSON.parse(req.body.weather_conditions) : null };
    const id = await PestAlert.create(alertData);
    res.status(201).json({ success: true, message: 'Pest alert created successfully', data: { id }, alertId: id });
  } catch (err) {
    console.error('Error creating pest alert:', err);
    res.status(500).json({ success: false, error: 'Failed to create pest alert', details: err.message });
  }
};

exports.getAllPestAlerts = async (req, res) => {
  try {
    const filters = { severity: req.query.severity, status: req.query.status, pest_type: req.query.pest_type, location: req.query.location, crop: req.query.crop, date_from: req.query.date_from, date_to: req.query.date_to, limit: req.query.limit };
    Object.keys(filters).forEach(key => { if (filters[key] === undefined) delete filters[key]; });
    const alerts = await PestAlert.getAll(filters);
    res.json({ success: true, data: alerts, count: alerts.length, filters: filters });
  } catch (err) {
    console.error('Error fetching pest alerts:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pest alerts', details: err.message });
  }
};

exports.getPestAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await PestAlert.getById(id);
    if (!alert) { return res.status(404).json({ success: false, error: 'Pest alert not found' }); }
    res.json({ success: true, data: alert });
  } catch (err) {
    console.error('Error fetching pest alert:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pest alert', details: err.message });
  }
};

exports.updatePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user ? req.user.id : req.body.updated_by;
    const validationErrors = validatePestAlertData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validationErrors });
    }
    let images;
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({ url: `/uploads/${file.filename}`, originalName: file.originalname, size: file.size, uploadedAt: new Date().toISOString() }));
    }
    let tags;
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') { tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag); }
      else if (Array.isArray(req.body.tags)) { tags = req.body.tags; }
    }
    const updateData = { ...req.body, ...(images && { images }), ...(tags && { tags }), weather_conditions: req.body.weather_conditions ? JSON.parse(req.body.weather_conditions) : undefined };
    const updated = await PestAlert.update(id, updateData, updatedBy);
    if (!updated) { return res.status(404).json({ success: false, error: 'Pest alert not found or not updated' }); }
    const updatedAlert = await PestAlert.getById(id);
    res.json({ success: true, message: 'Pest alert updated successfully', data: updatedAlert });
  } catch (err) {
    console.error('Error updating pest alert:', err);
    res.status(500).json({ success: false, error: 'Failed to update pest alert', details: err.message });
  }
};

exports.deletePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PestAlert.delete(id);
    if (!deleted) { return res.status(404).json({ success: false, error: 'Pest alert not found or not deleted' }); }
    res.json({ success: true, message: 'Pest alert deleted successfully' });
  } catch (err) {
    console.error('Error deleting pest alert:', err);
    res.status(500).json({ success: false, error: 'Failed to delete pest alert', details: err.message });
  }
};

exports.getPestAlertStatistics = async (req, res) => {
  try {
    const stats = await PestAlert.getStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', details: err.message });
  }
};

exports.searchPestAlerts = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    if (!searchTerm || searchTerm.trim().length < 2) { return res.status(400).json({ success: false, error: 'Search term must be at least 2 characters long' }); }
    const filters = { severity: req.query.severity, status: req.query.status };
    const results = await PestAlert.searchAlerts(searchTerm.trim(), filters);
    res.json({ success: true, data: results, count: results.length, searchTerm, filters });
  } catch (err) {
    console.error('Error searching pest alerts:', err);
    res.status(500).json({ success: false, error: 'Search failed', details: err.message });
  }
};

exports.getNearbyAlerts = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    if (!latitude || !longitude) { return res.status(400).json({ success: false, error: 'Latitude and longitude are required' }); }
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) { return res.status(400).json({ success: false, error: 'Invalid coordinates or radius' }); }
    const alerts = await PestAlert.getNearbyAlerts(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));
    res.json({ success: true, data: alerts, count: alerts.length, searchCenter: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }, radiusKm: parseFloat(radius) });
  } catch (err) {
    console.error('Error fetching nearby alerts:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch nearby alerts', details: err.message });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updatedBy = req.user ? req.user.id : req.body.updated_by;
    if (!status || !['active', 'resolved', 'monitoring', 'escalated'].includes(status)) { return res.status(400).json({ success: false, error: 'Valid status is required' }); }
    const updateData = { status, ...(notes && { resolution_notes: notes }) };
    const updated = await PestAlert.update(id, updateData, updatedBy);
    if (!updated) { return res.status(404).json({ success: false, error: 'Pest alert not found' }); }
    res.json({ success: true, message: `Alert status updated to ${status}` });
  } catch (err) {
    console.error('Error updating alert status:', err);
    res.status(500).json({ success: false, error: 'Failed to update alert status', details: err.message });
  }
};

exports.verifyAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const verifiedBy = req.user ? req.user.id : req.body.verified_by;
    if (!verifiedBy) { return res.status(400).json({ success: false, error: 'Verifier ID is required' }); }
    const updateData = { is_verified: true, verified_by: verifiedBy };
    const updated = await PestAlert.update(id, updateData, verifiedBy);
    if (!updated) { return res.status(404).json({ success: false, error: 'Pest alert not found' }); }
    res.json({ success: true, message: 'Alert verified successfully' });
  } catch (err) {
    console.error('Error verifying alert:', err);
    res.status(500).json({ success: false, error: 'Failed to verify alert', details: err.message });
  }
};

exports.getAlertHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await PestAlert.getUpdateHistory(id);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('Error fetching alert history:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch alert history', details: err.message });
  }
};
