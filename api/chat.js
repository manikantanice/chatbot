document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

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


    /* =====================================================
       STATE
    ===================================================== */

    let conversation = [];

    let selectedFiles = [];

    let webMode = false;

    let sending = false;

    let recognition = null;


    /* =====================================================
       INIT
    ===================================================== */

    if (input) {

        input.focus();

        autoResize();
    }


    /* =====================================================
       TEXTAREA RESIZE
    ===================================================== */

    function autoResize() {

        if (!input) return;

        input.style.height = "auto";

        input.style.height =
            Math.min(input.scrollHeight, 200) + "px";
    }


    if (input) {

        input.addEventListener(
            "input",
            autoResize
        );
    }


    /* =====================================================
       ENTER TO SEND
    ===================================================== */

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


    /* =====================================================
       SEND BUTTON
    ===================================================== */

    if (sendBtn) {

        sendBtn.addEventListener(
            "click",
            sendMessage
        );
    }


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    async function sendMessage() {

        if (sending) return;


        const message =
            input?.value.trim() || "";


        /* No message */

        if (
            !message &&
            selectedFiles.length === 0
        ) {

            input?.focus();

            return;
        }


        /* Hide welcome */

        if (welcomeScreen) {

            welcomeScreen.style.display =
                "none";
        }


        /* Add user message */

        addMessage(
            "user",
            message || "Attached file(s)"
        );


        /* Add to conversation */

        conversation.push({

            role: "user",

            content: message

        });


        /* Clear input */

        if (input) {

            input.value = "";

            autoResize();
        }


        /* Close tools */

        if (toolsPopup) {

            toolsPopup.classList.remove(
                "show"
            );
        }


        /* Loading */

        setLoading(true);


        try {

            /* =================================================
               API REQUEST
            ================================================= */

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

                                message:
                                    message,

                                messages:
                                    conversation,

                                webSearch:
                                    webMode,

                                files:
                                    selectedFiles.map(
                                        file => ({

                                            name:
                                                file.name,

                                            type:
                                                file.type,

                                            size:
                                                file.size

                                        })
                                    )

                            })

                    }
                );


            /* =================================================
               HANDLE API ERROR
            ================================================= */

            if (!response.ok) {

                let errorMessage =
                    `Server returned an invalid response (${response.status}).`;


                try {

                    const errorData =
                        await response.json();


                    if (
                        errorData &&
                        errorData.error
                    ) {

                        errorMessage =
                            errorData.error;
                    }

                } catch (parseError) {

                    console.error(
                        "Error parsing API error:",
                        parseError
                    );
                }


                throw new Error(
                    errorMessage
                );
            }


            /* =================================================
               PARSE RESPONSE
            ================================================= */

            const data =
                await response.json();


            console.log(
                "API Response:",
                data
            );


            /* =================================================
               IMAGE RESPONSE
            ================================================= */

            if (
                data &&
                data.type === "image" &&
                data.image
            ) {

                await showGeneratedImage(

                    data.image,

                    data.reply ||
                    "✨ Here is the image I created for you."

                );


                conversation.push({

                    role: "assistant",

                    content:
                        data.reply ||
                        "Generated image."

                });


                saveRecentChat(
                    message
                );


                return;
            }


            /* =================================================
               API RETURNED ERROR
            ================================================= */

            if (
                data &&
                data.error
            ) {

                throw new Error(
                    data.error
                );
            }


            /* =================================================
               NORMAL TEXT RESPONSE
            ================================================= */

            const reply =
                getReplyFromResponse(
                    data
                );


            if (!reply) {

                throw new Error(
                    "No response received from AI."
                );
            }


            /* Type AI message */

            await typeAIMessage(
                reply
            );


            /* Save conversation */

            conversation.push({

                role: "assistant",

                content: reply

            });


            /* Save recent */

            saveRecentChat(
                message
            );


        } catch (error) {

            console.error(
                "Chat API Error:",
                error
            );


            /* =================================================
               SHOW ACTUAL ERROR
            ================================================= */

            addMessage(

                "ai",

                `⚠️ ${error.message || "Something went wrong."}`

            );


        } finally {

            setLoading(false);


            /* Clear files */

            selectedFiles = [];


            if (fileInput) {

                fileInput.value = "";
            }


            renderAttachments();
        }
    }


    /* =====================================================
       SHOW GENERATED IMAGE
    ===================================================== */

    async function showGeneratedImage(
        imageUrl,
        message
    ) {

        return new Promise(
            resolve => {

                const wrapper =
                    document.createElement(
                        "div"
                    );


                wrapper.className =
                    "chat-message ai image-message";


                const bubble =
                    document.createElement(
                        "div"
                    );


                bubble.className =
                    "chat-bubble ai-image-bubble";


                const text =
                    document.createElement(
                        "div"
                    );


                text.className =
                    "image-response-text";


                text.textContent =
                    message;


                const loading =
                    document.createElement(
                        "div"
                    );


                loading.className =
                    "image-loading";


                loading.innerHTML = `

                    <div class="image-loader">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                    <small>
                        Creating your image...
                    </small>

                `;


                bubble.appendChild(
                    text
                );


                bubble.appendChild(
                    loading
                );


                wrapper.appendChild(
                    bubble
                );


                if (chatMessages) {

                    chatMessages.appendChild(
                        wrapper
                    );
                }


                scrollChat();


                /* =================================================
                   PRELOAD IMAGE
                ================================================= */

                const image =
                    new Image();


                image.onload =
                    () => {

                        loading.remove();


                        const imageContainer =
                            document.createElement(
                                "div"
                            );


                        imageContainer.className =
                            "generated-image-container";


                        imageContainer.innerHTML = `

                            <img
                                src="${escapeAttribute(imageUrl)}"
                                alt="AI generated image"
                                class="generated-ai-image"
                            />

                            <div class="image-actions">

                                <button
                                    type="button"
                                    class="image-action-btn download-image"
                                >
                                    ↓ Save Image
                                </button>

                                <button
                                    type="button"
                                    class="image-action-btn copy-image"
                                >
                                    ⧉ Copy Image URL
                                </button>

                            </div>

                        `;


                        bubble.appendChild(
                            imageContainer
                        );


                        /* =================================================
                           DOWNLOAD IMAGE
                        ================================================= */

                        const downloadBtn =
                            imageContainer.querySelector(
                                ".download-image"
                            );


                        if (downloadBtn) {

                            downloadBtn.addEventListener(
                                "click",
                                async () => {

                                    try {

                                        /*
                                         * For data URLs
                                         * direct download works.
                                         */

                                        const link =
                                            document.createElement(
                                                "a"
                                            );


                                        link.href =
                                            imageUrl;


                                        link.download =
                                            "mini-ai-generated-image.png";


                                        document.body.appendChild(
                                            link
                                        );


                                        link.click();


                                        link.remove();


                                    } catch (error) {

                                        console.error(
                                            "Download error:",
                                            error
                                        );


                                        /*
                                         * Fallback
                                         */

                                        window.open(
                                            imageUrl,
                                            "_blank"
                                        );

                                    }

                                }
                            );
                        }


                        /* =================================================
                           COPY IMAGE URL
                        ================================================= */

                        const copyBtn =
                            imageContainer.querySelector(
                                ".copy-image"
                            );


                        if (copyBtn) {

                            copyBtn.addEventListener(
                                "click",
                                async () => {

                                    try {

                                        await navigator.clipboard.writeText(
                                            imageUrl
                                        );


                                        const oldText =
                                            copyBtn.textContent;


                                        copyBtn.textContent =
                                            "✓ Copied";


                                        setTimeout(
                                            () => {

                                                copyBtn.textContent =
                                                    oldText;

                                            },
                                            1500
                                        );


                                    } catch (error) {

                                        console.error(
                                            "Copy error:",
                                            error
                                        );


                                        copyBtn.textContent =
                                            "Copy failed";


                                        setTimeout(
                                            () => {

                                                copyBtn.textContent =
                                                    "⧉ Copy Image URL";

                                            },
                                            1500
                                        );

                                    }

                                }
                            );
                        }


                        scrollChat();


                        resolve();

                    };


                /* =================================================
                   IMAGE ERROR
                ================================================= */

                image.onerror =
                    error => {

                        console.error(
                            "Image loading error:",
                            error
                        );


                        loading.innerHTML = `

                            <div class="image-error">

                                ⚠️ Image could not be loaded.

                            </div>

                        `;


                        scrollChat();


                        resolve();

                    };


                image.src =
                    imageUrl;


                /* =================================================
                   TIMEOUT
                ================================================= */

                setTimeout(
                    () => {

                        if (
                            !image.complete
                        ) {

                            loading.innerHTML = `

                                <div class="image-error">

                                    ⚠️ Image generation is taking too long.

                                </div>

                            `;


                            scrollChat();


                            resolve();
                        }

                    },
                    30000
                );

            }
        );
    }


    /* =====================================================
       API RESPONSE
    ===================================================== */

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


    /* =====================================================
       ADD MESSAGE
    ===================================================== */

    function addMessage(
        type,
        text
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


        bubble.innerHTML =
            formatMessage(
                text
            );


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        scrollChat();


        return bubble;
    }


    /* =====================================================
       AI TYPEWRITER
    ===================================================== */

    async function typeAIMessage(
        text
    ) {

        if (!chatMessages) return;


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
            stripHTML(
                text
            );


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
                    : 8
            );
        }


        bubble.innerHTML =
            formatMessage(
                text
            );


        scrollChat();
    }


    /* =====================================================
       FORMAT MESSAGE
    ===================================================== */

    function formatMessage(
        text
    ) {

        if (!text) return "";


        let safe =
            escapeHTML(
                String(text)
            );


        /* Code blocks */

        safe =
            safe.replace(
                /```([\s\S]*?)```/g,
                "<pre><code>$1</code></pre>"
            );


        /* Bold */

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /* Inline code */

        safe =
            safe.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );


        /* Links */

        safe =
            safe.replace(
                /(https?:\/\/[^\s<]+)/g,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );


        /* New lines */

        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );


        return safe;
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

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


    /* =====================================================
       ESCAPE ATTRIBUTE
    ===================================================== */

    function escapeAttribute(
        text
    ) {

        return String(text)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            );
    }


    /* =====================================================
       STRIP HTML
    ===================================================== */

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


    /* =====================================================
       SCROLL CHAT
    ===================================================== */

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


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(
        state
    ) {

        sending =
            state;


        if (sendBtn) {

            sendBtn.classList.toggle(
                "loading",
                state
            );
        }


        if (input) {

            input.disabled =
                state;
        }


        if (sendBtn) {

            sendBtn.disabled =
                state;
        }
    }


    /* =====================================================
       PLUS BUTTON
    ===================================================== */

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
                    )

                    &&

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


    /* =====================================================
       WEB MODE
    ===================================================== */

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


                if (input) {

                    input.placeholder =
                        webMode

                            ? "Search the web with Mini AI..."

                            : "Message Mini AI...";

                    input.focus();
                }

            }
        );
    }


    /* =====================================================
       FILE ATTACH
    ===================================================== */

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
            () => {

                const files =
                    Array.from(
                        fileInput.files || []
                    );


                selectedFiles.push(
                    ...files
                );


                renderAttachments();

            }
        );
    }


    /* =====================================================
       FILE PREVIEW
    ===================================================== */

    function renderAttachments() {

        if (!attachmentPreview)
            return;


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

                    <span>
                        📎
                    </span>

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


    /* =====================================================
       MAGIC AI
    ===================================================== */

    if (magicBtn) {

        magicBtn.addEventListener(
            "click",
            () => {

                if (!input) return;


                input.focus();


                input.value =
                    "Help me with ";


                autoResize();

            }
        );
    }


    /* =====================================================
       TOOL OPTIONS
    ===================================================== */

    document
        .querySelectorAll(
            ".tool-option"
        )
        .forEach(
            option => {

                option.addEventListener(
                    "click",
                    () => {

                        if (!input) return;


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


                        toolsPopup?.classList.remove(
                            "show"
                        );

                    }
                );
            }
        );


    /* =====================================================
       QUICK CARDS
    ===================================================== */

    quickCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const prompt =
                        card.dataset.prompt;


                    if (!input) return;


                    input.value =
                        prompt || "";


                    autoResize();


                    input.focus();

                }
            );
        }
    );


    /* =====================================================
       NEW CHAT
    ===================================================== */

    if (newChatBtn) {

        newChatBtn.addEventListener(
            "click",
            newChat
        );
    }


    function newChat() {

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

            input.disabled =
                false;

            autoResize();

            input.focus();
        }


        if (sendBtn) {

            sendBtn.disabled =
                false;
        }


        setLoading(false);


        renderAttachments();


        toolsPopup?.classList.remove(
            "show"
        );


        closeMobileSidebar();
    }


    /* =====================================================
       RECENT CHAT
    ===================================================== */

    function saveRecentChat(
        message
    ) {

        if (
            !message ||
            !recentChats
        ) return;


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

                if (!input) return;


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
            recentChats.children.length >
            5
        ) {

            recentChats.lastElementChild.remove();
        }
    }


    /* =====================================================
       VOICE RECOGNITION
    ===================================================== */

    if (

        "SpeechRecognition" in window

        ||

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


    /* =====================================================
       MIC BUTTON
    ===================================================== */

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

                    try {

                        recognition.start();

                    } catch (error) {

                        console.error(
                            "Recognition start error:",
                            error
                        );

                    }

                }

            }
        );
    }


    /* =====================================================
       EXPAND COMPOSER
    ===================================================== */

    if (composerExpand) {

        composerExpand.addEventListener(
            "click",
            () => {

                input?.focus();


                if (input) {

                    input.style.height =
                        "180px";

                }

            }
        );
    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

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


    /* =====================================================
       CLEAR CHAT
    ===================================================== */

    if (clearBtn) {

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
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            () => {

                input?.focus();


                if (input) {

                    input.placeholder =
                        "Search your conversation...";

                }

            }
        );
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    settingsBtn?.addEventListener(
        "click",
        () => {

            alert(
                "Settings panel coming soon."
            );

        }
    );


    topSettingsBtn?.addEventListener(
        "click",
        () => {

            alert(
                "Settings panel coming soon."
            );

        }
    );


    /* =====================================================
       PRO
    ===================================================== */

    proBtn?.addEventListener(
        "click",
        () => {

            alert(
                "Pro features coming soon."
            );

        }
    );


    /* =====================================================
       KEYBOARD SHORTCUTS
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (

                event.ctrlKey &&

                event.key.toLowerCase() === "k"

            ) {

                event.preventDefault();


                input?.focus();

            }


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


    /* =====================================================
       HELPER
    ===================================================== */

    function sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }


    /* =====================================================
       PREMIUM AI CURSOR
    ===================================================== */

    let aiCursor =
        document.querySelector(
            ".ai-cursor"
        );


    if (!aiCursor) {

        aiCursor =
            document.createElement(
                "div"
            );


        aiCursor.className =
            "ai-cursor";


        aiCursor.innerHTML = `

            <div class="cursor-glow"></div>

            <div class="cursor-ring"></div>

            <div class="cursor-core"></div>

        `;


        document.body.appendChild(
            aiCursor
        );
    }


    /* =====================================================
       CURSOR POSITION
    ===================================================== */

    let cursorMouseX =
        window.innerWidth / 2;


    let cursorMouseY =
        window.innerHeight / 2;


    let cursorX =
        cursorMouseX;


    let cursorY =
        cursorMouseY;


    document.addEventListener(
        "mousemove",
        event => {

            cursorMouseX =
                event.clientX;


            cursorMouseY =
                event.clientY;

        }
    );


    /* =====================================================
       SMOOTH CURSOR
    ===================================================== */

    function animateAICursor() {

        cursorX +=
            (
                cursorMouseX -
                cursorX
            ) * 0.18;


        cursorY +=
            (
                cursorMouseY -
                cursorY
            ) * 0.18;


        if (aiCursor) {

            aiCursor.style.left =
                cursorX + "px";


            aiCursor.style.top =
                cursorY + "px";
        }


        requestAnimationFrame(
            animateAICursor
        );
    }


    animateAICursor();


    /* =====================================================
       CURSOR HOVER
    ===================================================== */

    function addCursorHoverEvents() {

        const hoverElements =
            document.querySelectorAll(

                "a, button, input, textarea, select, .quick-card, .tool-option, .conversation"

            );


        hoverElements.forEach(
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
    }


    addCursorHoverEvents();


    /* =====================================================
       CURSOR CLICK
    ===================================================== */

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


    /* =====================================================
       CURSOR TRAIL
    ===================================================== */

    const trailCount =
        6;


    const cursorTrails =
        [];


    for (
        let i = 0;
        i < trailCount;
        i++
    ) {

        const trail =
            document.createElement(
                "div"
            );


        trail.className =
            "cursor-trail";


        trail.style.opacity =
            String(
                0.35 -
                i * 0.04
            );


        document.body.appendChild(
            trail
        );


        cursorTrails.push({

            element:
                trail,

            x:
                cursorX,

            y:
                cursorY

        });

    }


    /* =====================================================
       CURSOR TRAIL ANIMATION
    ===================================================== */

    function animateCursorTrail() {

        let previousX =
            cursorX;


        let previousY =
            cursorY;


        cursorTrails.forEach(
            (trail, index) => {

                trail.x +=

                    (
                        previousX -
                        trail.x
                    )

                    *

                    (
                        0.25 -
                        index * 0.02
                    );


                trail.y +=

                    (
                        previousY -
                        trail.y
                    )

                    *

                    (
                        0.25 -
                        index * 0.02
                    );


                trail.element.style.left =
                    trail.x + "px";


                trail.element.style.top =
                    trail.y + "px";


                previousX =
                    trail.x;


                previousY =
                    trail.y;

            }
        );


        requestAnimationFrame(
            animateCursorTrail
        );
    }


    animateCursorTrail();


    /* =====================================================
       MOBILE CURSOR DISABLE
    ===================================================== */

    function handleCursorDevice() {

        const isMobile =
            window.innerWidth <= 768;


        if (isMobile) {

            if (aiCursor) {

                aiCursor.style.display =
                    "none";
            }


            cursorTrails.forEach(
                trail => {

                    trail.element.style.display =
                        "none";

                }
            );

        } else {

            if (aiCursor) {

                aiCursor.style.display =
                    "block";
            }


            cursorTrails.forEach(
                trail => {

                    trail.element.style.display =
                        "block";

                }
            );

        }
    }


    handleCursorDevice();


    window.addEventListener(
        "resize",
        handleCursorDevice
    );

});
