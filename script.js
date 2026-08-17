document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       ELEMENTS
    ================================================= */

    const input = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    const chatArea = document.querySelector(".chat-area");
    const chatMessages = document.getElementById("chatMessages");
    const welcomeScreen = document.getElementById("welcomeScreen");

    const newChatBtn = document.getElementById("newChatBtn");
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

    input?.focus();
    autoResize();


    /* =================================================
       SAFE EVENT LISTENER
    ================================================= */

    function on(element, event, callback) {

        if (!element) return;

        element.addEventListener(event, callback);

    }


    /* =================================================
       TEXTAREA AUTO RESIZE
    ================================================= */

    function autoResize() {

        if (!input) return;

        input.style.height = "auto";

        input.style.height =
            Math.min(input.scrollHeight, 200) + "px";

    }


    on(input, "input", autoResize);


    /* =================================================
       ENTER TO SEND
    ================================================= */

    on(input, "keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    });


    /* =================================================
       SEND BUTTON
    ================================================= */

    on(sendBtn, "click", sendMessage);


    /* =================================================
       SEND MESSAGE
    ================================================= */

    async function sendMessage() {

        if (sending) return;

        const message =
            input?.value.trim() || "";


        /* =============================================
           EMPTY MESSAGE CHECK
        ============================================= */

        if (
            !message &&
            selectedFiles.length === 0
        ) {

            input?.focus();

            return;

        }


        /* =============================================
           HIDE WELCOME SCREEN
        ============================================= */

        if (welcomeScreen) {

            welcomeScreen.style.display = "none";

        }


        /* =============================================
           DISPLAY MESSAGE
        ============================================= */

        let displayMessage = message;


        if (selectedFiles.length > 0) {

            if (!message) {

                displayMessage =
                    selectedFiles.length === 1
                        ? "Please analyze this image."
                        : `Please analyze these ${selectedFiles.length} images.`;

            }

        }


        /* =============================================
           SHOW USER MESSAGE
        ============================================= */

        addMessage(
            "user",
            displayMessage
        );


        /* =============================================
           SAVE USER MESSAGE
        ============================================= */

        conversation.push({

            role: "user",

            content:
                message ||
                "Analyze the uploaded image."

        });


        /* =============================================
           COPY FILES
        ============================================= */

        const filesToSend =
            [...selectedFiles];


        /* =============================================
           CLEAR INPUT
        ============================================= */

        if (input) {

            input.value = "";

            autoResize();

        }


        toolsPopup?.classList.remove("show");


        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        try {

            /* =========================================
               CONVERT IMAGES TO BASE64
            ========================================= */

            const images =
                filesToSend.length > 0
                    ? await filesToBase64(filesToSend)
                    : [];


            /* =========================================
               API REQUEST
            ========================================= */

            const response =
                await fetch("/api/chat", {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        message: message,

                        messages: conversation,

                        webSearch: webMode,

                        images: images

                    })

                });


            /* =========================================
               HTTP ERROR
            ========================================= */

            if (!response.ok) {

                let errorData = null;

                try {

                    errorData =
                        await response.json();

                } catch (error) {

                    console.warn(
                        "Could not parse error response."
                    );

                }


                throw new Error(

                    errorData?.error ||
                    `API error ${response.status}`

                );

            }


            /* =========================================
               JSON RESPONSE
            ========================================= */

            const data =
                await response.json();


            /* =========================================
               API ERROR
            ========================================= */

            if (data?.type === "error") {

                throw new Error(

                    data.error ||
                    "AI request failed."

                );

            }


            /* =========================================
               GENERATED IMAGE
            ========================================= */

            if (
                data?.type === "image" &&
                data?.image
            ) {

                await showGeneratedImage(data);


                conversation.push({

                    role: "assistant",

                    content:
                        data.reply ||
                        "Image generated."

                });


                saveRecentChat(
                    message || "Generated image"
                );


                return;

            }


            /* =========================================
               NORMAL RESPONSE
            ========================================= */

            const reply =
                getReplyFromResponse(data);


            await typeAIMessage(reply);


            /* =========================================
               SAVE AI RESPONSE
            ========================================= */

            conversation.push({

                role: "assistant",

                content: reply

            });


            /* =========================================
               RECENT CHAT
            ========================================= */

            saveRecentChat(
                message ||
                "Image analysis"
            );


        } catch (error) {

            console.error(
                "Chat API Error:",
                error
            );


            addMessage(
                "ai",
                `⚠️ ${error.message || "I couldn't connect to the AI right now. Please try again."}`
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
       FILES TO BASE64
    ================================================= */

    function filesToBase64(files) {

        return Promise.all(

            files.map(file => {

                return new Promise(
                    (resolve, reject) => {

                        /* =================================
                           IMAGE TYPE CHECK
                        ================================= */

                        if (
                            !file.type ||
                            !file.type.startsWith("image/")
                        ) {

                            reject(

                                new Error(
                                    `${file.name} is not an image. Please upload JPG, PNG, WEBP or another image file.`
                                )

                            );

                            return;

                        }


                        /* =================================
                           FILE SIZE CHECK
                        ================================= */

                        const maxSize =
                            3.5 * 1024 * 1024;


                        if (file.size > maxSize) {

                            reject(

                                new Error(
                                    `${file.name} is too large. Please upload an image smaller than 3.5 MB.`
                                )

                            );

                            return;

                        }


                        /* =================================
                           FILE READER
                        ================================= */

                        const reader =
                            new FileReader();


                        reader.onload = () => {

                            resolve({

                                name:
                                    file.name,

                                type:
                                    file.type,

                                size:
                                    file.size,

                                data:
                                    reader.result

                            });

                        };


                        reader.onerror = () => {

                            reject(

                                new Error(
                                    `Could not read ${file.name}.`
                                )

                            );

                        };


                        reader.readAsDataURL(file);

                    }
                );

            })

        );

    }


    /* =================================================
       SHOW GENERATED IMAGE
    ================================================= */

    async function showGeneratedImage(data) {

        const wrapper =
            document.createElement("div");


        wrapper.className =
            "chat-message ai";


        const bubble =
            document.createElement("div");


        bubble.className =
            "chat-bubble";


        /* =============================================
           RESPONSE TEXT
        ============================================= */

        if (data.reply) {

            const text =
                document.createElement("div");


            text.innerHTML =
                formatMessage(data.reply);


            bubble.appendChild(text);

        }


        /* =============================================
           IMAGE
        ============================================= */

        const image =
            document.createElement("img");


        image.src =
            data.image;


        image.alt =
            "AI generated image";


        image.loading =
            "lazy";


        image.style.width =
            "100%";


        image.style.maxWidth =
            "100%";


        image.style.maxHeight =
            "600px";


        image.style.objectFit =
            "contain";


        image.style.display =
            "block";


        image.style.marginTop =
            "12px";


        image.style.borderRadius =
            "16px";


        image.style.cursor =
            "pointer";


        /* =============================================
           OPEN IMAGE
        ============================================= */

        image.addEventListener(
            "click",
            () => {

                window.open(
                    data.image,
                    "_blank"
                );

            }
        );


        bubble.appendChild(image);


        wrapper.appendChild(bubble);


        chatMessages?.appendChild(wrapper);


        scrollChat();

    }


    /* =================================================
       GET API RESPONSE
    ================================================= */

    function getReplyFromResponse(data) {

        if (!data) {

            return "I didn't receive a response.";

        }


        /* =============================================
           STRING RESPONSE
        ============================================= */

        if (typeof data === "string") {

            return data;

        }


        /* =============================================
           NORMAL API
        ============================================= */

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


        /* =============================================
           OPENAI STYLE RESPONSE
        ============================================= */

        if (
            Array.isArray(data.choices) &&
            data.choices.length > 0
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

    function addMessage(type, text) {

        if (!chatMessages) return null;


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


        wrapper.appendChild(bubble);


        chatMessages.appendChild(wrapper);


        scrollChat();


        return bubble;

    }


    /* =================================================
       AI TYPEWRITER
    ================================================= */

    async function typeAIMessage(text) {

        if (!chatMessages) return;


        const wrapper =
            document.createElement("div");


        wrapper.className =
            "chat-message ai";


        const bubble =
            document.createElement("div");


        bubble.className =
            "chat-bubble";


        wrapper.appendChild(bubble);


        chatMessages.appendChild(wrapper);


        /* =============================================
           REMOVE HTML FOR TYPING
        ============================================= */

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


            await sleep(
                plain[i] === " "
                    ? 4
                    : 8
            );

        }


        /* =============================================
           FINAL FORMATTED MESSAGE
        ============================================= */

        bubble.innerHTML =
            formatMessage(text);


        scrollChat();

    }


    /* =================================================
       FORMAT MESSAGE
    ================================================= */

    function formatMessage(text) {

        if (!text) return "";


        let safe =
            escapeHTML(String(text));


        /* =============================================
           CODE BLOCK
        ============================================= */

        safe =
            safe.replace(
                /```([\s\S]*?)```/g,
                "<pre><code>$1</code></pre>"
            );


        /* =============================================
           BOLD
        ============================================= */

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /* =============================================
           INLINE CODE
        ============================================= */

        safe =
            safe.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );


        /* =============================================
           NEW LINE
        ============================================= */

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

    function escapeHTML(text) {

        const div =
            document.createElement("div");


        div.textContent =
            text;


        return div.innerHTML;

    }


    /* =================================================
       STRIP HTML
    ================================================= */

    function stripHTML(text) {

        const div =
            document.createElement("div");


        div.innerHTML =
            text;


        return (
            div.textContent ||
            div.innerText ||
            ""
        );

    }


    /* =================================================
       SCROLL CHAT
    ================================================= */

    function scrollChat() {

        if (!chatArea) return;


        requestAnimationFrame(() => {

            chatArea.scrollTo({

                top:
                    chatArea.scrollHeight,

                behavior:
                    "smooth"

            });

        });

    }


    /* =================================================
       LOADING
    ================================================= */

    function setLoading(state) {

        sending = state;


        sendBtn?.classList.toggle(
            "loading",
            state
        );


        if (sendBtn) {

            sendBtn.disabled =
                state;

        }


        if (input) {

            input.disabled =
                state;

        }

    }


    /* =================================================
       PLUS BUTTON
    ================================================= */

    on(plusBtn, "click", event => {

        event.stopPropagation();


        toolsPopup?.classList.toggle(
            "show"
        );

    });


    /* =================================================
       CLOSE TOOLS POPUP
    ================================================= */

    document.addEventListener(
        "click",
        event => {

            if (!toolsPopup || !plusBtn) {
                return;
            }


            if (
                !toolsPopup.contains(event.target) &&
                !plusBtn.contains(event.target)
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

    on(webBtn, "click", () => {

        webMode =
            !webMode;


        webBtn.classList.toggle(
            "active",
            webMode
        );


        if (input) {

            input.placeholder =
                webMode
                    ? "Search the web with Mini AI..."
                    : "Message Mini AI...";

        }


        input?.focus();

    });


    /* =================================================
       ATTACH FILE
    ================================================= */

    on(attachBtn, "click", () => {

        fileInput?.click();

    });


    /* =================================================
       FILE SELECT
    ================================================= */

    on(fileInput, "change", () => {

        if (!fileInput.files) return;


        const files =
            Array.from(fileInput.files);


        if (files.length === 0) {
            return;
        }


        /* =============================================
           ONLY IMAGES
        ============================================= */

        const validFiles =
            files.filter(file =>
                file.type &&
                file.type.startsWith("image/")
            );


        if (
            validFiles.length !== files.length
        ) {

            alert(
                "Please upload image files only."
            );

        }


        /* =============================================
           ADD VALID FILES
        ============================================= */

        selectedFiles.push(
            ...validFiles
        );


        /* =============================================
           RENDER
        ============================================= */

        renderAttachments();


        /* =============================================
           RESET INPUT
        ============================================= */

        fileInput.value = "";

    });


    /* =================================================
       IMAGE ATTACHMENT PREVIEW
    ================================================= */

    function renderAttachments() {

        if (!attachmentPreview) {
            return;
        }


        attachmentPreview.innerHTML =
            "";


        selectedFiles.forEach(
            (file, index) => {

                const item =
                    document.createElement("div");


                item.className =
                    "attachment-item";


                /* =====================================
                   THUMBNAIL
                ===================================== */

                const thumbnail =
                    document.createElement("img");


                thumbnail.className =
                    "attachment-thumbnail";


                thumbnail.alt =
                    file.name;


                const objectURL =
                    URL.createObjectURL(file);


                thumbnail.src =
                    objectURL;


                thumbnail.onload = () => {

                    URL.revokeObjectURL(
                        objectURL
                    );

                };


                /* =====================================
                   FILE NAME
                ===================================== */

                const name =
                    document.createElement("span");


                name.className =
                    "attachment-name";


                name.textContent =
                    file.name;


                /* =====================================
                   REMOVE BUTTON
                ===================================== */

                const remove =
                    document.createElement("button");


                remove.type =
                    "button";


                remove.className =
                    "remove-file";


                remove.dataset.index =
                    index;


                remove.textContent =
                    "×";


                remove.setAttribute(
                    "aria-label",
                    `Remove ${file.name}`
                );


                remove.addEventListener(
                    "click",
                    () => {

                        selectedFiles.splice(
                            index,
                            1
                        );


                        renderAttachments();

                    }
                );


                /* =====================================
                   APPEND
                ===================================== */

                item.appendChild(
                    thumbnail
                );


                item.appendChild(
                    name
                );


                item.appendChild(
                    remove
                );


                attachmentPreview.appendChild(
                    item
                );

            }
        );

    }


    /* =================================================
       MAGIC AI
    ================================================= */

    on(magicBtn, "click", () => {

        if (!input) return;


        input.focus();


        input.value =
            "Help me with ";


        autoResize();

    });


    /* =================================================
       TOOL OPTIONS
    ================================================= */

    document
        .querySelectorAll(".tool-option")
        .forEach(option => {

            option.addEventListener(
                "click",
                () => {

                    const action =
                        option.dataset.action;


                    if (!input) return;


                    switch (action) {

                        case "image":

                            input.value =
                                "Create an image of ";

                            break;


                        case "code":

                            input.value =
                                "Write code for ";

                            break;


                        case "summarize":

                            input.value =
                                "Summarize this: ";

                            break;

                    }


                    autoResize();


                    input.focus();


                    toolsPopup?.classList.remove(
                        "show"
                    );

                }
            );

        });


    /* =================================================
       QUICK CARDS
    ================================================= */

    quickCards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const prompt =
                    card.dataset.prompt;


                if (!input || !prompt) {
                    return;
                }


                input.value =
                    prompt;


                autoResize();


                input.focus();

            }
        );

    });


    /* =================================================
       NEW CHAT
    ================================================= */

    on(newChatBtn, "click", newChat);


    on(currentConversation, "click", () => {

        input?.focus();

    });


    function newChat() {

        if (sending) return;


        conversation = [];


        selectedFiles = [];


        if (chatMessages) {

            chatMessages.innerHTML =
                "";

        }


        if (welcomeScreen) {

            welcomeScreen.style.display =
                "flex";

        }


        if (input) {

            input.value =
                "";

            autoResize();

        }


        renderAttachments();


        toolsPopup?.classList.remove(
            "show"
        );


        input?.focus();


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
            document.createElement("button");


        item.type =
            "button";


        item.className =
            "conversation";


        const safeMessage =
            escapeHTML(
                message.substring(0, 24)
            );


        item.innerHTML = `

            <span class="conversation-icon">
                ◇
            </span>

            <span>
                ${safeMessage}
            </span>

        `;


        item.addEventListener(
            "click",
            () => {

                if (!input) return;


                input.value =
                    message;


                autoResize();


                input.focus();

            }
        );


        recentChats.prepend(item);


        while (
            recentChats.children.length > 5
        ) {

            recentChats.lastElementChild.remove();

        }

    }


    /* =================================================
       VOICE RECOGNITION
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

                micBtn?.classList.add(
                    "active"
                );


                if (input) {

                    input.placeholder =
                        "Listening...";

                }

            };


        recognition.onresult =
            event => {

                let transcript =
                    "";


                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i++
                ) {

                    transcript +=
                        event.results[i][0]
                            .transcript;

                }


                if (input) {

                    input.value =
                        transcript;

                    autoResize();

                }

            };


        recognition.onend =
            () => {

                micBtn?.classList.remove(
                    "active"
                );


                if (input) {

                    input.placeholder =
                        webMode
                            ? "Search the web with Mini AI..."
                            : "Message Mini AI...";

                }

            };


        recognition.onerror =
            error => {

                console.error(
                    "Voice error:",
                    error
                );


                micBtn?.classList.remove(
                    "active"
                );

            };

    }


    /* =================================================
       MIC BUTTON
    ================================================= */

    on(micBtn, "click", () => {

        if (!recognition) {

            alert(
                "Voice input is not supported in this browser."
            );


            return;

        }


        if (
            micBtn.classList.contains("active")
        ) {

            recognition.stop();

        } else {

            try {

                recognition.start();

            } catch (error) {

                console.warn(
                    "Recognition already running."
                );

            }

        }

    });


    /* =================================================
       EXPAND COMPOSER
    ================================================= */

    on(composerExpand, "click", () => {

        input?.focus();


        if (input) {

            input.style.height =
                "180px";

        }

    });


    /* =================================================
       MOBILE SIDEBAR
    ================================================= */

    on(
        mobileMenuBtn,
        "click",
        openMobileSidebar
    );


    on(
        mobileOverlay,
        "click",
        closeMobileSidebar
    );


    function openMobileSidebar() {

        sidebar?.classList.add(
            "open"
        );


        mobileOverlay?.classList.add(
            "show"
        );

    }


    function closeMobileSidebar() {

        sidebar?.classList.remove(
            "open"
        );


        mobileOverlay?.classList.remove(
            "show"
        );

    }


    /* =================================================
       KEYBOARD SHORTCUTS
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            /* =========================================
               CTRL + K
            ========================================= */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                input?.focus();

            }


            /* =========================================
               ESCAPE
            ========================================= */

            if (
                event.key === "Escape"
            ) {

                toolsPopup?.classList.remove(
                    "show"
                );


                closeMobileSidebar();

            }

        }
    );


    /* =================================================
       SLEEP HELPER
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


/* =====================================================
   PREMIUM AI CURSOR
===================================================== */

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


        const trailPositions = [];


        trails.forEach(() => {

            trailPositions.push({

                x:
                    mouseX,

                y:
                    mouseY

            });

        });


        /* =============================================
           MOUSE POSITION
        ============================================= */

        document.addEventListener(
            "mousemove",
            event => {

                mouseX =
                    event.clientX;


                mouseY =
                    event.clientY;

            }
        );


        /* =============================================
           CURSOR ANIMATION
        ============================================= */

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


                    if (!position) return;


                    const speed =
                        Math.max(
                            0.08,
                            0.22 - index * 0.02
                        );


                    position.x +=
                        (previousX - position.x) *
                        speed;


                    position.y +=
                        (previousY - position.y) *
                        speed;


                    trail.style.left =
                        position.x + "px";


                    trail.style.top =
                        position.y + "px";


                    const scale =
                        Math.max(
                            0.25,
                            1 - index * 0.12
                        );


                    const opacity =
                        Math.max(
                            0,
                            0.65 - index * 0.09
                        );


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


        /* =============================================
           HOVER ELEMENTS
        ============================================= */

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


        /* =============================================
           CLICK EFFECT
        ============================================= */

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


        /* =============================================
           MOUSE LEAVE
        ============================================= */

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


        /* =============================================
           MOUSE ENTER
        ============================================= */

        document.addEventListener(
            "mouseenter",
            () => {

                cursor.style.opacity =
                    "1";

            }
        );

    }
);
