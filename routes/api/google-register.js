const { RegisteredBase, User, Corporation, NGO } = require('../../model/RegisteredData');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
router.post('/', async (req, res) => {
  try {
    const email = req.session.googleEmail;
    // console.log(email);
    const { registerType, data} = req.body;
    if (!email) return res.status(400).send('Session expired. Please sign in with Google again.');
    data.email = email;
    

    let newUser;
    if (registerType === 'user') {
      newUser = await User.create(data);
    } else if (registerType === 'corporation') {
      newUser = await Corporation.create(data);
    } else if (registerType === 'ngo') {
      newUser = await NGO.create(data);
    } else {
      return res.status(400).send('Invalid role selected.');
    }

    delete req.session.googleEmail;

    const userToken = jwt.sign(
      { id: newUser._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    
    
    res.cookie("userToken", userToken, { 
      httpOnly:true, // prevents from frontend access
      secure:true, // only for HTTPS
      sameSite:"lax", // prevents from cross-site requests
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({"message":'Registration complete. You can now login!'});
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during registration');
  }
});

module.exports = router;