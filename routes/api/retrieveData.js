const express = require('express');
const router = express.Router();
const {RegisteredBase} = require('../../model/RegisteredData');

router.post('/', async (req, res) => {
    const existingUser = await RegisteredBase.findOne({ _id: req.body.id }).exec();
    console.log(existingUser);
    if (!existingUser) return res.status(400).json({'message': 'Data is missing!'});
    
    res.status(200).json(existingUser);
});

module.exports = router;