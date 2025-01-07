const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
const bcrypt=require("bcryptjs")
const { body, validationResult } = require('express-validator');
const authenticateToken=require("../middleware/authenticate")
const dotenv=require("dotenv");
dotenv.config();

router.post('/reviews', async (req, res) => {
    const { plant_id, user_id, guest_name, rating, comment } = req.body;

    if (!user_id && !guest_name) {
        return res.status(400).json({ error: 'Either user_id or guest_name must be provided' });
    }

    try {
        const query = `INSERT INTO reviews (plant_id, user_id, guest_name, rating, comment)
                       VALUES (?, ?, ?, ?, ?)`;
        const values = [plant_id, user_id || null, guest_name || null, rating, comment];

        const [result] = await promisePool.execute(query, values);
        res.status(201).json({ success: true, reviewId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/plants/reviews', async (req, res) => {
    const { plant_id } = req.query;  // Use query string for GET requests

    if (!plant_id) {
        return res.status(400).json({ success: false, message: "Plant ID is required" });
    }

    try {
        const query = `SELECT * FROM reviews WHERE plant_id = ?`;
        const [result] = await promisePool.execute(query, [plant_id]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "No reviews found for this plant" });
        }

        res.status(200).json({ success: true, reviews: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching reviews", error: err.message });
    }
});


module.exports = router;
