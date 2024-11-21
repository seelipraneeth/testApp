(function () {

    const app = document.querySelector(".app");
    const socket = io();
    const messageSound = new Audio('message.mp3');
    let uname;
    let isChatLocked = false;
    let isMuted = false;
    let unreadMessagesCount = 0;
    let isPasswordLocked = false;

    class Chat {
        constructor(uname, messageText) {
            this.uname = uname;
            this.messageText = messageText;
            this.time = new Date(); // Default to current time
        }
    }

    async function loadTodaysMessages() {
        try {
            const response = await fetch('/api/messages/today');
            if (response.ok) {
                const chats = await response.json();
                chats.forEach((chat) => {
                    if (chat.uname === uname) {
                        renderMessage("my", chat);
                    } else {
                        renderMessage("other", chat);
                    }
                });
            } else {
                console.error("Failed to fetch messages.");
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }

    // Local state for lock

    // Prompt for PIN on page load
    window.onload = async function () {
        let pin = prompt("Redirecting to login, enter user name");
        if (pin === "123911") {
            uname = "Mounika";
        } else if (pin === "9630") {
            uname = "Praneeth";
            isMuted = true;
        } else if (pin === "7613" || pin === "9704123911" || pin === "0913") {
            // Handle admin actions
            socket.emit("pin-action", pin);
            alert("Your account is locked.");
            return; // Stop execution for non-chat users
        } else {
            alert("You account is locked temporarily.");
            return; // Stop further execution
        }

        // Notify server about the new user
        socket.emit("newuser", uname);

        app.querySelector(".chat-screen").classList.add("active");
        await loadTodaysMessages();
    };

    // Receive the chat state (history and lock status)
    socket.on("chat-state", function (state) {
        isChatLocked = state;
        if (isChatLocked) {
            renderMessage("update", "Im too busy, Please wait for me dear.");
        }
    });

    function sendMessage() {
        if (isChatLocked) {
            renderMessage("update", "Im too busy, Please wait for me dear.");
            return;
        }

        let message = app.querySelector(".chat-screen #message-input").value;
        if (message.length == 0) {
            return;
        }
        const chat = new Chat(uname, message);
        renderMessage("my", chat);

        socket.emit("chat", chat);
        app.querySelector(".chat-screen #message-input").value = "";

        app.querySelector(".chat-screen #message-input").focus();
    }

    app.querySelector(".chat-screen #send-message").addEventListener("click", sendMessage);

    app.querySelector(".chat-screen #message-input").addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    // // Exiting the chat
    // app.querySelector(".chat-screen #exit-chat").addEventListener("click", function () {
    //     socket.emit("exituser", uname);
    //     window.location.href = window.location.href;
    // });

    app.querySelector(".chat-screen #mute-button").addEventListener("click", function () {
        isMuted = !isMuted;
        this.textContent = isMuted ? "Unmute" : "Mute";
    });

    // Receiving updates
    socket.on("update", function (update) {
        renderMessage("update", update);
    });

    socket.on("chat", function (message) {
        // Ensure proper alignment based on sender's username
        const messageType = message.username === uname ? "my" : "other";
        if (messageType === "other" && !isMuted && document.hidden) {
            messageSound.play();
        }
        renderMessage(messageType, message);

        if (message.username !== uname && document.hidden) {
            unreadMessagesCount++;
            updateDocumentTitle();
        }
    });

    // Handle chat lock and unlock
    socket.on("chat-locked", function (message) {
        isChatLocked = true;
        renderMessage("update", message);
    });

    socket.on("chat-unlocked", function (message) {
        isChatLocked = false;
        renderMessage("update", message);
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            unreadMessagesCount = 0; // Reset unread message count when tab is focused
            document.title = "Shvintech";
        }
    });

    function updateDocumentTitle() {
        if (document.hidden) {
            document.title = `(${unreadMessagesCount}) New Messages`;
        }
    }
    // Render messages
    function renderMessage(type, chat) {
        const finalDate = chat.time
            ? new Date(chat.time)
            : new Date();

        const timeString = finalDate.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        let messageContainer = app.querySelector(".chat-screen .messages");
        if (type === "my") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "message my-message");
            e1.innerHTML = `
            <div>
                <div class="name">You - ${timeString}</div>
                <div class="text">${chat.messageText}</div>
            </div>
            `;
            messageContainer.appendChild(e1);
        } else if (type === "other") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "message other-message");
            e1.innerHTML = `
            <div>
                <div class="name">${chat.uname} - ${timeString}</div>
                <div class="text">${chat.messageText}</div>
            </div>
            `;
            messageContainer.appendChild(e1);
        } else if (type === "update") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "update");
            e1.innerHTML = chat.messageText;
            messageContainer.appendChild(e1);
        }
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
    }
})();
