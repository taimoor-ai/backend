const express = require('express');
const router = express.Router();
const promisePool = require('../dbConfig');  // Assuming your MySQL pool is imported here

// Add to Cart Function
const addToCart = async (req, res) => {
    const { user_id, guest_id, plant_id, quantity } = req.body;
    console.log("Received data:", { user_id, plant_id, quantity ,guest_id});
    try {
        // 1. Check if the cart exists for user/guest
        let [cart] = await promisePool.execute(
            `SELECT * FROM cart WHERE user_id = ? OR guest_id = ? LIMIT 1`,
            [user_id || null, guest_id || null]
        );
        let cart_id;
        if (cart.length === 0) {
            // 2. Create a new cart if none exists
            const [newCart] = await promisePool.execute(
                `INSERT INTO cart (user_id, guest_id, total_price) VALUES (?, ?, 0)`,
                [user_id || null, guest_id || null]
            );
            cart_id = newCart.insertId;
        } else {
            cart_id = cart[0].id;
        }
        // 3. Get plant price from the plants table
        const [plant] = await promisePool.execute(
            `SELECT price FROM plants WHERE id = ?`,
            [plant_id]
        );

        if (plant.length === 0) {
            return res.status(404).json({ message: "Plant not found" });
        }

        const plantPrice = plant[0].price;

        // 4. Insert or update item in cart_items
        await promisePool.execute(
            `INSERT INTO cart_items (cart_id, plant_id, quantity, price) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE quantity = quantity + ?, price = ?`,
            [cart_id, plant_id, quantity, plantPrice, quantity, plantPrice]
        );

        // 5. Recalculate and update total price in the cart
        await promisePool.execute(
            `UPDATE cart 
             SET total_price = (
                 SELECT SUM(subtotal) FROM cart_items WHERE cart_id = ?
             ) WHERE id = ?`,
            [cart_id, cart_id]
        );

        res.status(200).json({ message: "Item added to cart successfully", cart_id });
        // res.status(200).json({ message: "Item added to cart successfully"});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add item to cart", error: err });
    }
};
// Get Cart Items Function
const getCartItems = async (req, res) => {
    const { user_id, guest_id } = req.query;  // Get user_id or guest_id from query params
    // const user_id=req.params.id;
    // const guest_id=1;
    console.log(user_id);
    console.log(guest_id);
    try {
        // 1. Fetch the cart for user or guest
        const [cart] = await promisePool.execute(
            `SELECT * FROM cart WHERE user_id = ? OR guest_id = ? LIMIT 1`,
            [user_id || null, guest_id || null]
        );

        if (cart.length === 0) {
            return res.status(404).json({ message: "Cart is empty" });
        }

        const cart_id = cart[0].id;

        // 2. Fetch cart items with plant details
        const [items] = await promisePool.execute(
            `SELECT ci.id ,ci.plant_id, p.name AS plant_name, ci.quantity, ci.price, 
                    (ci.quantity * ci.price) AS subtotal
             FROM cart_items ci
             JOIN plants p ON ci.plant_id = p.id
             WHERE ci.cart_id = ?`,
            [cart_id]
        );

        if (items.length === 0) {
            return res.status(404).json({ message: "Cart is empty" });
        }

        // 3. Calculate total price
        const totalPrice = items.reduce((acc, item) => acc + item.subtotal, 0);

        res.status(200).json({
            cart_id,
            items,
            total_price: totalPrice
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch cart items", error: err });
    }
};

// Define the route
router.get('/cart', getCartItems);
// Define the route
router.post('/cart', addToCart);
router.delete('/cart/:id', async (req,res)=>{
        const {item_id}=req.body;
        if(!item_id){
            return res.send("provide item Id")}
        try{
            const query=`delete from cart_items where id= ? and cart_id=?`;
            const values=[item_id,req.params.id];
            const [result]=await promisePool.execute(query,values);
            if(result.affectedRows==0){
                return res.status(400).send("itme is not found or already deleted")
            }
             res.status(200).send("item remove from cart ");
            }catch(err){
            console.log(err);
            res.send(401).send("error delting a ite mfrom cart")
        }
});


module.exports = router;
