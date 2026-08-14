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

    const settingsBtn =
        document.getElementById("settingsBtn");

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

    if (input) {

        input.focus();

        autoResize();

    }


    /* =================================================
       TEXTAREA AUTO RESIZE
    ================================================= */

    function autoResize() {

        if (!input) return;

        input.style.height = "auto";

        input.style.height =
            Math.min(
                input.scrollHeight,
                200
            ) + "px";

    }


    if (input) {

        input.addEventListener(
            "input",
            autoResize
        );

    }


    /* =================================================
       ENTER SEND
    ================================================= */

    if (input) {

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

    }


    /* =================================================
       SEND
    ================================================= */

    if (sendBtn) {

        sendBtn.addEventListener(
            "click",
            sendMessage
        );

    }


    async function sendMessage() {

        if (sending) return;

        const message =
            input.value.trim();


        if (
            !message &&
            selectedFiles.length === 0
        ) {

            input.focus();

            return;

        }


        /* Hide welcome */

        if (welcomeScreen) {

            welcomeScreen.style.display =
                "none";

        }


        /*
         * Save images before clearing.
         */

        const imagesToSend =
            selectedFiles.map(
                image => ({

                    name:
                        image.name,

                    type:
                        image.type,

                    data:
                        image.dataUrl

                })
            );


        /* Show user message */

        addMessage(
            "user",
            message ||
            "Please analyze this image.",
            selectedFiles
        );


        /* Conversation */

        conversation.push({

            role: "user",

            content: message

        });


        /* Clear input */

        input.value = "";

        autoResize();


        if (toolsPopup) {

            toolsPopup.classList.remove(
                "show"
            );

        }


        /* Loading */

        setLoading(true);


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

                        body: JSON.stringify({

                            message:
                                message,

                            messages:
                                conversation,

                            webSearch:
                                webMode,

                            /*
                             * IMPORTANT
                             *
                             * Actual images.
                             */

                            images:
                                imagesToSend

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


            const reply =
                getReplyFromResponse(
                    data
                );


            await typeAIMessage(
                reply
            );


            conversation.push({

                role:
                    "assistant",

                content:
                    reply

            });


            saveRecentChat(
                message
            );


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


            if (fileInput) {

                fileInput.value = "";

            }


            renderAttachments();

        }

    }


    /* =================================================
       API RESPONSE
    ================================================= */

    function getReplyFromResponse(data) {

        if (!data) {

            return "I didn't receive a response.";

        }


        if (
            typeof data === "string"
        ) {

            return data;

        }


        if (
            typeof data.reply === "string"
        ) {

            return data.reply;

        }


        if (
            typeof data.message === "string"
        ) {

            return data.message;

        }


        if (
            typeof data.response === "string"
        ) {

            return data.response;

        }


        if (
            typeof data.content === "string"
        ) {

            return data.content;

        }


        if (
            data.choices &&
            data.choices[0]
        ) {

            const choice =
                data.choices[0];


            if (
                choice.message &&
                typeof choice.message.content ===
                "string"
            ) {

                return choice.message.content;

            }


            if (
                typeof choice.text ===
                "string"
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
        text,
        images = []
    ) {

        if (!chatMessages) return;


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            `chat-message ${type}`;


        const bubble =
            document.createElement(
                "div"
            );


        bubble.className =
            "chat-bubble";


        /*
         * Show images inside
         * user message.
         */

        if (
            type === "user" &&
            images.length
        ) {

            const imageContainer =
                document.createElement(
                    "div"
                );


            imageContainer.className =
                "message-images";


            images.forEach(
                image => {

                    const img =
                        document.createElement(
                            "img"
                        );


                    img.src =
                        image.dataUrl;


                    img.alt =
                        image.name;


                    img.className =
                        "message-image";


                    imageContainer.appendChild(
                        img
                    );

                }
            );


            bubble.appendChild(
                imageContainer
            );

        }


        if (text) {

            const textElement =
                document.createElement(
                    "div"
                );


            textElement.innerHTML =
                formatMessage(
                    text
                );


            bubble.appendChild(
                textElement
            );

        }


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        scrollChat();

    }


    /* =================================================
       AI TYPEWRITER
    ================================================= */

    async function typeAIMessage(text) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "chat-message ai";


        const bubble =
            document.createElement(
                "div"
            );


        bubble.className =
            "chat-bubble";


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        const plain =
            stripHTML(text);


        let current = "";


        for (
            let i = 0;
            i < plain.length;
            i++
        ) {

            current +=
                plain[i];


            bubble.textContent =
                current;


            scrollChat();


            await sleep(
                plain[i] === " "
                    ? 5
                    : 9
            );

        }


        bubble.innerHTML =
            formatMessage(
                text
            );


        scrollChat();

    }


    /* =================================================
       FORMAT MESSAGE
    ================================================= */

    function formatMessage(text) {

        if (!text) return "";


        let safe =
            escapeHTML(
                String(text)
            );


        safe =
            safe.replace(
                /```([\s\S]*?)```/g,
                "<pre><code>$1</code></pre>"
            );


        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        safe =
            safe.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );


        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );


        return safe;

    }


    /* =================================================
       ESCAPE
    ================================================= */

    function escapeHTML(text) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            text;


        return div.innerHTML;

    }


    function stripHTML(text) {

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

        if (!chatArea) return;


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

    function setLoading(state) {

        sending =
            state;


        if (sendBtn) {

            sendBtn.classList.toggle(
                "loading",
                state
            );

        }

    }


    /* =================================================
       PLUS
    ================================================= */

    if (
        plusBtn &&
        toolsPopup
    ) {

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

    }


    /* =================================================
       WEB MODE
    ================================================= */

    if (webBtn) {

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

    }


    /* =================================================
       IMAGE UPLOAD
    ================================================= */

    if (
        attachBtn &&
        fileInput
    ) {

        attachBtn.addEventListener(
            "click",
            () => {

                fileInput.click();

            }
        );


        fileInput.addEventListener(
            "change",
            async () => {

                const files =
                    Array.from(
                        fileInput.files
                    );


                if (!files.length) {
                    return;
                }


                for (
                    const file of files
                ) {

                    /*
                     * Only images
                     */

                    if (
                        !file.type.startsWith(
                            "image/"
                        )
                    ) {

                        continue;

                    }


                    try {

                        const dataUrl =
                            await prepareImage(
                                file
                            );


                        selectedFiles.push({

                            file:
                                file,

                            name:
                                file.name,

                            type:
                                file.type,

                            size:
                                file.size,

                            dataUrl:
                                dataUrl

                        });

                    } catch (error) {

                        console.error(
                            "Image error:",
                            error
                        );

                    }

                }


                renderAttachments();


                /*
                 * Reset input so
                 * same image can
                 * be selected again.
                 */

                fileInput.value = "";

            }
        );

    }


    /* =================================================
       IMAGE PREPARE
    ================================================= */

    function prepareImage(file) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () => {

                        const img =
                            new Image();


                        img.onload =
                            () => {

                                const maxSize =
                                    1600;


                                let width =
                                    img.width;

                                let height =
                                    img.height;


                                /*
                                 * Resize large image
                                 */

                                if (
                                    width > maxSize ||
                                    height > maxSize
                                ) {

                                    if (
                                        width > height
                                    ) {

                                        height =
                                            Math.round(
                                                height *
                                                maxSize /
                                                width
                                            );

                                        width =
                                            maxSize;

                                    } else {

                                        width =
                                            Math.round(
                                                width *
                                                maxSize /
                                                height
                                            );

                                        height =
                                            maxSize;

                                    }

                                }


                                const canvas =
                                    document.createElement(
                                        "canvas"
                                    );


                                canvas.width =
                                    width;

                                canvas.height =
                                    height;


                                const ctx =
                                    canvas.getContext(
                                        "2d"
                                    );


                                ctx.drawImage(
                                    img,
                                    0,
                                    0,
                                    width,
                                    height
                                );


                                /*
                                 * Compress image
                                 */

                                const compressed =
                                    canvas.toDataURL(
                                        "image/jpeg",
                                        0.82
                                    );


                                resolve(
                                    compressed
                                );

                            };


                        img.onerror =
                            reject;


                        img.src =
                            reader.result;

                    };


                reader.onerror =
                    reject;


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* =================================================
       IMAGE PREVIEW
    ================================================= */

    function renderAttachments() {

        if (!attachmentPreview) {
            return;
        }


        attachmentPreview.innerHTML =
            "";


        selectedFiles.forEach(
            (image, index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "image-attachment";


                item.innerHTML = `

                    <div class="image-preview-box">

                        <img
                            src="${image.dataUrl}"
                            alt="${escapeHTML(image.name)}"
                        >

                        <button
                            type="button"
                            class="image-remove"
                            data-index="${index}"
                            title="Remove image"
                        >
                            ×
                        </button>

                    </div>

                    <div class="image-file-name">
                        ${escapeHTML(image.name)}
                    </div>

                `;


                attachmentPreview.appendChild(
                    item
                );

            }
        );


        document
            .querySelectorAll(
                ".image-remove"
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
       MAGIC
    ================================================= */

    if (magicBtn) {

        magicBtn.addEventListener(
            "click",
            () => {

                input.focus();

                input.value =
                    "Help me with ";

                autoResize();

            }
        );

    }


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

    if (newChatBtn) {

        newChatBtn.addEventListener(
            "click",
            newChat
        );

    }


    if (currentConversation) {

        currentConversation.addEventListener(
            "click",
            () => {

                input.focus();

            }
        );

    }


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

    function saveRecentChat(message) {

        if (
            !message ||
            !recentChats
        ) {

            return;

        }


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


    if (micBtn) {

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

    }


    /* =================================================
       EXPAND
    ================================================= */

    if (composerExpand) {

        composerExpand.addEventListener(
            "click",
            () => {

                input.focus();

                input.style.height =
                    "180px";

            }
        );

    }


    /* =================================================
       MOBILE SIDEBAR
    ================================================= */

    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            openMobileSidebar
        );

    }


    if (mobileOverlay) {

        mobileOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


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
       SETTINGS
    ================================================= */

    if (settingsBtn) {

        settingsBtn.addEventListener(
            "click",
            () => {

                alert(
                    "Settings panel coming soon."
                );

            }
        );

    }


    /* =================================================
       KEYBOARD
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                input.focus();

            }


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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const cursor =
            document.querySelector(
                ".ai-cursor"
            );


        if (!cursor) return;


        const trails =
            document.querySelectorAll(
                ".cursor-trail"
            );


        let mouseX =
            window.innerWidth / 2;


        let mouseY =
            window.innerHeight / 2;


        let cursorX =
            mouseX;


        let cursorY =
            mouseY;


        const trailPositions =
            [];


        trails.forEach(() => {

            trailPositions.push({

                x: mouseX,

                y: mouseY

            });

        });


        document.addEventListener(
            "mousemove",
            e => {

                mouseX =
                    e.clientX;

                mouseY =
                    e.clientY;

            }
        );


        function animateCursor() {

            cursorX +=
                (mouseX - cursorX) *
                0.18;


            cursorY +=
                (mouseY - cursorY) *
                0.18;


            cursor.style.left =
                cursorX + "px";


            cursor.style.top =
                cursorY + "px";


            let previousX =
                cursorX;


            let previousY =
                cursorY;


            trails.forEach(
                (trail, index) => {

                    const position =
                        trailPositions[index];


                    position.x +=
                        (
                            previousX -
                            position.x
                        ) *
                        (
                            0.22 -
                            index * 0.02
                        );


                    position.y +=
                        (
                            previousY -
                            position.y
                        ) *
                        (
                            0.22 -
                            index * 0.02
                        );


                    trail.style.left =
                        position.x + "px";


                    trail.style.top =
                        position.y + "px";


                    const scale =
                        1 -
                        index * 0.12;


                    const opacity =
                        0.65 -
                        index * 0.09;


                    trail.style.transform =
                        `translate(-50%, -50%) scale(${scale})`;


                    trail.style.opacity =
                        opacity;


                    previousX =
                        position.x;


                    previousY =
                        position.y;

                }
            );


            requestAnimationFrame(
                animateCursor
            );

        }


        animateCursor();


        const interactiveElements =
            document.querySelectorAll(
                "a, button, input, textarea, select, .feature-card, .mani-ai-logo, .new-chat, [role='button']"
            );


        interactiveElements.forEach(
            element => {

                element.addEventListener(
                    "mouseenter",
                    () => {

                        document.body.classList.add(
                            "cursor-hover"
                        );

                    }
                );


                element.addEventListener(
                    "mouseleave",
                    () => {

                        document.body.classList.remove(
                            "cursor-hover"
                        );

                    }
                );

            }
        );


        document.addEventListener(
            "mousedown",
            () => {

                document.body.classList.add(
                    "cursor-click"
                );

            }
        );


        document.addEventListener(
            "mouseup",
            () => {

                document.body.classList.remove(
                    "cursor-click"
                );

            }
        );


        document.addEventListener(
            "mouseleave",
            () => {

                cursor.style.opacity =
                    "0";


                trails.forEach(
                    trail => {

                        trail.style.opacity =
                            "0";

                    }
                );

            }
        );


        document.addEventListener(
            "mouseenter",
            () => {

                cursor.style.opacity =
                    "1";

            }
        );

    }
);
