const input = document.getElementById("userInput");
const button = document.getElementById("sendButton");
const messagesBox = document.getElementById("chatMessages");
const newChatButton = document.getElementById("newChat");
const menuButton = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");

let messages = [
    {
        role: "system",
        content: "You are a helpful and friendly AI assistant."
    }
];

button.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {

    const text = input.value.trim();

    if (!text) return;

    const welcome = document.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    addMessage(text, "user");

    messages.push({
        role: "user",
        content: text
    });

    input.value = "";
    button.disabled = true;

    const loadingMessage = addMessage("Thinking...", "bot");

    try {

        console.log("Sending request to /api/chat");

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: messages
            })
        });

        console.log("API status:", response.status);

        const data = await response.json();

        console.log("API response:", data);

        loadingMessage.remove();

        if (response.ok && data.reply) {

            addMessage(data.reply, "bot");

            messages.push({
                role: "assistant",
                content: data.reply
            });

        } else {

            addMessage(
                "API Error: " + (data.error || "Unknown error"),
                "bot"
            );

        }

    } catch (error) {

        loadingMessage.remove();

        addMessage(
            "Connection Error: " + error.message,
            "bot"
        );

        console.error("FULL ERROR:", error);

    }

    button.disabled = false;
    input.focus();
}


function addMessage(text, type) {

    const message = document.createElement("div");

    message.className = "message " + type;

    message.textContent = text;

    messagesBox.appendChild(message);

    messagesBox.scrollTo({
        top: messagesBox.scrollHeight,
        behavior: "smooth"
    });

    return message;
}


newChatButton.addEventListener("click", function () {

    messages = [
        {
            role: "system",
            content: "You are a helpful and friendly AI assistant."
        }
    ];

    messagesBox.innerHTML = `
        <div class="welcome">

            <div class="welcome-icon">
                ✨
            </div>

            <h1>How can I help you?</h1>

            <p>
                Ask me anything and I'll do my best to help.
            </p>

        </div>
    `;

    input.value = "";
    input.focus();

});


if (menuButton) {

    menuButton.addEventListener("click", function () {

        sidebar.classList.toggle("open");

    });

}
