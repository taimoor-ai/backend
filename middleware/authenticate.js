const jwt = require('jsonwebtoken');

// Middleware to authenticate user token
const authenticateToken = (req, res, next) => {
    const token = req.header("auth-token")

    if (!token) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;  // Attach user to request
        next();
    });
};

module.exports = authenticateToken;
