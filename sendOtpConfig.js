const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Function to generate a 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // Your email
        pass: process.env.EMAIL_PASS    // Your app password (not email password)
    }
});


    async function sendOTP(email, otp) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Registration',
            text: `Your OTP for registering on Plants Store is: ${otp}. It expires in 10 minutes.`
        };
        try {
            console.log("Sending OTP to:", email);
            await transporter.sendMail(mailOptions);
            console.log("OTP sent successfully!");
        } catch (error) {
            console.error("Error sending OTP:", error);
        }
    }
    



module.exports={sendOTP,generateOTP};