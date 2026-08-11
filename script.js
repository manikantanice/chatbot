const input = document.getElementById("userInput");
const button = document.getElementById("sendButton");
const messagesBox = document.getElementById("chatMessages");

let messages = [
    {
        role: "system",
        content: "You are a helpful and friendly AI assistant."
    }
];

button.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        sendMessage();
    }

});

async function sendMessage() {

    const text = input.value.trim();

    if (!text) {
        return;
    }

    addMessage(text, "user");

    messages.push({
        role: "user",
        content: text
    });

    input.value = "";

    const loadingMessage = addMessage(
        "Thinking...",
        "bot"
    );

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages
            })

        });

        const data = await response.json();

        loadingMessage.remove();

        if (data.reply) {

            addMessage(
                data.reply,
                "bot"
            );

            messages.push({
                role: "assistant",
                content: data.reply
            });

        } else {

            addMessage(
                "Sorry, something went wrong.",
                "bot"
            );

        }

    } catch (error) {

        loadingMessage.remove();

        addMessage(
            "Unable to connect to AI.",
            "bot"
        );

        console.error(error);
    }
}

function addMessage(text, type) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    message.textContent = text;

    messagesBox.appendChild(message);

    messagesBox.scrollTop =
        messagesBox.scrollHeight;

    return message;
}