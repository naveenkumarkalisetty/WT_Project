const handleLogout = (req, res) => {
    res.clearCookie("userToken");
    res.json({ "message" : "Logout successfully"});
};

module.exports = handleLogout;