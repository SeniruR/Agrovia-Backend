const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const CropPost = require('./CropPost');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'CropPosts',
      key: 'id',
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  priceAtAddTime: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productUnit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  farmerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  productImage: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'carts',
  timestamps: true,
});

// Define associations
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(CropPost, { foreignKey: 'productId' });

module.exports = Cart;
