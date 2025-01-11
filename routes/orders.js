const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
const authenticateToken=require("../middleware/authenticate")
const dotenv=require("dotenv");
dotenv.config();

router.get('/Allorders', async (req, res) => {

    try{
        const query = `SELECT * FROM orders orders`;
        const [orders] = await promisePool.execute(query);
         return res.status(200).json({ success: true, orders });
    }catch(err){
        res.status(500).json({error:err.message})
    }
})
router.post('/orders', async (req, res) => {
    const { user_id, guest_email, phone, total_amount, shipping_address, payment_method, items } = req.body;

    // Ensure user_id or guest_email is provided
    if (!user_id && !guest_email) {
        return res.status(400).json({ error: "Either user_id or guest_email is required." });
    }

    // Validate items array
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Order must include at least one item." });
    }

    const connection = await promisePool.getConnection();
  
    try {
        return res.send(connection)
        // Start transaction
        await connection.beginTransaction();
       
        // Insert order
        const orderQuery = `
            INSERT INTO orders 
            (user_id, guest_email, phone, total_amount, shipping_address, payment_method) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const orderValues = [user_id || null, guest_email, phone, total_amount, shipping_address, payment_method];
        const [orderResult] = await connection.execute(orderQuery, orderValues);
        const orderId = orderResult.insertId;
       
        // Insert order items
        const itemQuery = `
            INSERT INTO order_items (order_id, plant_id, quantity, price)
            VALUES ?
        `;

        const itemValues = items.map(item => [orderId, item.plant_id, item.quantity, item.price]);
        await connection.query(itemQuery, [itemValues]);

        // Commit transaction
        await connection.commit();

        res.status(201).json({ success: true, orderId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: "Failed to create order." });
    } finally {
        connection.release();
    }
});

router.get('/orders/userOrders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;  // Extract user ID from JWT token
        const query = `SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC`;

        const [orders] = await promisePool.execute(query, [userId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'No orders found for this user.' });
        }

        res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching user orders.', 
            error: err.message 
        });
    }
});


router.get('/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const query = `SELECT * FROM orders WHERE id = ?`;

        const [order] = await promisePool.execute(query, [orderId]);

        if (order.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found.' 
            });
        }

        res.status(200).json({ 
            success: true, 
            order: order[0]  // Return the first (and only) order
        });
    } catch (err) {
        console.error('Error fetching order by ID:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching the order.', 
            error: err.message 
        });
    }
});

router.put('/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;  // New status from request body

        // Validate if status is provided and valid
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing status. Valid statuses: pending, processing, shipped, delivered, cancelled.'
            });
        }

        const query = `UPDATE orders SET status = ? WHERE id = ?`;
        const [result] = await promisePool.execute(query, [status, orderId]);

        // Check if any row was updated
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or no change made.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully.',
            updatedOrderId: orderId
        });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating the order status.',
            error: err.message
        });
    }
});


module.exports = router;
