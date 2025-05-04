const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) return res.status(401).json({ message: `Access token required ${authHeader}`});
    
    const accessToken = authHeader.split(' ')[1];
    
    if (!accessToken) return res.status(401).json({"message": "Unauthorized: Access token required"});

    try {
        jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message : 'Invalid or expired token' });
            req.user = decoded;
            next();
        });
        
    } catch(err) {
        return res.status(403).json({ "message" : "Forbidden: Invalid token"});
    }
}

module.exports = verifyToken;