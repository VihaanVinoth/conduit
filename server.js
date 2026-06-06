require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+2.pem'))
};

const server = https.createServer(sslOptions, app);
const io = new Server(server, { cors: { origin: "*" } });

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', 
    port: 465,
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,   
        pass: process.env.SMTP_PASS
    }
});

const users = {};
const activeOTPs = {}; 

io.on('connection', (socket) => {
    console.log(`Device connected: ${socket.id}`);

    socket.on('request-access-code', async (data) => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        activeOTPs[socket.id] = {
            code: generatedCode,
            userName: data.userName,
            expires: Date.now() + 5 * 60 * 1000 // Valid for 5 minutes
        };

        const mailOptions = {
            from: `"Conduit Gateway" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: 'Conduit Access Verification Code',
            text: `A station authorization has been requested.\n\nDevice Name: ${data.userName}\nNode Verification Code: ${generatedCode}\n\nThis security token will expire in 5 minutes.`
        };

        try {
            await transporter.sendMail(mailOptions);
            socket.emit('code-sent', { success: true });
            console.log(`Passcode safely dispatched for node [${socket.id}]`);
        } catch (error) {
            console.error('❌ Email Transport Failure:', error);
            socket.emit('code-sent', { success: false, error: 'Could not send verification email.' });
        }
    });

    socket.on('verify-access-code', (data) => {
        const record = activeOTPs[socket.id];
        
        if (record && record.code === data.code && Date.now() < record.expires) {
            delete activeOTPs[socket.id]; 
            users[socket.id] = record.userName;
            
            socket.emit('auth-verified', { success: true });
            io.emit('update-contacts', users);
            console.log(`👤 Verified: ${record.userName} mapped on station node [${socket.id}]`);
        } else {
            socket.emit('auth-verified', { success: false, error: 'Invalid or expired entry code.' });
        }
    });

    // WebRTC Signaling Channels
    socket.on('video-offer', (data) => {
        io.to(data.target).emit('video-offer', { offer: data.offer, sender: socket.id });
    });

    socket.on('video-answer', (data) => {
        io.to(data.target).emit('video-answer', { answer: data.answer });
    });

    socket.on('new-ice-candidate', (data) => {
        io.to(data.target).emit('new-ice-candidate', { candidate: data.candidate });
    });

    socket.on('end-call', (data) => {
        if (data && data.target) io.to(data.target).emit('end-call');
    });

    socket.on('disconnect', () => {
        if (activeOTPs[socket.id]) delete activeOTPs[socket.id];
        if (users[socket.id]) {
            const closedUser = users[socket.id];
            delete users[socket.id];
            io.emit('update-contacts', users);
            console.log(`❌ Station disconnected: ${closedUser} [${socket.id}]`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================================\n[Conduit Secure Deployed]\nAccess at: https://localhost:${PORT}\n========================================================\n`);
});