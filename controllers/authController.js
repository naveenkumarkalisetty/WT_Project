const express = require('express');
const bcrypt = require('bcrypt');
const { RegisteredBase } = require('../model/RegisteredData');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await RegisteredBase.findOne({ email }).exec();

        if (!existingUser) return res.status(404).json({"message": "Email doesn't exists!"});

        const match =  await bcrypt.compare(password, existingUser.password);
        if (!match) return res.status(401).json({"message": "Invalid credentials!"});
        
        //  require('crypto').randomBytes(64).toString('hex')
        const accessToken = jwt.sign(
            { id: existingUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn : "5m" }
        );

        const refreshToken = jwt.sign(
            { id: existingUser._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );
        
        res.cookie("refreshToken", refreshToken, { 
            httpOnly:true, // prevents from frontend access
            secure:true, // only for HTTPS
            sameSite:"Strict", // prevents from cross-site requests
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            "message": "Login successful",
            accessToken
        });
    } catch (err) {
        res.status(500).json({'message':`${err.message}`});
    }
}
module.exports = handleLogin;