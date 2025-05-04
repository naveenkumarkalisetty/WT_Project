const mongoose = require('mongoose');

const resetPasswordToken = new mongoose.Schema({
    email: {type: String, required: true},
    token: {type: String, required: true}
});


module.exports =  mongoose.model('resetPasswordToken', resetPasswordToken) ;