const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig.js");
const bcrypt=require("bcryptjs")
const { body, validationResult } = require('express-validator');
const jwt=require("jsonwebtoken");
const dotenv=require("dotenv");
const authenticateToken=require("../middleware/authenticate.js")
const {sendOTP}=require("../sendOtpConfig.js")
const {generateOTP}=require("../sendOtpConfig.js")
dotenv.config();


const otpStore={}


router.post("/register", [
    body('name', "Enter a valid name").isLength({ min: 4 }),
    body('email', "Enter a valid email address").isEmail(),
    body('password', "Password must be at least 5 characters long").isLength({ min: 5 })
], async (req, res) => {

    // Check if the request body is empty
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Please provide the user data" });
    }

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password } = req.body;

        // Check if user already exists (by name or email)
        const query = `SELECT * FROM users WHERE email = ? OR username = ?`;
        const [existingUsers] = await promisePool.execute(query, [email, name]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "User with this email or name already exists" });
        }

        // Generate and send OTP if user does not exist
        const otp = generateOTP();
        otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60000 }; // OTP expires in 10 min

        // Send OTP to email
        await sendOTP(email, otp);

        res.status(200).send("OTP is sent to the email for confirmation");

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error sending OTP", error: err.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp, password, name } = req.body;

    const storedOtp = otpStore[email];

    // Check if OTP exists and hasn't expired
    if (!storedOtp || storedOtp.otp !== otp || storedOtp.expiresAt < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (username, email, password, is_verified) VALUES (?, ?, ?, ?)`;
        await promisePool.execute(query, [name, email, hashedPassword, true]);

        // Remove OTP after successful registration
        delete otpStore[email];

        res.status(200).json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error completing registration' });
    }
});

router.post('/users/login',[
    body('email', "Enter a valid email address").isEmail(),
    body('password', "Password must be at least 5 characters long").isLength({ min: 5 })
],async (req,res)=>{
        // Check if the request body is empty
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Please provide the user data" });
    } else {
        // Validate input fields
        const errors = validationResult(req);

        // If there are validation errors, return them
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
    }
    try {
        const {email, password } = req.body;
        // Check if the email already exists in the database (you can add this check before inserting)
        const emailCheckQuery = 'SELECT * FROM users WHERE email = ?';
        const [existingUser] = await promisePool.execute(emailCheckQuery, [email]);

        if (existingUser.length == 0) {
            return res.status(400).json({ error: "Email Not exists." });
        }  
         
        const check=await bcrypt.compare(password,existingUser[0].password);
            if(check){
                 const token = jwt.sign({ id: existingUser[0].id, username: existingUser[0].username}, process.env.SECRET_KEY, { expiresIn: '1h' });
                 res.json({success:true,  id:existingUser[0].id,jwtToken:token})
            }else{
                return res.status(400).json({success:false,error:"please enter correct password:"})
            }

    } catch (err) {
        console.log(err);
        res.status(401).json({ success: false, message:"Error LogIn a user", error: err.message });
    }
});
router.get('/users/profile',authenticateToken,async (req,res)=>{
    try {
        const userId = req.user.id;  // Extract user ID from decoded JWT token
        const query = `SELECT id, username, email, created_at FROM users WHERE id = ?`;
        
        const [user] = await promisePool.execute(query, [userId]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user[0]);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
