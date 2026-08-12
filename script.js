/* =========================================================
   MINI AI
   FRONTEND FUNCTIONALITY
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const input =
    document.getElementById("userInput");

const sendButton =
    document.getElementById("sendButton");

const messagesBox =
    document.getElementById("chatMessages");

const welcomeScreen =
    document.getElementById("welcomeScreen");

const newChatButton =
    document.getElementById("newChat");

const menuButton =
    document.getElementById("menuBtn");

const sidebar =
    document.getElementById("sidebar");

const recentList =
    document.getElementById("recentList");

const themeButton =
    document.getElementById("themeButton");

const githubButton =
    document.getElementById("githubButton");

const micButton =
    document.getElementById("micButton");


/* =========================================================
   STATE
========================================================= */

const SYSTEM_MESSAGE = {

    role: "system",

    content:
        `You are Mini AI, a highly capable, helpful,
friendly and intelligent AI assistant.

Give accurate, clear and useful answers.

When the user asks coding questions,
provide working code with explanations.

When appropriate, use headings,
bullet points and examples.

Do not unnecessarily repeat the user's question.`
};


let messages = [
    SYSTEM_MESSAGE
];


let isSending = false;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        input.focus();

        loadTheme();

        createWelcomeParticles();

    }
);


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {


    if (isSending) {

        return;

    }


    const text =
        input.value.trim();


    if (!text) {

        return;

    }


    isSending = true;


    sendButton.disabled = true;

    sendButton.classList.add("sending");


    /* Hide welcome */

    welcomeScreen.classList.add("hidden");


    /* User message */

    addMessage(
        text,
        "user"
    );


    /* Store message */

    messages.push({

        role: "user",

        content: text

    });


    /* Add recent chat */

    addRecentChat(text);


    /* Clear input */

    input.value = "";

    resetTextarea();


    /* Loading */

    const loading =
        addTypingMessage();


    try {


        const response =
            await fetch(
                "/api/chat",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            messages:
                                messages

                        })

                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server returned an invalid response."
            );

        }


        /* Remove loading */

        loading.remove();


        /* API error */

        if (!response.ok) {

            throw new Error(
                data.error ||
                `Request failed (${response.status})`
            );

        }


        if (!data.reply) {

            throw new Error(
                "AI did not return a response."
            );

        }


        /* AI response */

        await addBotMessage(
            data.reply
        );


        /* Save conversation */

        messages.push({

            role: "assistant",

            content: data.reply

        });


    } catch (error) {


        console.error(
            "Mini AI Error:",
            error
        );


        if (loading) {

            loading.remove();

        }


        addMessage(

            "⚠️ " +
            getFriendlyError(
                error
            ),

            "error"

        );

    }


    isSending = false;

    sendButton.disabled = false;

    sendButton.classList.remove(
        "sending"
    );

    input.focus();

}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getFriendlyError(error) {

    const message =
        error?.message ||
        "Something went wrong.";


    if (
        message.includes(
            "Failed to fetch"
        )
    ) {

        return (
            "Unable to connect to Mini AI. " +
            "Please check your internet connection " +
            "or Vercel API configuration."
        );

    }


    return message;

}


/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessage(
    text,
    type
) {


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message " + type;


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        text;


    message.appendChild(
        bubble
    );


    messagesBox.appendChild(
        message
    );


    scrollMessages();


    return message;

}


/* =========================================================
   AI MESSAGE
   TYPING EFFECT
========================================================= */

async function addBotMessage(
    text
) {


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message bot";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    message.appendChild(
        bubble
    );


    messagesBox.appendChild(
        message
    );


    scrollMessages();


    /* Typing effect */

    for (
        let i = 0;
        i < text.length;
        i++
    ) {


        bubble.textContent +=
            text[i];


        /* Speed */

        let speed = 10;


        if (
            text[i] === "." ||
            text[i] === "," ||
            text[i] === "!"
        ) {

            speed = 35;

        }


        await sleep(
            speed
        );


        scrollMessages();

    }


    return message;

}


/* =========================================================
   TYPING INDICATOR
========================================================= */

function addTypingMessage() {


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message bot";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble typing-bubble";


    bubble.innerHTML = `

        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>

    `;


    message.appendChild(
        bubble
    );


    messagesBox.appendChild(
        message
    );


    scrollMessages();


    return message;

}


/* =========================================================
   SCROLL
========================================================= */

function scrollMessages() {


    messagesBox.scrollTo({

        top:
            messagesBox.scrollHeight,

        behavior:
            "smooth"

    });

}


/* =========================================================
   ENTER TO SEND
========================================================= */

input.addEventListener(
    "keydown",
    function(event) {


        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {


            event.preventDefault();


            sendMessage();

        }

    }
);


/* =========================================================
   SEND BUTTON
========================================================= */

sendButton.addEventListener(
    "click",
    sendMessage
);


/* =========================================================
   TEXTAREA AUTO HEIGHT
========================================================= */

input.addEventListener(
    "input",
    autoResize
);


function autoResize() {


    input.style.height =
        "auto";


    input.style.height =
        Math.min(
            input.scrollHeight,
            140
        ) + "px";

}


function resetTextarea() {

    input.style.height =
        "auto";

}


/* =========================================================
   QUICK ACTIONS
========================================================= */

document
    .querySelectorAll(
        ".action-card"
    )
    .forEach(
        card => {


            card.addEventListener(
                "click",
                () => {


                    const prompt =
                        card.dataset.prompt ||
                        "";


                    input.value =
                        prompt;


                    autoResize();


                    input.focus();

                }
            );

        }
    );


/* =========================================================
   NEW CHAT
========================================================= */

newChatButton.addEventListener(
    "click",
    newChat
);


function newChat() {


    if (isSending) {

        return;

    }


    /* Reset messages */

    messages = [
        SYSTEM_MESSAGE
    ];


    /* Clear UI */

    messagesBox.innerHTML =
        "";


    /* Show welcome */

    welcomeScreen.classList.remove(
        "hidden"
    );


    /* Clear input */

    input.value = "";

    resetTextarea();


    /* Clear active recent */

    document
        .querySelectorAll(
            ".recent-chat"
        )
        .forEach(
            item =>
                item.classList.remove(
                    "active"
                )
        );


    input.focus();

}


/* =========================================================
   RECENT CHAT
========================================================= */

function addRecentChat(
    text
) {


    const existing =
        document.querySelector(
            ".recent-chat"
        );


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "recent-chat";


    item.innerHTML = `

        <i class="fa-regular fa-message"></i>

        <span></span>

    `;


    item.querySelector(
        "span"
    ).textContent =
        text;


    recentList.prepend(
        item
    );


    /* Keep only 5 */

    while (
        recentList.children.length > 5
    ) {

        recentList.lastElementChild.remove();

    }

}


/* =========================================================
   MOBILE MENU
========================================================= */

menuButton.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle(
            "open"
        );

    }
);


/* Close sidebar when clicking chat */

document
    .getElementById(
        "currentChat"
    )
    .addEventListener(
        "click",
        () => {

            sidebar.classList.remove(
                "open"
            );

        }
    );


/* =========================================================
   THEME
========================================================= */

themeButton.addEventListener(
    "click",
    toggleTheme
);


function toggleTheme() {


    document.body.classList.toggle(
        "light"
    );


    const isLight =
        document.body.classList.contains(
            "light"
        );


    localStorage.setItem(
        "miniAITheme",
        isLight
            ? "light"
            : "dark"
    );


    updateThemeIcon();

}


function loadTheme() {


    const saved =
        localStorage.getItem(
            "miniAITheme"
        );


    if (
        saved === "light"
    ) {

        document.body.classList.add(
            "light"
        );

    }


    updateThemeIcon();

}


function updateThemeIcon() {


    const icon =
        themeButton.querySelector(
            "i"
        );


    const light =
        document.body.classList.contains(
            "light"
        );


    icon.className =
        light
            ? "fa-solid fa-moon"
            : "fa-regular fa-sun";

}


/* =========================================================
   GITHUB BUTTON
========================================================= */

githubButton.addEventListener(
    "click",
    () => {

        window.open(
            "https://github.com/manikantanice/chatbot",
            "_blank"
        );

    }
);


/* =========================================================
   MICROPHONE
========================================================= */

micButton.addEventListener(
    "click",
    startVoiceInput
);


function startVoiceInput() {


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice input is not supported in this browser."
        );

        return;

    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";


    recognition.interimResults =
        false;


    recognition.maxAlternatives =
        1;


    micButton.classList.add(
        "recording"
    );


    recognition.start();


    recognition.onresult =
        event => {


            const transcript =
                event.results[0][0]
                    .transcript;


            input.value =
                transcript;


            autoResize();

            input.focus();

        };


    recognition.onerror =
        error => {

            console.error(
                "Voice error:",
                error
            );

        };


    recognition.onend =
        () => {

            micButton.classList.remove(
                "recording"
            );

        };

}


/* =========================================================
   WEB BUTTON
========================================================= */

document
    .getElementById(
        "webButton"
    )
    .addEventListener(
        "click",
        () => {


            input.value =
                "Search the web for ";


            autoResize();

            input.focus();

        }
    );


/* =========================================================
   SETTINGS
========================================================= */

document
    .getElementById(
        "settingsButton"
    )
    .addEventListener(
        "click",
        () => {


            alert(
                "Mini AI Settings\n\n" +
                "Theme, voice and chat controls are available."
            );

        }
    );


/* =========================================================
   HELPERS
========================================================= */

function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


/* =========================================================
   BACKGROUND PARTICLE RANDOMIZATION
========================================================= */

function createWelcomeParticles() {


    const particles =
        document.querySelectorAll(
            ".floating-particles span"
        );


    particles.forEach(
        particle => {


            const duration =
                4 +
                Math.random() * 5;


            const delay =
                Math.random() * -5;


            particle.style.animationDuration =
                duration + "s";


            particle.style.animationDelay =
                delay + "s";

        }
    );

}
