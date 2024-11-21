const express = require("express");
const path = require("path");
const Chat = require('./models/Chat');
const app = express();
const server = require("http").createServer(app);
const mongoose = require('mongoose');
const io = require("socket.io")(server);

mongoose.connect('mongodb+srv://admin:XF26rW90WaOyEU8v@amps-ai.4mdpm.mongodb.net/billnest?retryWrites=true&w=majority&appName=amps-ai')
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB connection error:", err));

app.get('/api/messages/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setDate(startOfDay.getDate() - 1);
        startOfDay.setHours(0, 0, 0, 0);

        const messages = await Chat.find({
            time: { $gte: startOfDay },
        }).sort({ time: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching messages" });
    }
});

let isChatLocked = false;

app.use(express.static(path.join(__dirname + "/public")));

io.on("connection", (socket) => {
    console.log("A user connected");

    // Send the current chat state (history and lock status)
    socket.emit("chat-state", isChatLocked);

    // Handle new user joining
    socket.on("newuser", (uname) => {
        if (!isChatLocked) {
            socket.broadcast.emit("update", new Chat({ uname: uname, messageText: `${uname} joined` }));
        }
    });

    // Handle user exit
    socket.on("exituser", (uname) => {
        if (!isChatLocked) {
            socket.broadcast.emit("update", new Chat({ uname: uname, messageText: `${uname} left` }));
        }
    });

    // Handle chat messages
    socket.on("chat", async (fChat) => {
        if (!isChatLocked) {
            const chat = new Chat({
                uname: fChat.uname,
                messageText: fChat.messageText,
                time: fChat.time,
            });

            await chat.save();
            socket.broadcast.emit("chat", fChat);
        } else {
            socket.emit("update", "Chat is locked. You cannot send messages.");
        }
    });

    // Handle PIN actions
    socket.on("pin-action", (pin) => {
        if (pin === "7613") {
            // Lock chat
            isChatLocked = true;
            io.emit("chat-locked", "Im too busy, Please wait for me dear.");
        } else if (pin === "9704123911") {
            // Lock chat and clear history
            isChatLocked = false;
            io.emit("chat-unlocked", "Im too busy, Please wait for me dear.");
        } else if (pin === "0913") {
            // Unlock chat
            isChatLocked = false;
            io.emit("chat-unlocked", "Im available");
        } else {
            socket.emit("update", "Invalid PIN.");
        }
    });
});
const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log("Server is running on ${port}");
});