```javascript
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


// ================= SEND MESSAGE =================

button.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (event) {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        sendMessage();
    }

});


// ================= SEND FUNCTION =================

async function sendMessage() {

    const text = input.value.trim();

    if (!text) {
        return;
    }


    // Remove welcome screen
    const welcome = document.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }


    // Add user message
    addMessage(text, "user");


    messages.push({
        role: "user",
        content: text
    });


    // Clear input
    input.value = "";


    // Disable button while waiting
    button.disabled = true;


    // Thinking message
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


        // Remove thinking message
        loadingMessage.remove();


        if (data.reply) {

            // Add AI response
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
            "Unable to connect to AI. Please try again.",
            "bot"
        );

        console.error(error);

    }


    // Enable button
    button.disabled = false;

    input.focus();
}


// ================= ADD MESSAGE =================

function addMessage(text, type) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    message.textContent = text;

    messagesBox.appendChild(message);


    // Scroll to latest message
    messagesBox.scrollTo({

        top: messagesBox.scrollHeight,

        behavior: "smooth"

    });


    return message;
}


// ================= NEW CHAT =================

newChatButton.addEventListener("click", function () {

    // Reset messages
    messages = [
        {
            role: "system",
            content: "You are a helpful and friendly AI assistant."
        }
    ];


    // Clear chat
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


    // Clear input
    input.value = "";

    input.focus();


    // Close mobile sidebar
    sidebar.classList.remove("open");

});


// ================= MOBILE MENU =================

if (menuButton) {

    menuButton.addEventListener("click", function () {

        sidebar.classList.toggle("open");

    });

}
```
