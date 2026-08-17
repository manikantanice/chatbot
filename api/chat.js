document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS
    ========================================================= */

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

    const quickCards =
        document.querySelectorAll(".quick-card");


    /* =========================================================
       STATE
    ========================================================= */

    let conversation = [];

    let selectedFiles = [];

    let webMode = false;

    let sending = false;

    let recognition = null;


    /* =========================================================
       SAFETY HELPERS
    ========================================================= */

    function exists(element) {
        return element !== null && element !== undefined;
    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    if (exists(input)) {

        input.focus();

        autoResize();

    }


    /* =========================================================
       TEXTAREA AUTO RESIZE
    ========================================================= */

    function autoResize() {

        if (!exists(input)) return;

        input.style.height = "auto";

        input.style.height =
            Math.min(input.scrollHeight, 200) + "px";

    }


    if (exists(input)) {

        input.addEventListener(
            "input",
            autoResize
        );

    }


    /* =========================================================
       ENTER SEND
    ========================================================= */

    if (exists(input)) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    event.stopPropagation();

                    sendMessage();

                }

            }
        );

    }


    /* =========================================================
       SEND BUTTON
    ========================================================= */

    if (exists(sendBtn)) {

        sendBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                sendMessage();

            }
        );

    }


    /* =========================================================
       SEND MESSAGE
    ========================================================= */

    async function sendMessage() {

        if (sending) return;


        const message =
            exists(input)
                ? input.value.trim()
                : "";


        /*
         * Allow:
         * 1. Text only
         * 2. Image only
         * 3. Text + image
         */

        if (
            !message &&
            selectedFiles.length === 0
        ) {

            if (exists(input)) {
                input.focus();
            }

            return;

        }


        /* =====================================================
           HIDE WELCOME
        ===================================================== */

        if (exists(welcomeScreen)) {

            welcomeScreen.style.display =
                "none";

        }


        /* =====================================================
           DISPLAY USER MESSAGE
        ===================================================== */

        let displayMessage =
            message;


        if (selectedFiles.length > 0) {

            if (!message) {

                displayMessage =
                    selectedFiles.length === 1
                        ? "Please analyze this image."
                        : `Please analyze these ${selectedFiles.length} images.`;

            }

        }


        addMessage(
            "user",
            displayMessage
        );


        /* =====================================================
           SAVE USER MESSAGE
        ===================================================== */

        conversation.push({

            role: "user",

            content:
                message ||
                "Please analyze the uploaded image."

        });


        /* =====================================================
           SAVE FILES
        ===================================================== */

        const filesToSend =
            [...selectedFiles];


        /* =====================================================
           CLEAR TEXT INPUT
        ===================================================== */

        if (exists(input)) {

            input.value = "";

            autoResize();

        }


        if (exists(toolsPopup)) {

            toolsPopup.classList.remove(
                "show"
            );

        }


        /* =====================================================
           LOADING
        ===================================================== */

        setLoading(true);


        try {

            /* =================================================
               CONVERT + COMPRESS IMAGES
            ================================================= */

            const images =
                await filesToBase64(
                    filesToSend
                );


            console.log(
                "================================="
            );

            console.log(
                "MINI AI REQUEST"
            );

            console.log(
                "Message:",
                message
            );

            console.log(
                "Images:",
                images.length
            );


            images.forEach(
                (image, index) => {

                    console.log(
                        `Image ${index + 1} size:`,
                        (
                            image.data.length /
                            1024 /
                            1024
                        ).toFixed(2),
                        "MB"
                    );

                }
            );


            console.log(
                "================================="
            );


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

                                images:
                                    images

                            })

                    }
                );


            /* =================================================
               READ RESPONSE
            ================================================= */

            let data = null;

            const responseText =
                await response.text();


            try {

                data =
                    responseText
                        ? JSON.parse(responseText)
                        : null;

            } catch (parseError) {

                console.error(
                    "Invalid API JSON:",
                    responseText
                );

                throw new Error(
                    `Server returned an invalid response (${response.status}).`
                );

            }


            /* =================================================
               HTTP ERROR
            ================================================= */

            if (!response.ok) {

                console.error(
                    "API ERROR:",
                    data
                );


                throw new Error(

                    data?.error ||

                    data?.message ||

                    `API error ${response.status}`

                );

            }


            /* =================================================
               API ERROR
            ================================================= */

            if (
                data?.type === "error"
            ) {

                throw new Error(
                    data.error ||
                    "AI request failed."
                );

            }


            /* =================================================
               GENERATED IMAGE
            ================================================= */

            if (
                data?.type === "image" &&
                data?.image
            ) {

                await showGeneratedImage(
                    data
                );


                conversation.push({

                    role: "assistant",

                    content:
                        data.reply ||
                        "Image generated."

                });


                saveRecentChat(
                    message ||
                    "Generated image"
                );


                return;

            }


            /* =================================================
               TEXT / IMAGE ANALYSIS RESPONSE
            ================================================= */

            const reply =
                getReplyFromResponse(
                    data
                );


            if (!reply) {

                throw new Error(
                    "No response was received from the AI."
                );

            }


            await typeAIMessage(
                reply
            );


            /* =================================================
               SAVE AI RESPONSE
            ================================================= */

            conversation.push({

                role: "assistant",

                content:
                    reply

            });


            /* =================================================
               RECENT CHAT
            ================================================= */

            saveRecentChat(
                message ||
                "Image analysis"
            );


        } catch (error) {

            console.error(
                "================================="
            );

            console.error(
                "MINI AI ERROR"
            );

            console.error(
                error
            );

            console.error(
                "================================="
            );


            addMessage(
                "ai",
                `⚠️ ${
                    error?.message ||
                    "I couldn't connect to the AI right now. Please try again."
                }`
            );


        } finally {

            setLoading(false);


            /*
             * Clear selected files only AFTER
             * request has completed.
             */

            selectedFiles = [];


            if (exists(fileInput)) {

                fileInput.value = "";

            }


            renderAttachments();

        }

    }


    /* =========================================================
       FILE -> COMPRESSED BASE64
       IMPORTANT FOR VERCEL REQUEST SIZE
    ========================================================= */

    function filesToBase64(files) {

        /*
         * Qwen vision:
         * Keep maximum 3 images.
         */

        const limitedFiles =
            files.slice(0, 3);


        return Promise.all(

            limitedFiles.map(
                file => {

                    return new Promise(
                        (resolve, reject) => {

                            /* =================================
                               IMAGE CHECK
                            ================================= */

                            if (
                                !file ||
                                !file.type ||
                                !file.type.startsWith(
                                    "image/"
                                )
                            ) {

                                reject(
                                    new Error(
                                        `${file?.name || "File"} is not an image. Please upload JPG, PNG or WEBP.`
                                    )
                                );

                                return;

                            }


                            /* =================================
                               ORIGINAL SIZE CHECK
                            ================================= */

                            const originalMaxSize =
                                15 *
                                1024 *
                                1024;


                            if (
                                file.size >
                                originalMaxSize
                            ) {

                                reject(
                                    new Error(
                                        `${file.name} is too large. Please select an image smaller than 15 MB.`
                                    )
                                );

                                return;

                            }


                            /* =================================
                               FILE READER
                            ================================= */

                            const reader =
                                new FileReader();


                            reader.onload =
                                () => {

                                    const img =
                                        new Image();


                                    img.onload =
                                        () => {

                                            /* =====================
                                               MAX DIMENSION
                                            ===================== */

                                            const MAX_WIDTH =
                                                1600;

                                            const MAX_HEIGHT =
                                                1600;


                                            let width =
                                                img.width;

                                            let height =
                                                img.height;


                                            if (
                                                width >
                                                MAX_WIDTH
                                            ) {

                                                height =
                                                    height *
                                                    (
                                                        MAX_WIDTH /
                                                        width
                                                    );

                                                width =
                                                    MAX_WIDTH;

                                            }


                                            if (
                                                height >
                                                MAX_HEIGHT
                                            ) {

                                                width =
                                                    width *
                                                    (
                                                        MAX_HEIGHT /
                                                        height
                                                    );

                                                height =
                                                    MAX_HEIGHT;

                                            }


                                            width =
                                                Math.round(
                                                    width
                                                );


                                            height =
                                                Math.round(
                                                    height
                                                );


                                            /* =====================
                                               CANVAS
                                            ===================== */

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


                                            if (!ctx) {

                                                reject(
                                                    new Error(
                                                        `Could not process ${file.name}.`
                                                    )
                                                );

                                                return;

                                            }


                                            /*
                                             * White background.
                                             * Useful when PNG has transparency.
                                             */

                                            ctx.fillStyle =
                                                "#ffffff";


                                            ctx.fillRect(
                                                0,
                                                0,
                                                width,
                                                height
                                            );


                                            ctx.drawImage(
                                                img,
                                                0,
                                                0,
                                                width,
                                                height
                                            );


                                            /* =====================
                                               COMPRESS IMAGE
                                            ===================== */

                                            let quality =
                                                0.78;


                                            let compressed =
                                                canvas.toDataURL(
                                                    "image/jpeg",
                                                    quality
                                                );


                                            /*
                                             * Keep reducing quality
                                             * if image is still large.
                                             */

                                            while (
                                                compressed.length >
                                                    3.2 *
                                                    1024 *
                                                    1024 &&
                                                quality > 0.45
                                            ) {

                                                quality -=
                                                    0.08;


                                                compressed =
                                                    canvas.toDataURL(
                                                        "image/jpeg",
                                                        quality
                                                    );

                                            }


                                            /* =====================
                                               FINAL SIZE
                                            ===================== */

                                            const base64Size =
                                                (
                                                    compressed.length *
                                                    0.75
                                                );


                                            const sizeMB =
                                                base64Size /
                                                1024 /
                                                1024;


                                            console.log(
                                                `Compressed ${file.name}: ${sizeMB.toFixed(2)} MB`
                                            );


                                            /*
                                             * Safety check.
                                             */

                                            if (
                                                compressed.length >
                                                4 *
                                                1024 *
                                                1024
                                            ) {

                                                reject(
                                                    new Error(
                                                        `${file.name} is still too large after compression. Please use a smaller image.`
                                                    )
                                                );

                                                return;

                                            }


                                            /* =====================
                                               RETURN IMAGE
                                            ===================== */

                                            resolve({

                                                name:
                                                    file.name,

                                                type:
                                                    "image/jpeg",

                                                size:
                                                    Math.round(
                                                        sizeMB *
                                                        1024 *
                                                        1024
                                                    ),

                                                data:
                                                    compressed

                                            });

                                        };


                                    img.onerror =
                                        () => {

                                            reject(
                                                new Error(
                                                    `Could not process ${file.name}.`
                                                )
                                            );

                                        };


                                    img.src =
                                        reader.result;

                                };


                            reader.onerror =
                                () => {

                                    reject(
                                        new Error(
                                            `Could not read ${file.name}.`
                                        )
                                    );

                                };


                            reader.readAsDataURL(
                                file
                            );

                        }
                    );

                }
            )

        );

    }


    /* =========================================================
       GENERATED IMAGE
    ========================================================= */

    async function showGeneratedImage(data) {

        if (!exists(chatMessages)) return;


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


        /* =====================================================
           TEXT
        ===================================================== */

        if (data.reply) {

            const text =
                document.createElement(
                    "div"
                );


            text.innerHTML =
                formatMessage(
                    data.reply
                );


            bubble.appendChild(
                text
            );

        }


        /* =====================================================
           IMAGE
        ===================================================== */

        const image =
            document.createElement(
                "img"
            );


        image.src =
            data.image;


        image.alt =
            "AI generated image";


        image.loading =
            "lazy";


        image.style.maxWidth =
            "100%";


        image.style.width =
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


        bubble.appendChild(
            image
        );


        wrapper.appendChild(
            bubble
        );


        chatMessages.appendChild(
            wrapper
        );


        scrollChat();

    }


    /* =========================================================
       GET API RESPONSE
    ========================================================= */

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


    /* =========================================================
       ADD MESSAGE
    ========================================================= */

    function addMessage(type, text) {

        if (!exists(chatMessages)) {
            return null;
        }


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


    /* =========================================================
       AI TYPEWRITER
    ========================================================= */

    async function typeAIMessage(text) {

        if (!exists(chatMessages)) return;


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
                    ? 4
                    : 7
            );

        }


        bubble.innerHTML =
            formatMessage(
                text
            );


        scrollChat();

    }


    /* =========================================================
       FORMAT MESSAGE
    ========================================================= */

    function formatMessage(text) {

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


    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    function escapeHTML(text) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            text;


        return div.innerHTML;

    }


    /* =========================================================
       STRIP HTML
    ========================================================= */

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


    /* =========================================================
       SCROLL
    ========================================================= */

    function scrollChat() {

        if (!exists(chatArea)) return;


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


    /* =========================================================
       LOADING
    ========================================================= */

    function setLoading(state) {

        sending =
            state;


        if (exists(sendBtn)) {

            sendBtn.classList.toggle(
                "loading",
                state
            );

            sendBtn.disabled =
                state;

        }

    }


    /* =========================================================
       PLUS BUTTON
    ========================================================= */

    if (
        exists(plusBtn) &&
        exists(toolsPopup)
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


    /* =========================================================
       WEB MODE
    ========================================================= */

    if (exists(webBtn)) {

        webBtn.addEventListener(
            "click",
            () => {

                webMode =
                    !webMode;


                webBtn.classList.toggle(
                    "active",
                    webMode
                );


                if (exists(input)) {

                    input.placeholder =
                        webMode
                            ? "Search the web with Mini AI..."
                            : "Message Mini AI...";

                    input.focus();

                }

            }
        );

    }


    /* =========================================================
       ATTACH BUTTON
    ========================================================= */

    if (
        exists(attachBtn) &&
        exists(fileInput)
    ) {

        attachBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                fileInput.click();

            }
        );


        /* =====================================================
           FILE SELECT
        ===================================================== */

        fileInput.addEventListener(
            "change",
            () => {

                const files =
                    Array.from(
                        fileInput.files || []
                    );


                if (
                    files.length === 0
                ) {

                    return;

                }


                /* =============================================
                   MAX 3 IMAGES
                ============================================= */

                const availableSlots =
                    3 -
                    selectedFiles.length;


                if (
                    availableSlots <= 0
                ) {

                    alert(
                        "You can upload up to 3 images at a time."
                    );

                    fileInput.value = "";

                    return;

                }


                /* =============================================
                   IMAGE ONLY
                ============================================= */

                const validFiles =
                    files
                        .filter(
                            file =>
                                file.type &&
                                file.type.startsWith(
                                    "image/"
                                )
                        )
                        .slice(
                            0,
                            availableSlots
                        );


                if (
                    validFiles.length !==
                    files.length
                ) {

                    alert(
                        "Only JPG, PNG, WEBP and other image files are supported. Maximum 3 images."
                    );

                }


                /* =============================================
                   ADD FILES
                ============================================= */

                selectedFiles.push(
                    ...validFiles
                );


                renderAttachments();


                /*
                 * Reset input so the same image
                 * can be selected again.
                 */

                fileInput.value = "";

            }
        );

    }


    /* =========================================================
       IMAGE PREVIEW
    ========================================================= */

    function renderAttachments() {

        if (!exists(attachmentPreview)) {
            return;
        }


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


                /* =============================================
                   IMAGE
                ============================================= */

                const thumbnail =
                    document.createElement(
                        "img"
                    );


                thumbnail.className =
                    "attachment-thumbnail";


                thumbnail.alt =
                    file.name;


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                thumbnail.src =
                    objectUrl;


                thumbnail.onload =
                    () => {

                        URL.revokeObjectURL(
                            objectUrl
                        );

                    };


                /* =============================================
                   FILE NAME
                ============================================= */

                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "attachment-name";


                name.textContent =
                    file.name;


                /* =============================================
                   REMOVE BUTTON
                ============================================= */

                const remove =
                    document.createElement(
                        "button"
                    );


                remove.type =
                    "button";


                remove.className =
                    "remove-file";


                remove.dataset.index =
                    index;


                remove.textContent =
                    "×";


                remove.title =
                    "Remove image";


                remove.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        selectedFiles.splice(
                            index,
                            1
                        );


                        renderAttachments();

                    }
                );


                /* =============================================
                   APPEND
                ============================================= */

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


    /* =========================================================
       MAGIC AI
    ========================================================= */

    if (exists(magicBtn)) {

        magicBtn.addEventListener(
            "click",
            () => {

                if (!exists(input)) return;


                input.focus();


                input.value =
                    "Help me with ";


                autoResize();

            }
        );

    }


    /* =========================================================
       TOOL OPTIONS
    ========================================================= */

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


                        if (!exists(input)) {
                            return;
                        }


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


                        if (exists(toolsPopup)) {

                            toolsPopup.classList.remove(
                                "show"
                            );

                        }

                    }
                );

            }
        );


    /* =========================================================
       QUICK CARDS
    ========================================================= */

    quickCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    if (!exists(input)) {
                        return;
                    }


                    const prompt =
                        card.dataset.prompt;


                    if (!prompt) return;


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

    if (exists(newChatBtn)) {

        newChatBtn.addEventListener(
            "click",
            newChat
        );

    }


    if (exists(currentConversation)) {

        currentConversation.addEventListener(
            "click",
            () => {

                if (exists(input)) {
                    input.focus();
                }

            }
        );

    }


    function newChat() {

        conversation = [];

        selectedFiles = [];


        if (exists(chatMessages)) {

            chatMessages.innerHTML =
                "";

        }


        if (exists(welcomeScreen)) {

            welcomeScreen.style.display =
                "flex";

        }


        if (exists(input)) {

            input.value = "";

            autoResize();

        }


        renderAttachments();


        if (exists(toolsPopup)) {

            toolsPopup.classList.remove(
                "show"
            );

        }


        if (exists(input)) {

            input.focus();

        }


        closeMobileSidebar();

    }


    /* =========================================================
       RECENT CHAT
    ========================================================= */

    function saveRecentChat(message) {

        if (
            !message ||
            !exists(recentChats)
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


        const shortMessage =
            message.substring(
                0,
                24
            );


        item.innerHTML = `

            <span class="conversation-icon">
                ◇
            </span>

            <span>
                ${escapeHTML(
                    shortMessage
                )}
            </span>

        `;


        item.addEventListener(
            "click",
            () => {

                if (!exists(input)) {
                    return;
                }


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


    /* =========================================================
       VOICE RECOGNITION
    ========================================================= */

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

                if (exists(micBtn)) {

                    micBtn.classList.add(
                        "active"
                    );

                }


                if (exists(input)) {

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


                if (exists(input)) {

                    input.value =
                        transcript;

                    autoResize();

                }

            };


        recognition.onend =
            () => {

                if (exists(micBtn)) {

                    micBtn.classList.remove(
                        "active"
                    );

                }


                if (exists(input)) {

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


                if (exists(micBtn)) {

                    micBtn.classList.remove(
                        "active"
                    );

                }

            };

    }


    /* =========================================================
       MIC BUTTON
    ========================================================= */

    if (exists(micBtn)) {

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
                            "Voice start error:",
                            error
                        );

                    }

                }

            }
        );

    }


    /* =========================================================
       EXPAND COMPOSER
    ========================================================= */

    if (exists(composerExpand)) {

        composerExpand.addEventListener(
            "click",
            () => {

                if (!exists(input)) return;


                input.focus();


                input.style.height =
                    "180px";

            }
        );

    }


    /* =========================================================
       MOBILE SIDEBAR
    ========================================================= */

    if (exists(mobileMenuBtn)) {

        mobileMenuBtn.addEventListener(
            "click",
            openMobileSidebar
        );

    }


    if (exists(mobileOverlay)) {

        mobileOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    function openMobileSidebar() {

        if (exists(sidebar)) {

            sidebar.classList.add(
                "open"
            );

        }


        if (exists(mobileOverlay)) {

            mobileOverlay.classList.add(
                "show"
            );

        }

    }


    function closeMobileSidebar() {

        if (exists(sidebar)) {

            sidebar.classList.remove(
                "open"
            );

        }


        if (exists(mobileOverlay)) {

            mobileOverlay.classList.remove(
                "show"
            );

        }

    }


    /* =========================================================
       KEYBOARD SHORTCUTS
    ========================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();


                if (exists(input)) {

                    input.focus();

                }

            }


            if (
                event.key === "Escape"
            ) {

                if (exists(toolsPopup)) {

                    toolsPopup.classList.remove(
                        "show"
                    );

                }


                closeMobileSidebar();

            }

        }
    );


    /* =========================================================
       HELPER
    ========================================================= */

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


/* =============================================================
   PREMIUM AI CURSOR
============================================================= */

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


        trails.forEach(
            () => {

                trailPositions.push({

                    x:
                        mouseX,

                    y:
                        mouseY

                });

            }
        );


        /* =====================================================
           MOUSE POSITION
        ===================================================== */

        document.addEventListener(
            "mousemove",
            event => {

                mouseX =
                    event.clientX;


                mouseY =
                    event.clientY;

            }
        );


        /* =====================================================
           ANIMATE CURSOR
        ===================================================== */

        function animateCursor() {

            cursorX +=
                (
                    mouseX -
                    cursorX
                ) *
                0.18;


            cursorY +=
                (
                    mouseY -
                    cursorY
                ) *
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
                (
                    trail,
                    index
                ) => {

                    const position =
                        trailPositions[index];


                    if (!position) return;


                    const speed =
                        Math.max(
                            0.08,
                            0.22 -
                            index * 0.02
                        );


                    position.x +=
                        (
                            previousX -
                            position.x
                        ) *
                        speed;


                    position.y +=
                        (
                            previousY -
                            position.y
                        ) *
                        speed;


                    trail.style.left =
                        position.x + "px";


                    trail.style.top =
                        position.y + "px";


                    const scale =
                        Math.max(
                            0.25,
                            1 -
                            index * 0.12
                        );


                    const opacity =
                        Math.max(
                            0,
                            0.65 -
                            index * 0.09
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


        /* =====================================================
           HOVER
        ===================================================== */

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


        /* =====================================================
           CLICK
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
           MOUSE LEAVE
        ===================================================== */

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


        /* =====================================================
           MOUSE ENTER
        ===================================================== */

        document.addEventListener(
            "mouseenter",
            () => {

                cursor.style.opacity =
                    "1";

            }
        );

    }
);
