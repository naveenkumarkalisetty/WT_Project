require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const PORT = process.env.PORT || 3500;
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const sendEmail = require('./routes/api/mail');
const fs = require('fs');
const { Chat } = require('./model/chat');
const passport = require('passport');
const session = require('express-session');
require('./config/gAuth');


// Configure multer to save files with their original names in the "uploads" directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname,"public",'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath); // Create the directory if it doesn't exist
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user._id}-${Date.now()}${file.originalname}`); // Save file with a timestamp to avoid name conflicts
    }
});

const upload = multer({ storage: storage });

//connect Database
connectDB();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.js')) {
          res.set('Content-Type', 'application/javascript');
        }
    }
}));

// session for google sign in

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie: { secure: false }
}))
app.use(passport.initialize());
app.use(passport.session());
app.use('/signup', require('./middleware/requests'));


const bcrypt = require('bcrypt');
const { RegisteredBase } = require('./model/RegisteredData');
const jwt = require('jsonwebtoken');

const userAuth = async function(req, res, next) {
    try{
        const userToken = req.cookies.userToken;

        if (!userToken) return res.status(403).json({"message": "No token provided! Login again!"});
        const data = jwt.verify(userToken, process.env.REFRESH_TOKEN_SECRET);
        const User = await RegisteredBase.findById(data.id);
        req.user = User;

        next();
    } catch (err) {
        res.status(500).json({'message':`${err.message}`});
    }
}
// Trigger Google OAuth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
  
  // Google OAuth callback
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        console.log("Google OAuth user object:", req.user); // Log the user object for debugging
        if (!req.user.role) {
            // User is new -> send to registration form
            if (req.user) {
                req.session.googleEmail = req.user; // Ensure email exists before setting it
                console.log("Google email set in session:", req.session.googleEmail);
            } else {
                console.error("Email is missing in the user object");
            }
            res.redirect('/signup/register');
        } else {
            // User exists -> go to dashboard
            const user = req.user;
            const userToken = jwt.sign(
                { id: user._id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: "7d" }
            );


            res.cookie("userToken", userToken, { 
                httpOnly:true, // prevents from frontend access
                secure:true, // only for HTTPS
                sameSite:"lax", // prevents from cross-site requests
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            res.redirect('/dashboard'); // Redirect to dashboard after successful login
        }
    }
  );
app.use('/google-register', require('./routes/api/google-register'));
app.use('/login', async (req,res) => {
    try{
        const { email, password } = req.body;
        const existingUser = await RegisteredBase.findOne({ email }).exec();

        if (!existingUser) return res.status(404).json({"message": "Email doesn't exists!"});

        const match =  await bcrypt.compare(password, existingUser.password);
        if (!match) return res.status(401).json({"message": "Invalid credentials!"});

        const userToken = jwt.sign(
                    { id: existingUser._id },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: "7d" }
        );
        

        res.cookie("userToken", userToken, { 
            httpOnly:true, // prevents from frontend access
            secure:true, // only for HTTPS
            sameSite:"lax", // prevents from cross-site requests
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({"message": "Login successful!"});
    } catch (err) {
        console.error("Error during login:", err.message);
        res.status(500).json({'message':`${err.message}`});
    }
});
app.use("/dashboard", userAuth, (req,res) => {
    const user = req.user;
    console.log("User ID:", user._id);

    if(user.role == "ngo"){
        res.sendFile(path.join(__dirname,"public","ngo-dash.html"));
    }
    else{
        res.sendFile(path.join(__dirname,"public","donor-dash2.html"));
    }
});

app.use("/nearby", userAuth, (req,res) => {
    const user = req.user;
    res.sendFile(path.join(__dirname,"public","nearby.html"));
}
);

app.use("/api/profile", userAuth, (req,res) => {
    const user = req.user;
    console.log("User", user);
    res.json(user);
    }
);

app.put('/api/donations/:id/unclaim', async (req, res) => {
    try {
        const donationId = req.params.id;
        
        const updatedDonation = await Donation.findByIdAndUpdate(
            donationId,
            { 
                status: 'unclaimed',
                $unset: { claimedBy: "" }
            },
            { new: true }
        );

        if (!updatedDonation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        res.json({ 
            message: 'Donation unclaimed successfully',
            donation: updatedDonation 
        });
    } catch (error) {
        console.error('Error unclaiming donation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/donations/:id/complete', async (req, res) => {
    try {
        const donationId = req.params.id;
        
        // Update donation status to completed
        const updatedDonation = await Donation.findByIdAndUpdate(
            donationId,
            { status: 'completed' },
            {new: true} // Return the updated document
        );

        await updatedDonation.save();
        console.log("Updated Donation:", updatedDonation);
        if (!updatedDonation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
    
        res.json({ 
            message: 'Donation marked as completed',
            donation: updatedDonation 
        });
    } catch (error) {
        console.error('Error completing donation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.use("/api/donations", userAuth, async (req,res) => {     
    const user = req.user;

    const donations = await Donation.find({});
    console.log("Donations", donations);
    res.json(donations);
    }
);

app.use("/api/mydonations", userAuth, async (req,res) => {
    const user = req.user;
    const donations = await Donation.find({"donorId":user._id}).exec();
    res.json(donations);
}
);



app.use('/register', require('./routes/api/register'));
app.use('/refresh', require('./routes/api/refresh'));
app.use('/profile', require('./routes/api/protected'));
app.use('/retrieveData', require('./routes/api/retrieveData'));
app.use('/logout', require('./routes/api/logout'));

app.use("/forgotpassword", (req,res) => {
    res.sendFile(path.join(__dirname,"public","reset-password.html"));
});



app.post('/api/resetpassword', async (req, res) => {
    try {
        const { password, intoken, email } = req.body;

        const resetPasswordToken = require('./model/resetPassword');
        const tokenRecord = await resetPasswordToken.find({ email, token: intoken });

        if (!tokenRecord) {
            return res.status(404).json({ message: "Invalid token or email" });
        }

        // Delete the token after validation
        await resetPasswordToken.deleteOne({ email, token: intoken });

        const user = await RegisteredBase.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hashedPwd = await bcrypt.hash(password, 10);
        user.password = hashedPwd;

        await user.save();
        res.json({ message: "Password reset successfully!" });
    } catch (err) {
        console.error("Error resetting password:", err.message);
        res.status(500).json({ message: `Server error: ${err.message}` });
    }
});

const nodemailer = require('nodemailer');
const crypto = require('crypto');

app.use('/api/forgotpassword',async (req, res) => {
    const token = crypto.randomBytes(20).toString('hex');
    const email = req.body.email;
    const transporter = nodemailer.createTransport({
            service:'gmail',
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            auth: {
                user:process.env.EMAIL_USER,
                pass:process.env.EMAIL_PASSWORD
            }
        });
        
        try {
            await transporter.sendMail({
                from:{
                    name:'Food For All',
                    address:process.env.USER
                },
                to:email,
                subject:'Reset Password Request',
                text:'Link: http://localhost:3500/forgotpassword?token=' + token+"&email=" + email,
            });

            console.log('Email sent successfully to:', email);
        } catch(err) {
            console.error('Error sending email:', err);
        }

        // userTokens[email] = token;

        res.json({message:"Email sent successfully"});
});

app.use("/donate", userAuth, (req,res) => {
    res.sendFile(path.join(__dirname,"public","donate.html"));
});
app.use("/claimed-donations", userAuth, (req,res) => {
    res.sendFile(path.join(__dirname,"public","claimed_donations.html"));
}); 


// Add claim-donation route handler
app.use("/api/claim-donation", userAuth, require('./routes/api/claim-donation'));
app.use("/api/claim-donations", userAuth, require('./routes/api/claimed-donations'));

// Mark donation as completed


app.get('/api/donation/:id', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        res.json(donation);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const {Donation} = require('./model/donation.js');
app.post('/api/donation', userAuth, upload.single('food_image'), async (req, res) => {
    const data = JSON.parse(req.body.data); // Form fields
    const file = req.file; // Uploaded file

    console.log("Form Data:", data);
    console.log("Uploaded File:", file);

    const donation = {
        donorId: req.user._id,
        donorType: data.donor_type,
        foodCategory: data.food_category,
        foodType: data.food_type,
        specifyItems: data.specify_items,
        quantity: data.quantity,
        location: data.location,
        expiryTime: data.expiry_time,
        contactNumber: data.contact_number,
        foodImagePath: file.path, // Save the file path
        foodImageName: file.filename, // Save the file name
        lat: data.latitude,
        lng: data.longitude
    };

    console.log(donation);
    

    const newDonation = await Donation.create(donation);

    newDonation.save()
        .then(() => {
            console.log("Donation saved successfully!");
        })
        .catch((err) => {
            console.error("Error saving donation:", err);
            return res.status(500).send("Error saving donation.");
        });

    res.status(200).send("Donation received successfully!");
});

app.get('/api/ngo-stats', userAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get total claimed donations
        const totalDonations = await Donation.countDocuments({
            'claimedBy.userId': userId
        });

        // Get pending pickups (claimed but not completed)
        const pendingPickups = await Donation.countDocuments({
            'claimedBy.userId': userId,
            'status': 'claimed'
        });

        // Get completed pickups
        const completedPickups = await Donation.countDocuments({
            'claimedBy.userId': userId,
            'status': 'completed'
        });

        res.json({
            totalDonations,
            pendingPickups,
            completedPickups
        });
    } catch (error) {
        console.error('Error fetching NGO stats:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected, socket id:', socket.id);

    socket.on('authenticate', (userId) => {
        console.log('User authenticated:', userId, 'socket:', socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`);
    });
    
    socket.on('join chat', (chatId) => {
        console.log('Client joining chat:', chatId, 'socket:', socket.id);
        socket.join(chatId);
    });

    socket.on('chat message', async ({ chatId, content, userId }) => {
        console.log('Message received:', { chatId, userId, content: content.substring(0, 50) });
        try {
            const chat = await Chat.findById(chatId)
                .populate('donor', 'name username')
                .populate('claimer', 'name username');
                
            if (!chat) {
                console.error('Chat not found:', chatId);
                return;
            }
            
            const message = {
                sender: userId,
                content,
                timestamp: new Date(),
                read: false
            };
            
            chat.messages.push(message);
            chat.lastMessage = new Date();
            await chat.save();
            
            // Emit to chat room
            io.to(chatId).emit('chat message', message);

            // Send notification to recipient
            const recipient = chat.donor._id.toString() === userId ? 
                chat.claimer._id.toString() : 
                chat.donor._id.toString();
            
            const sender = chat.donor._id.toString() === userId ? 
                chat.donor : chat.claimer;

            io.to(`user:${recipient}`).emit('new message notification', {
                chatId,
                message: content,
                sender: sender.name || sender.username,
                timestamp: new Date()
            });
        } catch (err) {
            console.error('Error handling chat message:', err);
            socket.emit('error', { message: 'Error saving message' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected, socket id:', socket.id);
    });
});

// Add chat route
app.use('/api/chat', userAuth, require('./routes/api/chat'));



app.use("/", (req,res) =>{
    res.sendFile(path.join(__dirname,"public","web.html"));
});

// Change app.listen to server.listen
mongoose.connection.once('open', () => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
});