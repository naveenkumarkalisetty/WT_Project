const nodemailer = require('nodemailer');

const sendEmail = async (toMail, User) => {
    const transporter = nodemailer.createTransport({
        service:'gmail',
        host:'smtp.gmail.com',
        port:587,
        secure:false,
        auth: {
            user:process.env.USER,
            pass:process.env.PASSWORD
        }
    });
    
    try {
        await transporter.sendMail({
            from:{
                name:'Food For All',
                address:process.env.USER
            },
            to:toMail,
            subject:'Your food has been claimed',
            text:`Claimed by User:${User.username} (${User.email}) ${User.address}, ${User.contactNumber}`,
        });
    } catch(err) {
        console.error('Error sending email:', err);
    }
}

module.exports = sendEmail;