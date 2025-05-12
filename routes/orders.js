const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FoodItem = require('../models/FoodItem');
const OrderItem = require('../models/OrderItem');
const { Op } = require('sequelize');

// Create order
router.post('/', async (req, res) => {
  try {
    const { orderType, tableNumber, buildingName, customerName, items } = req.body;
    const order = await Order.create({
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : null,
      buildingName: orderType === 'delivery' ? buildingName : null,
      customerName,
      status: 'In Process'
    });
    for (const item of items) {
      await OrderItem.create({
        order_id: order.id,
        food_item_id: item.foodItem.id,
        quantity: item.quantity
      });
    }
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders by status or table number
router.get('/', async (req, res) => {
  try {
    const { status, tableNumber } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tableNumber) where.tableNumber = tableNumber;
    const orders = await Order.findAll({
      where,
      include: [{
        model: FoodItem,
        as: 'FoodItems',
        through: { attributes: ['quantity'] }
      }]
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status and payment method
router.put('/:id', async (req, res) => {
  try {
    const { status, paymentMethod } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await order.update({ status, paymentMethod });
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    const orders = await Order.findAll({
      where,
      include: [{
        model: FoodItem,
        as: 'FoodItems',
        through: { attributes: ['quantity'] }
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;