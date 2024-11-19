const express = require("express");
const path = require("path");

const app = express();
const server = require("http").createServer(app);

const io = require("socket.io")(server);

// Chat state
let chatHistory = [];
let isChatLocked = false;

app.use(express.static(path.join(__dirname + "/public")));

io.on("connection", (socket) => {
    console.log("A user connected");

    // Send the current chat state (history and lock status)
    socket.emit("chat-state", { chatHistory, isChatLocked });

    // Handle new user joining
    socket.on("newuser", (username) => {
        if (!isChatLocked) {
            socket.broadcast.emit("update", `${username} joined`);
        }
    });

    // Handle user exit
    socket.on("exituser", (username) => {
        if (!isChatLocked) {
            socket.broadcast.emit("update", `${username} left`);
        }
    });

    // Handle chat messages
    socket.on("chat", (message) => {
        if (!isChatLocked) {
            chatHistory.push(message);
            socket.broadcast.emit("chat", message);
        } else {
            socket.emit("update", "Chat is locked. You cannot send messages.");
        }
    });

    // Handle PIN actions
    socket.on("pin-action", (pin) => {
        if (pin === "7613") {
            // Lock chat and clear history
            chatHistory = [];
            isChatLocked = true;
            io.emit("chat-locked", "Locked by the admin.");
        } else if (pin === "0913") {
            // Unlock chat
            isChatLocked = false;
            io.emit("chat-unlocked", "Chat has been unlocked by the admin.");
        } else {
            socket.emit("update", "Invalid PIN.");
        }
    });
});
const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log("Server is running on ${port}");
});