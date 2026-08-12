document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       ELEMENTS
    ================================================= */

    const input =
        document.getElementById("messageInput");

    const sendBtn =
        document.getElementById("sendBtn");

    const chatArea =
        document.querySelector(".chat-area");

    const chatMessages =
        document.getElementById("chatMessages");

    const welcomeScreen =
        document.getElementById("welcomeScreen");

    const newChatBtn =
        document.getElementById("newChatBtn");

    const currentConversation =
        document.getElementById("currentConversation");

    const recentChats =
        document.getElementById("recentChats");

    const plusBtn =
        document.getElementById("plusBtn");

    const toolsPopup =
        document.getElementById("toolsPopup");

    const webBtn =
        document.getElementById("webBtn");

    const attachBtn =
        document.getElementById("attachBtn");

    const fileInput =
        document.getElementById("fileInput");

    const attachmentPreview =
        document.getElementById("attachmentPreview");

    const magicBtn =
        document.getElementById("magicBtn");

    const micBtn =
        document.getElementById("micBtn");

    const composerExpand =
        document.getElementById("composerExpand");

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");

    const mobileOverlay =
        document.getElementById("mobileOverlay");

    const clearBtn =
        document.getElementById("clearBtn");

    const searchBtn =
        document.getElementById("searchBtn");

    const settingsBtn =
        document.getElementById("settingsBtn");

    const topSettingsBtn =
        document.getElementById("topSettingsBtn");

    const proBtn =
        document.getElementById("proBtn");

    const quickCards =
        document.querySelectorAll(".quick-card");


    /* =================================================
       STATE
    ================================================= */

    let conversation = [];

    let selectedFiles = [];

    let webMode = false;

    let sending = false;

    let recognition = null;


    /* =================================================
       INITIALIZE
    ================================================= */

    input.focus();

    autoResize();


    /* =================================================
       TEXTAREA AUTO RESIZE
    ================================================= */

    function autoResize() {

        input.style.height = "auto";

        input.style.height =
            Math.min(input.scrollHeight, 200) + "px";
    }


    input.addEventListener(
        "input",
        autoResize
    );


    /* =================================================
       ENTER SEND
    ================================================= */

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }

        }
    );


    /* =================================================
       SEND BUTTON
    ================================================= */

    sendBtn.addEventListener(
        "click",
        sendMessage
    );


    /* =================================================
       SEND MESSAGE
    ================================================= */

    async function sendMessage() {

        if (sending) return;


        const message =
            input.value.trim();


        if (!message && selectedFiles.length === 0) {
            input.focus();
            return;
        }


        /* ---------------------------------------------
           Hide welcome
        --------------------------------------------- */

        welcomeScreen.style.display = "none";


        /* ---------------------------------------------
           Add user message
        --------------------------------------------- */

        const displayMessage =
            message ||
            "Attached file(s)";


        addMessage(
            "user",
            displayMessage
        );


        /* ---------------------------------------------
           Conversation
        --------------------------------------------- */

        conversation.push({
            role: "user",
            content: message
        });


        /* ---------------------------------------------
           Clear
        --------------------------------------------- */

        input.value = "";

        autoResize();


        toolsPopup.classList.remove("show");


        /* ---------------------------------------------
           Loading
        --------------------------------------------- */

        setLoading(true);


        try {

            /*
             * Existing API endpoint
             */

            const response =
                await fetch(
                    "/api/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            message: message,

                            messages:
                                conversation,

                            webSearch:
                                webMode,

                            /*
                             * File information.
                             *
                             * Your existing chat.js
                             * can ignore this if it
                             * doesn't use files.
                             */

                            files:
                                selectedFiles.map(
                                    file => ({
                                        name: file.name,
                                        type: file.type,
                                        size: file.size
                                    })
                                )

                        })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `API error ${response.status}`
                );
            }


            const data =
                await response.json();


            /* -----------------------------------------
               Detect response
            ----------------------------------------- */

            const reply =
                getReplyFromResponse(data);


            /* -----------------------------------------
               AI typing
            ----------------------------------------- */

            await typeAIMessage(
                reply
            );


            /* -----------------------------------------
               Save
            ----------------------------------------- */

            conversation.push({
                role: "assistant",
                content: reply
            });


            /* -----------------------------------------
               Save recent
            ----------------------------------------- */

            saveRecentChat(message);


        } catch (error) {

            console.error(
                "Chat API Error:",
                error
            );


            addMessage(
                "ai",
                "⚠️ I couldn't connect to the AI right now. Please try again."
            );

        } finally {

            setLoading(false);

            selectedFiles = [];

            fileInput.value = "";

            renderAttachments();

        }

    }


    /* =================================================
       GET API RESPONSE
    ================================================= */

    function getReplyFromResponse(data) {

        if (!data) {

            return "I didn't receive a response.";
        }


        if (typeof data === "string") {

            return data;
        }


        /*
         * Common API formats
         */

        if (typeof data.reply === "string") {
            return data.reply;
        }

        if (typeof data.message === "string") {
            return data.message;
        }

        if (typeof data.response === "string") {
            return data.response;
        }

        if (typeof data.content === "string") {
            return data.content;
        }


        /*
         * OpenAI-style response
         */

        if (
            data.choices &&
            data.choices[0]
        ) {

            const choice =
                data.choices[0];


            if (
                choice.message &&
                typeof choice.message.content === "string"
            ) {

                return choice.message.content;
            }


            if (
                typeof choice.text === "string"
            ) {

                return choice.text;
            }

        }


        return "I couldn't generate a response.";

    }


    /* =================================================
       ADD MESSAGE
    ================================================= */

    function addMessage(
        type,
        text
    ) {

        const wrapper =
            document.createElement("div");


        wrapper.className =
            `chat-message ${type}`;


        const bubble =
            document.createElement("div");


        bubble.className =
            "chat-bubble";


        bubble.innerHTML =
            formatMessage(text);


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        scrollChat();


        return bubble;
    }


    /* =================================================
       AI TYPEWRITER
    ================================================= */

    async function typeAIMessage(
        text
    ) {

        const wrapper =
            document.createElement("div");


        wrapper.className =
            "chat-message ai";


        const bubble =
            document.createElement("div");


        bubble.className =
            "chat-bubble";


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        /*
         * Type plain text first
         */

        const plain =
            stripHTML(text);


        let current = "";


        for (
            let i = 0;
            i < plain.length;
            i++
        ) {

            current += plain[i];

            bubble.textContent =
                current;


            scrollChat();


            /*
             * Slightly variable typing
             */

            await sleep(
                plain[i] === " "
                    ? 5
                    : 9
            );

        }


        /*
         * Final formatted output
         */

        bubble.innerHTML =
            formatMessage(text);


        scrollChat();

    }


    /* =================================================
       FORMAT MESSAGE
    ================================================= */

    function formatMessage(
        text
    ) {

        if (!text) return "";


        let safe =
            escapeHTML(
                String(text)
            );


        /*
         * Code blocks
         */

        safe =
            safe.replace(
                /```([\s\S]*?)```/g,
                "<pre><code>$1</code></pre>"
            );


        /*
         * Bold
         */

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /*
         * Inline code
         */

        safe =
            safe.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );


        /*
         * New lines
         */

        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );


        return safe;
    }


    /* =================================================
       ESCAPE HTML
    ================================================= */

    function escapeHTML(
        text
    ) {

        const div =
            document.createElement(
                "div"
            );

        div.textContent =
            text;

        return div.innerHTML;
    }


    function stripHTML(
        text
    ) {

        const div =
            document.createElement(
                "div"
            );

        div.innerHTML =
            text;

        return (
            div.textContent ||
            div.innerText ||
            ""
        );

    }


    /* =================================================
       SCROLL
    ================================================= */

    function scrollChat() {

        requestAnimationFrame(
            () => {

                chatArea.scrollTo({
                    top:
                        chatArea.scrollHeight,
                    behavior:
                        "smooth"
                });

            }
        );

    }


    /* =================================================
       LOADING
    ================================================= */

    function setLoading(
        state
    ) {

        sending = state;

        sendBtn.classList.toggle(
            "loading",
            state
        );

    }


    /* =================================================
       PLUS BUTTON
    ================================================= */

    plusBtn.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toolsPopup.classList.toggle(
                "show"
            );

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !toolsPopup.contains(
                    event.target
                ) &&
                !plusBtn.contains(
                    event.target
                )
            ) {

                toolsPopup.classList.remove(
                    "show"
                );

            }

        }
    );


    /* =================================================
       WEB MODE
    ================================================= */

    webBtn.addEventListener(
        "click",
        () => {

            webMode =
                !webMode;


            webBtn.classList.toggle(
                "active",
                webMode
            );


            input.placeholder =
                webMode
                    ? "Search the web with Mini AI..."
                    : "Message Mini AI...";


            input.focus();

        }
    );


    /* =================================================
       FILE ATTACH
    ================================================= */

    attachBtn.addEventListener(
        "click",
        () => {

            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        () => {

            const files =
                Array.from(
                    fileInput.files
                );


            selectedFiles.push(
                ...files
            );


            renderAttachments();

        }
    );


    /* =================================================
       FILE PREVIEW
    ================================================= */

    function renderAttachments() {

        attachmentPreview.innerHTML =
            "";


        selectedFiles.forEach(
            (file, index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "attachment-item";


                item.innerHTML = `

                    <span>📎</span>

                    <span>
                        ${escapeHTML(file.name)}
                    </span>

                    <button
                        type="button"
                        class="remove-file"
                        data-index="${index}"
                    >
                        ×
                    </button>

                `;


                attachmentPreview.appendChild(
                    item
                );

            }
        );


        document
            .querySelectorAll(
                ".remove-file"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const index =
                                Number(
                                    button.dataset.index
                                );


                            selectedFiles.splice(
                                index,
                                1
                            );


                            renderAttachments();

                        }
                    );

                }
            );

    }


    /* =================================================
       MAGIC AI
    ================================================= */

    magicBtn.addEventListener(
        "click",
        () => {

            input.focus();

            input.value =
                "Help me with ";

            autoResize();

        }
    );


    /* =================================================
       TOOL OPTIONS
    ================================================= */

    document
        .querySelectorAll(
            ".tool-option"
        )
        .forEach(
            option => {

                option.addEventListener(
                    "click",
                    () => {

                        const action =
                            option.dataset.action;


                        if (
                            action === "image"
                        ) {

                            input.value =
                                "Create an image of ";

                        }


                        if (
                            action === "code"
                        ) {

                            input.value =
                                "Write code for ";

                        }


                        if (
                            action === "summarize"
                        ) {

                            input.value =
                                "Summarize this: ";

                        }


                        autoResize();

                        input.focus();

                        toolsPopup.classList.remove(
                            "show"
                        );

                    }
                );

            }
        );


    /* =================================================
       QUICK CARDS
    ================================================= */

    quickCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const prompt =
                        card.dataset.prompt;


                    input.value =
                        prompt;


                    autoResize();

                    input.focus();

                }
            );

        }
    );


    /* =================================================
       NEW CHAT
    ================================================= */

    newChatBtn.addEventListener(
        "click",
        newChat
    );


    currentConversation.addEventListener(
        "click",
        () => {

            input.focus();

        }
    );


    function newChat() {

        conversation = [];

        selectedFiles = [];

        chatMessages.innerHTML =
            "";

        welcomeScreen.style.display =
            "flex";

        input.value =
            "";

        autoResize();

        renderAttachments();

        toolsPopup.classList.remove(
            "show"
        );

        input.focus();

        closeMobileSidebar();

    }


    /* =================================================
       RECENT CHAT
    ================================================= */

    function saveRecentChat(
        message
    ) {

        if (!message) return;


        const item =
            document.createElement(
                "button"
            );


        item.type =
            "button";


        item.className =
            "conversation";


        item.innerHTML = `

            <span class="conversation-icon">
                ◇
            </span>

            <span>
                ${escapeHTML(
                    message.substring(
                        0,
                        24
                    )
                )}
            </span>

        `;


        item.addEventListener(
            "click",
            () => {

                input.value =
                    message;

                autoResize();

                input.focus();

            }
        );


        recentChats.prepend(
            item
        );


        /*
         * Keep only 5 recent chats
         */

        while (
            recentChats.children.length > 5
        ) {

            recentChats.lastElementChild.remove();

        }

    }


    /* =================================================
       VOICE
    ================================================= */

    if (
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window
    ) {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        recognition =
            new SpeechRecognition();


        recognition.continuous =
            false;

        recognition.interimResults =
            true;

        recognition.lang =
            "en-US";


        recognition.onstart =
            () => {

                micBtn.classList.add(
                    "active"
                );

                input.placeholder =
                    "Listening...";

            };


        recognition.onresult =
            event => {

                let transcript =
                    "";


                for (
                    let i =
                        event.resultIndex;

                    i <
                    event.results.length;

                    i++
                ) {

                    transcript +=
                        event.results[i][0]
                            .transcript;

                }


                input.value =
                    transcript;


                autoResize();

            };


        recognition.onend =
            () => {

                micBtn.classList.remove(
                    "active"
                );

                input.placeholder =
                    webMode
                        ? "Search the web with Mini AI..."
                        : "Message Mini AI...";

            };


        recognition.onerror =
            error => {

                console.error(
                    "Voice error:",
                    error
                );

                micBtn.classList.remove(
                    "active"
                );

            };

    }


    micBtn.addEventListener(
        "click",
        () => {

            if (!recognition) {

                alert(
                    "Voice input is not supported in this browser."
                );

                return;
            }


            if (
                micBtn.classList.contains(
                    "active"
                )
            ) {

                recognition.stop();

            } else {

                recognition.start();

            }

        }
    );


    /* =================================================
       EXPAND COMPOSER
    ================================================= */

    composerExpand.addEventListener(
        "click",
        () => {

            input.focus();

            input.style.height =
                "180px";

        }
    );


    /* =================================================
       MOBILE SIDEBAR
    ================================================= */

    mobileMenuBtn.addEventListener(
        "click",
        openMobileSidebar
    );


    mobileOverlay.addEventListener(
        "click",
        closeMobileSidebar
    );


    function openMobileSidebar() {

        sidebar.classList.add(
            "open"
        );

        mobileOverlay.classList.add(
            "show"
        );

    }


    function closeMobileSidebar() {

        sidebar.classList.remove(
            "open"
        );

        mobileOverlay.classList.remove(
            "show"
        );

    }


    /* =================================================
       CLEAR CHAT
    ================================================= */

    clearBtn.addEventListener(
        "click",
        () => {

            if (
                conversation.length === 0
            ) {

                return;
            }


            const confirmed =
                confirm(
                    "Clear this conversation?"
                );


            if (confirmed) {

                newChat();

            }

        }
    );


    /* =================================================
       SEARCH
    ================================================= */

    searchBtn.addEventListener(
        "click",
        () => {

            input.focus();

            input.placeholder =
                "Search your conversation...";

        }
    );


    /* =================================================
       SETTINGS
    ================================================= */

    settingsBtn.addEventListener(
        "click",
        () => {

            alert(
                "Settings panel coming soon."
            );

        }
    );


    topSettingsBtn.addEventListener(
        "click",
        () => {

            alert(
                "Settings panel coming soon."
            );

        }
    );


    /* =================================================
       PRO
    ================================================= */

    proBtn.addEventListener(
        "click",
        () => {

            alert(
                "Pro features coming soon."
            );

        }
    );


    /* =================================================
       KEYBOARD SHORTCUTS
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            /*
             * Ctrl + K
             */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                input.focus();

            }


            /*
             * Escape
             */

            if (
                event.key === "Escape"
            ) {

                toolsPopup.classList.remove(
                    "show"
                );

                closeMobileSidebar();

            }

        }
    );


    /* =================================================
       HELPER
    ================================================= */

    function sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );

    }

});

/* =========================================
   PREMIUM AI CURSOR
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const cursor = document.querySelector(".ai-cursor");

    if (!cursor) return;

    const core = cursor.querySelector(".cursor-core");

    const trails = document.querySelectorAll(".cursor-trail");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let cursorX = mouseX;
    let cursorY = mouseY;

    const trailPositions = [];

    trails.forEach(() => {
        trailPositions.push({
            x: mouseX,
            y: mouseY
        });
    });


    /* ================================
       MOUSE POSITION
    ================================= */

    document.addEventListener("mousemove", (e) => {

        mouseX = e.clientX;
        mouseY = e.clientY;

    });


    /* ================================
       SMOOTH CURSOR
    ================================= */

    function animateCursor() {

        cursorX += (mouseX - cursorX) * 0.18;
        cursorY += (mouseY - cursorY) * 0.18;

        cursor.style.left = cursorX + "px";
        cursor.style.top = cursorY + "px";


        /* ================================
           TRAIL
        ================================= */

        let previousX = cursorX;
        let previousY = cursorY;

        trails.forEach((trail, index) => {

            const position = trailPositions[index];

            position.x +=
                (previousX - position.x) *
                (0.22 - index * 0.02);

            position.y +=
                (previousY - position.y) *
                (0.22 - index * 0.02);

            trail.style.left = position.x + "px";
            trail.style.top = position.y + "px";

            const scale =
                1 - (index * 0.12);

            const opacity =
                0.65 - (index * 0.09);

            trail.style.transform =
                `translate(-50%, -50%) scale(${scale})`;

            trail.style.opacity = opacity;

            previousX = position.x;
            previousY = position.y;

        });


        requestAnimationFrame(animateCursor);
    }


    animateCursor();


    /* ================================
       HOVER DETECTION
    ================================= */

    const interactiveElements = document.querySelectorAll(
        "a, button, input, textarea, select, .feature-card, .mani-ai-logo, .new-chat, [role='button']"
    );


    interactiveElements.forEach((element) => {

        element.addEventListener("mouseenter", () => {

            document.body.classList.add("cursor-hover");

        });


        element.addEventListener("mouseleave", () => {

            document.body.classList.remove("cursor-hover");

        });

    });


    /* ================================
       CLICK ANIMATION
    ================================= */

    document.addEventListener("mousedown", () => {

        document.body.classList.add("cursor-click");

    });


    document.addEventListener("mouseup", () => {

        document.body.classList.remove("cursor-click");

    });


    /* ================================
       HIDE WHEN MOUSE LEAVES
    ================================= */

    document.addEventListener("mouseleave", () => {

        cursor.style.opacity = "0";

        trails.forEach((trail) => {
            trail.style.opacity = "0";
        });

    });


    document.addEventListener("mouseenter", () => {

        cursor.style.opacity = "1";

    });

});
/* =========================================
   PREMIUM AI CURSOR
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const cursor = document.querySelector(".ai-cursor");

    if (!cursor) return;

    const core = cursor.querySelector(".cursor-core");

    const trails = document.querySelectorAll(".cursor-trail");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let cursorX = mouseX;
    let cursorY = mouseY;

    const trailPositions = [];

    trails.forEach(() => {
        trailPositions.push({
            x: mouseX,
            y: mouseY
        });
    });


    /* ================================
       MOUSE POSITION
    ================================= */

    document.addEventListener("mousemove", (e) => {

        mouseX = e.clientX;
        mouseY = e.clientY;

    });


    /* ================================
       SMOOTH CURSOR
    ================================= */

    function animateCursor() {

        cursorX += (mouseX - cursorX) * 0.18;
        cursorY += (mouseY - cursorY) * 0.18;

        cursor.style.left = cursorX + "px";
        cursor.style.top = cursorY + "px";


        /* ================================
           TRAIL
        ================================= */

        let previousX = cursorX;
        let previousY = cursorY;

        trails.forEach((trail, index) => {

            const position = trailPositions[index];

            position.x +=
                (previousX - position.x) *
                (0.22 - index * 0.02);

            position.y +=
                (previousY - position.y) *
                (0.22 - index * 0.02);

            trail.style.left = position.x + "px";
            trail.style.top = position.y + "px";

            const scale =
                1 - (index * 0.12);

            const opacity =
                0.65 - (index * 0.09);

            trail.style.transform =
                `translate(-50%, -50%) scale(${scale})`;

            trail.style.opacity = opacity;

            previousX = position.x;
            previousY = position.y;

        });


        requestAnimationFrame(animateCursor);
    }


    animateCursor();


    /* ================================
       HOVER DETECTION
    ================================= */

    const interactiveElements = document.querySelectorAll(
        "a, button, input, textarea, select, .feature-card, .mani-ai-logo, .new-chat, [role='button']"
    );


    interactiveElements.forEach((element) => {

        element.addEventListener("mouseenter", () => {

            document.body.classList.add("cursor-hover");

        });


        element.addEventListener("mouseleave", () => {

            document.body.classList.remove("cursor-hover");

        });

    });


    /* ================================
       CLICK ANIMATION
    ================================= */

    document.addEventListener("mousedown", () => {

        document.body.classList.add("cursor-click");

    });


    document.addEventListener("mouseup", () => {

        document.body.classList.remove("cursor-click");

    });


    /* ================================
       HIDE WHEN MOUSE LEAVES
    ================================= */

    document.addEventListener("mouseleave", () => {

        cursor.style.opacity = "0";

        trails.forEach((trail) => {
            trail.style.opacity = "0";
        });

    });


    document.addEventListener("mouseenter", () => {

        cursor.style.opacity = "1";

    });

});
