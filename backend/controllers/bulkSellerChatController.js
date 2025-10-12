const BulkSellerChat = require('../models/BulkSellerChat');

const validateCreate = (body) => {
  const { seller_id, buyer_id, message, sent_by } = body;
  if (!seller_id || !buyer_id) return 'seller_id and buyer_id are required';
  if (!message || !message.trim()) return 'message is required';
  if (!['seller', 'buyer'].includes(sent_by)) return "sent_by must be 'seller' or 'buyer'";
  return null;
};

exports.createMessage = async (req, res) => {
  try {
    const err = validateCreate(req.body);
    if (err) return res.status(400).json({ success: false, error: err });

    const id = await BulkSellerChat.create(req.body);
    const message = await BulkSellerChat.getByConversation({ seller_id: req.body.seller_id, buyer_id: req.body.buyer_id, limit: 1, offset: 0 });
    return res.status(201).json({ success: true, data: { id, message: message[0] || null } });
  } catch (error) {
    console.error('createMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create message', details: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { seller_id, buyer_id } = req.query;
    if (!seller_id || !buyer_id) return res.status(400).json({ success: false, error: 'seller_id and buyer_id query params required' });
    const { limit = 100, offset = 0 } = req.query;
    const rows = await BulkSellerChat.getByConversation({ seller_id, buyer_id, limit, offset });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getConversation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch conversation', details: error.message });
  }
};

exports.listBySeller = async (req, res) => {
  try {
    const seller_id = req.params.sellerId || req.query.seller_id;
    if (!seller_id) return res.status(400).json({ success: false, error: 'sellerId param is required' });
    const { limit = 100, offset = 0 } = req.query;
    const rows = await BulkSellerChat.getBySeller(seller_id, limit, offset);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('listBySeller error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch seller messages', details: error.message });
  }
};

exports.listByBuyer = async (req, res) => {
  try {
    const buyer_id = req.params.buyerId || req.query.buyer_id;
    if (!buyer_id) return res.status(400).json({ success: false, error: 'buyerId param is required' });
    const { limit = 100, offset = 0 } = req.query;
    const rows = await BulkSellerChat.getByBuyer(buyer_id, limit, offset);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('listByBuyer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch buyer messages', details: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await BulkSellerChat.delete(id);
    if (!ok) return res.status(404).json({ success: false, error: 'Message not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('deleteMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete message', details: error.message });
  }
};
