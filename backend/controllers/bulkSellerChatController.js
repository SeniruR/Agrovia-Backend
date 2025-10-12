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
    // Authorization: only seller or buyer or admin can create a message in this conversation
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
    const uid = Number(authUser.id || authUser.userId);
    const sellerId = Number(req.body.seller_id);
    const buyerId = Number(req.body.buyer_id);
    const isAdmin = authUser.role === 'admin';
    if (!isAdmin && uid !== sellerId && uid !== buyerId) {
      return res.status(403).json({ success: false, error: 'Not authorized to send message for this conversation' });
    }

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
    // Authorization: only seller or buyer or admin can view
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
    const uid = Number(authUser.id || authUser.userId);
    const sId = Number(seller_id);
    const bId = Number(buyer_id);
    const isAdmin = authUser.role === 'admin';
    if (!isAdmin && uid !== sId && uid !== bId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this conversation' });
    }
    const rows = await BulkSellerChat.getByConversation({ seller_id: sId, buyer_id: bId, limit, offset });
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
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
    const uid = Number(authUser.id || authUser.userId);
    const sId = Number(seller_id);
    const isAdmin = authUser.role === 'admin';
    if (!isAdmin && uid !== sId) return res.status(403).json({ success: false, error: 'Not authorized' });
    const rows = await BulkSellerChat.getBySeller(sId, limit, offset);
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
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
    const uid = Number(authUser.id || authUser.userId);
    const bId = Number(buyer_id);
    const isAdmin = authUser.role === 'admin';
    if (!isAdmin && uid !== bId) return res.status(403).json({ success: false, error: 'Not authorized' });
    const rows = await BulkSellerChat.getByBuyer(bId, limit, offset);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('listByBuyer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch buyer messages', details: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const msg = await BulkSellerChat.getById(id);
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
    const uid = Number(authUser.id || authUser.userId);
    const isAdmin = authUser.role === 'admin';
    if (!isAdmin && uid !== Number(msg.seller_id) && uid !== Number(msg.buyer_id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }
    const ok = await BulkSellerChat.delete(id);
    if (!ok) return res.status(500).json({ success: false, error: 'Failed to delete message' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('deleteMessage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete message', details: error.message });
  }
};
