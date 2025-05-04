const bcrypt = require('bcrypt');
const {RegisteredBase, User, Corporation, NGO} = require('../model/RegisteredData');


const handleNewUser = async (req, res) => {
    try {
        const { registerType, data} = req.body;

        const existingUser = await RegisteredBase.findOne({ email: data.email }).exec();
        if (existingUser) return res.status(400).send("Email already exists!");
        console.log(data);
        // hash password
        const hashedPwd = await bcrypt.hash(data.password, 10);
        data.password = hashedPwd;
        // create User
        let newuser;
        if (registerType === "user") {
            newUser = await User.create(data);
        }
        else if (registerType === "corporation")
            newUser = await Corporation.create(data);
        else if (registerType === "ngo")
            newUser = await NGO.create(data);
        res.status(200).json({'message': "Registration Successful"});
    } catch (err) {
        res.status(500).json({"message":err.message});
    }
}

module.exports = handleNewUser;