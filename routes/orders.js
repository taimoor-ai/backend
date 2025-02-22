const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
const authenticateToken=require("../middleware/authenticate")
const dotenv=require("dotenv");
dotenv.config();

router.get('/allorders', async (req, res) => {
    try {
        // Query to fetch only pending orders and their associated order items
        const query = `
            SELECT 
                o.id AS order_id,
                o.customer,
                o.user_id,
                o.status,
                o.guest_email,
                o.phone,
                o.total_amount,
                o.shipping_address,
                o.payment_method,
                o.order_date AS created_at,
                oi.plant_id,
                oi.quantity,
                oi.price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'pending'
            ORDER BY o.id;
        `;

        const [result] = await promisePool.execute(query);

        // Transform the result into a structured response
        const orders = result.reduce((acc, row) => {
            // Check if the order already exists in the accumulator
            let order = acc.find(o => o.order_id === row.order_id);

            if (!order) {
                // Add a new order if it doesn't exist
                order = {
                    order_id: row.order_id,
                    customer: row.customer,
                    status: row.status,
                    user_id: row.user_id,
                    guest_email: row.guest_email,
                    phone: row.phone,
                    total_amount: row.total_amount,
                    shipping_address: row.shipping_address,
                    payment_method: row.payment_method,
                    created_at: row.created_at,
                    items: []
                };
                acc.push(order);
            }

            // Add the order item if present
            if (row.plant_id) {
                order.items.push({
                    plant_id: row.plant_id,
                    quantity: row.quantity,
                    price: row.price
                });
            }

            return acc;
        }, []);

        return res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching pending orders:", err.message);
        return res.status(500).json({ error: err.message });
    }
});
router.get('/Confirmed', async (req, res) => {
    try {
        // Query to fetch orders with status 'confirmed'
        const query = `
            SELECT 
                o.id AS order_id,
                o.customer,
                o.user_id,
                o.status,
                o.guest_email,
                o.phone,
                o.total_amount,
                o.shipping_address,
                o.payment_method,
                o.order_date AS created_at,
                oi.plant_id,
                oi.quantity,
                oi.price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'confirmed'
            ORDER BY o.id;
        `;

        const [result] = await promisePool.execute(query);

        // Transform the result into a structured response
        const orders = result.reduce((acc, row) => {
            // Check if the order already exists in the accumulator
            let order = acc.find(o => o.order_id === row.order_id);

            if (!order) {
                // Add a new order if it doesn't exist
                order = {
                    order_id: row.order_id,
                    customer: row.customer,
                    status: row.status,
                    user_id: row.user_id,
                    guest_email: row.guest_email,
                    phone: row.phone,
                    total_amount: row.total_amount,
                    shipping_address: row.shipping_address,
                    payment_method: row.payment_method,
                    created_at: row.created_at,
                    items: []
                };
                acc.push(order);
            }

            // Add the order item if present
            if (row.plant_id) {
                order.items.push({
                    plant_id: row.plant_id,
                    quantity: row.quantity,
                    price: row.price
                });
            }

            return acc;
        }, []);

        return res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching confirmed orders:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

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

    let connection; // Declare connection outside the try block
    try {
        connection = await promisePool.getConnection(); // Initialize the connection

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

        // Respond with success
        res.status(201).json({ success: true, orderId });
    } catch (err) {
        if (connection) {
            await connection.rollback(); // Rollback the transaction if connection exists
        }
        console.error(err);
        res.status(500).json({ error: "Failed to create order." });
    } finally {
        if (connection) {
            connection.release(); // Release the connection if initialized
        }
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
router.get("/ready",async (req,res)=>{
    try {
        // Query to fetch orders with status 'confirmed'
        const query = `
            SELECT 
                o.id AS order_id,
                o.customer,
                o.user_id,
                o.status,
                o.guest_email,
                o.phone,
                o.total_amount,
                o.shipping_address,
                o.payment_method,
                o.order_date AS created_at,
                oi.plant_id,
                oi.quantity,
                oi.price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'ready'
            ORDER BY o.id;
        `;

        const [result] = await promisePool.execute(query);

        // Transform the result into a structured response
        const orders = result.reduce((acc, row) => {
            // Check if the order already exists in the accumulator
            let order = acc.find(o => o.order_id === row.order_id);

            if (!order) {
                // Add a new order if it doesn't exist
                order = {
                    order_id: row.order_id,
                    customer: row.customer,
                    status: row.status,
                    user_id: row.user_id,
                    guest_email: row.guest_email,
                    phone: row.phone,
                    total_amount: row.total_amount,
                    shipping_address: row.shipping_address,
                    payment_method: row.payment_method,
                    created_at: row.created_at,
                    items: []
                };
                acc.push(order);
            }

            // Add the order item if present
            if (row.plant_id) {
                order.items.push({
                    plant_id: row.plant_id,
                    quantity: row.quantity,
                    price: row.price
                });
            }

            return acc;
        }, []);

        return res.status(200).json({ success: true, orders });
    }catch(err) {
        console.error("Error fetching confirmed orders:", err.message);
        return res.status(500).json({ error: err.message });
    }
})
router.get("/shipped",async (req,res)=>{
    try {
        // Query to fetch orders with status 'confirmed'
        const query = `
            SELECT 
                o.id AS order_id,
                o.customer,
                o.user_id,
                o.status,
                o.guest_email,
                o.phone,
                o.total_amount,
                o.shipping_address,
                o.payment_method,
                o.order_date AS created_at,
                oi.plant_id,
                oi.quantity,
                oi.price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'shipped'
            ORDER BY o.id;
        `;

        const [result] = await promisePool.execute(query);

        // Transform the result into a structured response
        const orders = result.reduce((acc, row) => {
            // Check if the order already exists in the accumulator
            let order = acc.find(o => o.order_id === row.order_id);

            if (!order) {
                // Add a new order if it doesn't exist
                order = {
                    order_id: row.order_id,
                    customer: row.customer,
                    status: row.status,
                    user_id: row.user_id,
                    guest_email: row.guest_email,
                    phone: row.phone,
                    total_amount: row.total_amount,
                    shipping_address: row.shipping_address,
                    payment_method: row.payment_method,
                    created_at: row.created_at,
                    items: []
                };
                acc.push(order);
            }

            // Add the order item if present
            if (row.plant_id) {
                order.items.push({
                    plant_id: row.plant_id,
                    quantity: row.quantity,
                    price: row.price
                });
            }

            return acc;
        }, []);

        return res.status(200).json({ success: true, orders });
    }catch(err) {
        console.error("Error fetching confirmed orders:", err.message);
        return res.status(500).json({ error: err.message });
    }
})

router.put('/orders/updateStatus/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;  // New status from request body

        // Validate if status is provided and valid
        const validStatuses = ['pending',"confirmed", 'processing', 'shipped', 'delivered', 'cancelled',"ready","completed"];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing status. Valid statuses: pending, processing, shipped, delivered, cancelled,ready,completed'
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
router.get('/ProcessingOrders', async (req, res) => {
    try {
        // Query to fetch orders with status 'processing'
        const query = `
            SELECT 
                o.id AS order_id,
                o.customer,
                o.user_id,
                o.status,
                o.guest_email,
                o.phone,
                o.total_amount,
                o.shipping_address,
                o.payment_method,
                o.order_date AS created_at,
                oi.plant_id,
                oi.quantity,
                oi.price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'processing'
            ORDER BY o.id;
        `;

        const [result] = await promisePool.execute(query);

        // Transform the result into a structured response
        const orders = result.reduce((acc, row) => {
            // Check if the order already exists in the accumulator
            let order = acc.find(o => o.order_id === row.order_id);

            if (!order) {
                // Add a new order if it doesn't exist
                order = {
                    order_id: row.order_id,
                    customer: row.customer,
                    status: row.status,
                    user_id: row.user_id,
                    guest_email: row.guest_email,
                    phone: row.phone,
                    total_amount: row.total_amount,
                    shipping_address: row.shipping_address,
                    payment_method: row.payment_method,
                    created_at: row.created_at,
                    items: []
                };
                acc.push(order);
            }

            // Add the order item if present
            if (row.plant_id) {
                order.items.push({
                    plant_id: row.plant_id,
                    quantity: row.quantity,
                    price: row.price
                });
            }

            return acc;
        }, []);

        return res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching processing orders:", err.message);
        return res.status(500).json({ error: err.message });
    }
});


module.exports = router;
