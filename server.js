const express = require("express");
const path = require("path");
const Chat = require('./models/Chat');
const app = express();
const server = require("http").createServer(app);
const mongoose = require('mongoose');
const io = require("socket.io")(server);

//mongoose.connect(process.env.MONGO_URL)
mongoose.connect("mongodb://localhost:27017/billnest")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB connection error:", err));
app.use(express.json());
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

app.post('/api/delete-collection', async (req, res) => {
    const { pin } = req.body;

    // Check the pin (you can extend this check based on your requirements)
    if (pin === "seelip" || pin === "eruvurim") {
        try {
            await mongoose.connection.db.dropCollection("chats");
            console.log(`Collection deleted for pin: ${pin}`);
            return res.redirect("https://shvintech.com");
        } catch (error) {
            console.error("Error deleting collection:", error);
            return;
        }
    } else {
        return;
    }
});

let isChatLocked = false;
let onlineUsers = {};

app.use(express.static(path.join(__dirname + "/public")));

function getMounikaStatus() {
    var status = 'offline';
    for (let socketId in onlineUsers) {
        if (onlineUsers[socketId] === "Mounika") {
            return 'online';
        }
    }
    return status;
}

io.on("connection", (socket) => {
    console.log("A user connected");

    // Send the current chat state (history and lock status)
    socket.emit("chat-state", isChatLocked);

    // Handle new user joining
    socket.on("newuser", async (uname) => {
        onlineUsers[socket.id] = uname;
        if (!isChatLocked) {
            if (uname === "Mounika") {
                mounikaOnline = true;
                const chat = new Chat({
                    uname: "Mounika",
                    messageText: "Mounika joined"
                });
                await chat.save();
            }
            socket.broadcast.emit("update", new Chat({ uname: uname, messageText: `${uname} joined` }));
        }
        io.emit("mounika-status", getMounikaStatus());
    });

    // Handle user exit
    socket.on("exituser", (uname) => {
        if (uname === "Mounika") {
            mounikaOnline = false;
            io.emit("mounika-status", "Mounika is offline");
        }
        if (!isChatLocked) {
            socket.broadcast.emit("update", new Chat({ uname: uname, messageText: `${uname} left` }));
        }
    });

    socket.on("disconnect", async () => {
        const uname = onlineUsers[socket.id];
        if (uname) {
            if (uname === "Mounika") {
                mounikaOnline = true;
                const chat = new Chat({
                    uname: "Mounika",
                    messageText: "Mounika left"
                });
                await chat.save();
                socket.broadcast.emit("update", new Chat({ uname: uname, messageText: `${uname} left` }));
            }
            delete onlineUsers[socket.id];  // Remove the user from the online users list
        }
        io.emit("mounika-status", getMounikaStatus());
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