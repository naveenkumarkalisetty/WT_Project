const jwt = require('jsonwebtoken');

const handleRefreshToken = (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.status(401).json({ message: "Unauthorized" });

    const refreshToken = cookies.refreshToken;

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Forbidden "});
        // generate new Access token
        const accessToken = jwt.sign(
            {id: decoded.id},
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5m" }
        );

        res.status(200).json({ accessToken });
    });
}
module.exports = handleRefreshToken;