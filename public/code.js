(function () {
    const app = document.querySelector(".app");
    const socket = io();

    let uname;
    let isChatLocked = false; // Local state for lock

    // Prompt for PIN on page load
    window.onload = function () {
        let pin = prompt("Redirecting to login, enter user name");
        if (pin === "123911") {
            uname = "Mounika";
        } else if (pin === "9630") {
            uname = "Praneeth";
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
    };

    // Receive the chat state (history and lock status)
    socket.on("chat-state", function (state) {
        const { chatHistory, isChatLocked: serverLock } = state;
        isChatLocked = serverLock;

        if (isChatLocked) {
            renderMessage("update", "Im too busy, Please wait for me dear.");
        } else {
            chatHistory.forEach((message) => {
                // Ensure proper alignment based on sender's username
                const messageType = message.username === uname ? "my" : "other";
                renderMessage(messageType, message);
            });
        }
    });

    // Sending messages
    app.querySelector(".chat-screen #send-message").addEventListener("click", function () {
        if (isChatLocked) {
            renderMessage("update", "Im too busy, Please wait for me dear.");
            return;
        }

        let message = app.querySelector(".chat-screen #message-input").value;
        if (message.length == 0) {
            return;
        }

        renderMessage("my", {
            username: uname,
            text: message
        });

        socket.emit("chat", {
            username: uname,
            text: message
        });
        app.querySelector(".chat-screen #message-input").value = "";
    });

    // Exiting the chat
    app.querySelector(".chat-screen #exit-chat").addEventListener("click", function () {
        socket.emit("exituser", uname);
        window.location.href = window.location.href;
    });

    // Receiving updates
    socket.on("update", function (update) {
        renderMessage("update", update);
    });

    socket.on("chat", function (message) {
        // Ensure proper alignment based on sender's username
        const messageType = message.username === uname ? "my" : "other";
        renderMessage(messageType, message);
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

    // Render messages
    function renderMessage(type, message) {
        let messageContainer = app.querySelector(".chat-screen .messages");
        if (type === "my") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "message my-message");
            e1.innerHTML = `
            <div>
                <div class="name">you</div>
                <div class="text">${message.text}</div>
            </div>
            `;
            messageContainer.appendChild(e1);
        } else if (type === "other") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "message other-message");
            e1.innerHTML = `
            <div>
                <div class="name">${message.username}</div>
                <div class="text">${message.text}</div>
            </div>
            `;
            messageContainer.appendChild(e1);
        } else if (type === "update") {
            let e1 = document.createElement("div");
            e1.setAttribute("class", "update");
            e1.innerHTML = message;
            messageContainer.appendChild(e1);
        }
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
    }
})();
