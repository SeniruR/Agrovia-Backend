const TransporterReview = require('../models/TransporterReview');

const roleMap = {
  admin: 'moderator',
  moderator: 'moderator',
  main_moderator: 'moderator',
  buyer: 'buyer',
  farmer: 'farmer',
  shop_owner: 'shop_owner',
  transporter: 'transporter'
};

const normaliseReviewerRole = (role) => {
  if (!role) return 'buyer';
  const mapped = roleMap[role];
  if (mapped === 'transporter') {
    // Transporters should count as moderators when reviewing peers? default to moderator
    return 'moderator';
  }
  return mapped || 'buyer';
};

class TransporterReviewsController {
  static async createOrUpdate(req, res) {
    try {
      const reviewerId = req.user?.id;
      if (!reviewerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        order_transport_id = null,
        order_item_id,
        transporter_id,
        rating,
        comment = null,
        reviewer_role: explicitRole
      } = req.body || {};

      if (!order_item_id || !transporter_id || !rating) {
        return res.status(400).json({ success: false, message: 'order_item_id, transporter_id and rating are required' });
      }

      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(422).json({ success: false, message: 'Rating must be between 1 and 5' });
      }

      const reviewerRole = normaliseReviewerRole(explicitRole || req.user?.role);

      const review = await TransporterReview.createOrUpdate({
        order_transport_id,
        order_item_id,
        transporter_id,
        reviewer_id: reviewerId,
        reviewer_role: reviewerRole,
        rating: numericRating,
        comment
      });

      return res.status(201).json({ success: true, data: review });
    } catch (error) {
      console.error('Error creating transporter review:', error);
      return res.status(500).json({ success: false, message: 'Failed to save review' });
    }
  }

  static async getForOrderItem(req, res) {
    try {
      const reviewerId = req.user?.id;
      if (!reviewerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { orderItemId } = req.params;
      if (!orderItemId) {
        return res.status(400).json({ success: false, message: 'orderItemId param is required' });
      }

      const reviewerRole = normaliseReviewerRole(req.user?.role);
      const review = await TransporterReview.findByOrderItemAndReviewer(orderItemId, reviewerId, reviewerRole);
      return res.json({ success: true, data: review });
    } catch (error) {
      console.error('Error fetching transporter review:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch review' });
    }
  }

  static async getForTransporter(req, res) {
    try {
      const { transporterId } = req.params;
      if (!transporterId) {
        return res.status(400).json({ success: false, message: 'transporterId param is required' });
      }

      const reviews = await TransporterReview.findByTransporter(transporterId);
      return res.json({ success: true, data: reviews });
    } catch (error) {
      console.error('Error fetching transporter reviews:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch transporter reviews' });
    }
  }

  static async getSummary(req, res) {
    try {
      const { transporterId } = req.params;
      if (!transporterId) {
        return res.status(400).json({ success: false, message: 'transporterId param is required' });
      }

      const summary = await TransporterReview.getSummaryForTransporter(transporterId);
      return res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching transporter review summary:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch review summary' });
    }
  }
}

module.exports = TransporterReviewsController;
