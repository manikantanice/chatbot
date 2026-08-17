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
       SEND BUTTON
    ================================================= */

    if (sendBtn) {

        sendBtn.addEventListener(
            "click",
            sendMessage
        );

    }


    /* =================================================
       SEND MESSAGE
    ================================================= */

    async function sendMessage() {

        if (sending) return;


        if (!input) return;


        const message =
            input.value.trim();


        /* =============================================
           CHECK MESSAGE / IMAGE
        ============================================= */

        if (
            !message &&
            selectedFiles.length === 0
        ) {

            input.focus();

            return;

        }


        /* =============================================
           SAVE FILES
        ============================================= */

        const filesToSend =
            [...selectedFiles];


        /* =============================================
           HIDE WELCOME
        ============================================= */

        if (welcomeScreen) {

            welcomeScreen.style.display =
                "none";

        }


        /* =============================================
           USER DISPLAY MESSAGE
        ============================================= */

        let displayMessage =
            message;


        if (
            filesToSend.length > 0 &&
            !message
        ) {

            displayMessage =
                filesToSend.length === 1
                    ? "Please analyze this image."
                    : `Please analyze these ${filesToSend.length} images.`;

        }


        /* =============================================
           SHOW USER MESSAGE
        ============================================= */

        addUserMessage(
            displayMessage,
            filesToSend
        );


        /* =============================================
           CLEAR INPUT
        ============================================= */

        input.value = "";

        autoResize();


        if (toolsPopup) {

            toolsPopup.classList.remove(
                "show"
            );

        }


        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        /*
         * IMPORTANT:
         *
         * Do NOT push current user message
         * into conversation before API request.
         *
         * Backend itself adds current message.
         *
         * This prevents duplicate user messages.
         */


        try {

            /* =========================================
               CONVERT IMAGES TO BASE64
            ========================================= */

            const images =
                await filesToBase64(
                    filesToSend
                );


            /* =========================================
               COPY PREVIOUS HISTORY ONLY
            ========================================= */

            const previousConversation =
                conversation.map(
                    item => ({

                        role:
                            item.role,

                        content:
                            item.content

                    })
                );


            /* =========================================
               API REQUEST
            ========================================= */

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
                                    previousConversation,

                                webSearch:
                                    webMode,

                                images:
                                    images

                            })

                    }
                );


            /* =========================================
               HTTP ERROR
            ========================================= */

            if (!response.ok) {

                let errorData = null;


                try {

                    errorData =
                        await response.json();

                } catch (error) {

                    console.error(
                        "Could not parse API error:",
                        error
                    );

                }


                throw new Error(

                    errorData?.error ||

                    `API error ${response.status}`

                );

            }


            /* =========================================
               API JSON
            ========================================= */

            const data =
                await response.json();


            /* =========================================
               API ERROR
            ========================================= */

            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(

                    data?.error ||
                    "AI request failed."

                );

            }


            /* =========================================
               GET AI FINAL ANSWER ONLY
            ========================================= */

            const reply =
                getAIOnlyReply(
                    data
                );


            if (!reply) {

                throw new Error(
                    "AI returned an empty response."
                );

            }


            /* =========================================
               SHOW ONLY AI FINAL ANSWER
            ========================================= */

            await typeAIMessage(
                reply
            );


            /* =========================================
               SAVE USER MESSAGE TO HISTORY
            ========================================= */

            conversation.push({

                role: "user",

                content:
                    message ||
                    (
                        filesToSend.length > 0
                            ? "Please analyze the uploaded image."
                            : ""
                    )

            });


            /* =========================================
               SAVE AI FINAL ANSWER TO HISTORY
            ========================================= */

            conversation.push({

                role: "assistant",

                content:
                    reply

            });


            /* =========================================
               RECENT CHAT
            ========================================= */

            saveRecentChat(

                message ||
                (
                    filesToSend.length > 0
                        ? "Image analysis"
                        : "New conversation"
                )

            );


        } catch (error) {

            console.error(
                "Chat API Error:",
                error
            );


            /* =========================================
               ERROR MESSAGE
            ========================================= */

            addMessage(
                "ai",
                `⚠️ ${
                    error?.message ||
                    "I couldn't connect to the AI right now. Please try again."
                }`
            );

        } finally {

            /* =========================================
               STOP LOADING
            ========================================= */

            setLoading(false);


            /* =========================================
               CLEAR SELECTED FILES
            ========================================= */

            selectedFiles = [];


            if (fileInput) {

                fileInput.value = "";

            }


            renderAttachments();

        }

    }


    /* =================================================
       FILE -> BASE64
    ================================================= */

    function filesToBase64(
        files
    ) {

        return Promise.all(

            files.map(
                file => {

                    return new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            /* =================================
                               IMAGE CHECK
                            ================================= */

                            if (
                                !file.type.startsWith(
                                    "image/"
                                )
                            ) {

                                reject(

                                    new Error(

                                        `${file.name} is not an image. Please upload JPG, PNG, WEBP or another image file.`

                                    )

                                );

                                return;

                            }


                            /* =================================
                               SIZE CHECK
                            ================================= */

                            const maxSize =
                                3.5 *
                                1024 *
                                1024;


                            if (
                                file.size >
                                maxSize
                            ) {

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


                            reader.onload =
                                () => {

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


    /* =================================================
       ADD USER MESSAGE WITH IMAGES
    ================================================= */

    function addUserMessage(
        text,
        files = []
    ) {

        if (!chatMessages) return;


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "chat-message user";


        const bubble =
            document.createElement(
                "div"
            );


        bubble.className =
            "chat-bubble";


        /* =============================================
           USER TEXT
        ============================================= */

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


        /* =============================================
           USER IMAGES
        ============================================= */

        if (
            files.length > 0
        ) {

            const imagesContainer =
                document.createElement(
                    "div"
                );


            imagesContainer.className =
                "sent-images";


            files.forEach(
                file => {

                    if (
                        !file.type.startsWith(
                            "image/"
                        )
                    ) {

                        return;

                    }


                    const image =
                        document.createElement(
                            "img"
                        );


                    image.className =
                        "sent-image";


                    image.alt =
                        file.name;


                    const imageUrl =
                        URL.createObjectURL(
                            file
                        );


                    image.src =
                        imageUrl;


                    image.loading =
                        "lazy";


                    /* =================================
                       OPEN IMAGE
                    ================================= */

                    image.addEventListener(
                        "click",
                        () => {

                            openImageViewer(
                                imageUrl
                            );

                        }
                    );


                    imagesContainer.appendChild(
                        image
                    );

                }
            );


            bubble.appendChild(
                imagesContainer
            );

        }


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
       IMAGE VIEWER
    ================================================= */

    function openImageViewer(
        imageSrc
    ) {

        const viewer =
            document.createElement(
                "div"
            );


        viewer.className =
            "image-viewer";


        const backdrop =
            document.createElement(
                "div"
            );


        backdrop.className =
            "image-viewer-backdrop";


        const content =
            document.createElement(
                "div"
            );


        content.className =
            "image-viewer-content";


        const closeButton =
            document.createElement(
                "button"
            );


        closeButton.type =
            "button";


        closeButton.className =
            "image-viewer-close";


        closeButton.setAttribute(
            "aria-label",
            "Close"
        );


        closeButton.textContent =
            "×";


        const image =
            document.createElement(
                "img"
            );


        image.src =
            imageSrc;


        image.alt =
            "Uploaded image";


        content.appendChild(
            closeButton
        );


        content.appendChild(
            image
        );


        viewer.appendChild(
            backdrop
        );


        viewer.appendChild(
            content
        );


        document.body.appendChild(
            viewer
        );


        function closeViewer() {

            viewer.remove();

            document.removeEventListener(
                "keydown",
                escapeViewer
            );

        }


        function escapeViewer(
            event
        ) {

            if (
                event.key === "Escape"
            ) {

                closeViewer();

            }

        }


        closeButton.addEventListener(
            "click",
            closeViewer
        );


        backdrop.addEventListener(
            "click",
            closeViewer
        );


        document.addEventListener(
            "keydown",
            escapeViewer
        );

    }


    /* =================================================
       ADD NORMAL MESSAGE
    ================================================= */

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


    /* =================================================
       AI TYPEWRITER
    ================================================= */

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


        /* =============================================
           TYPE AI ANSWER
        ============================================= */

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


        /* =============================================
           FINAL FORMATTED AI ANSWER
        ============================================= */

        bubble.innerHTML =
            formatMessage(
                text
            );


        scrollChat();

    }


    /* =================================================
       GET AI FINAL ANSWER ONLY
    ================================================= */

    function getAIOnlyReply(
        data
    ) {

        /*
         * IMPORTANT:
         *
         * We ONLY accept:
         *
         * data.reply
         *
         * We intentionally DO NOT use:
         *
         * data.message
         * data.response
         * data.content
         * data.model
         * data.success
         * data.hasImages
         * data.imageCount
         */

        if (!data) {

            return "";

        }


        if (
            typeof data === "string"
        ) {

            return data.trim();

        }


        if (
            typeof data.reply === "string"
        ) {

            return data.reply.trim();

        }


        return "";

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


    /* =================================================
       STRIP HTML
    ================================================= */

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
       SCROLL CHAT
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

    }


    /* =================================================
       PLUS BUTTON
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


    /* =================================================
       ATTACH FILE
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

    }


    /* =================================================
       FILE SELECT
    ================================================= */

    if (fileInput) {

        fileInput.addEventListener(
            "change",
            () => {

                const files =
                    Array.from(
                        fileInput.files
                    );


                if (
                    files.length === 0
                ) {

                    return;

                }


                /* =========================================
                   ONLY IMAGES
                ========================================= */

                const validFiles =
                    files.filter(
                        file =>
                            file.type.startsWith(
                                "image/"
                            )
                    );


                if (
                    validFiles.length !==
                    files.length
                ) {

                    alert(
                        "Please upload image files only."
                    );

                }


                /* =========================================
                   MAX 3 IMAGES
                ========================================= */

                const remainingSlots =
                    3 -
                    selectedFiles.length;


                if (
                    remainingSlots <= 0
                ) {

                    alert(
                        "You can upload up to 3 images at a time."
                    );

                    fileInput.value = "";

                    return;

                }


                selectedFiles.push(
                    ...validFiles.slice(
                        0,
                        remainingSlots
                    )
                );


                if (
                    validFiles.length >
                    remainingSlots
                ) {

                    alert(
                        "Only 3 images can be uploaded at a time."
                    );

                }


                renderAttachments();


                /* =========================================
                   RESET INPUT
                ========================================= */

                fileInput.value = "";

            }
        );

    }


    /* =================================================
       IMAGE PREVIEW
    ================================================= */

    function renderAttachments() {

        if (!attachmentPreview) return;


        attachmentPreview.innerHTML =
            "";


        selectedFiles.forEach(
            (
                file,
                index
            ) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "attachment-item";


                /* =====================================
                   IMAGE THUMBNAIL
                ===================================== */

                const thumbnail =
                    document.createElement(
                        "img"
                    );


                thumbnail.className =
                    "attachment-thumbnail";


                thumbnail.alt =
                    file.name;


                const thumbnailUrl =
                    URL.createObjectURL(
                        file
                    );


                thumbnail.src =
                    thumbnailUrl;


                /* =====================================
                   FILE NAME
                ===================================== */

                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "attachment-name";


                name.textContent =
                    file.name;


                /* =====================================
                   REMOVE BUTTON
                ===================================== */

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


                        if (toolsPopup) {

                            toolsPopup.classList.remove(
                                "show"
                            );

                        }

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

                    if (!input) return;


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

                if (input) {

                    input.focus();

                }

            }
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

            autoResize();

        }


        renderAttachments();


        if (toolsPopup) {

            toolsPopup.classList.remove(
                "show"
            );

        }


        if (input) {

            input.focus();

        }


        closeMobileSidebar();

    }


    /* =================================================
       RECENT CHAT
    ================================================= */

    function saveRecentChat(
        message
    ) {

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


        const icon =
            document.createElement(
                "span"
            );


        icon.className =
            "conversation-icon";


        icon.textContent =
            "◇";


        const title =
            document.createElement(
                "span"
            );


        title.textContent =
            message.substring(
                0,
                24
            );


        item.appendChild(
            icon
        );


        item.appendChild(
            title
        );


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
            "te-IN";


        recognition.onstart =
            () => {

                if (micBtn) {

                    micBtn.classList.add(
                        "active"
                    );

                }


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

                if (micBtn) {

                    micBtn.classList.remove(
                        "active"
                    );

                }


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


                if (micBtn) {

                    micBtn.classList.remove(
                        "active"
                    );

                }

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
       EXPAND COMPOSER
    ================================================= */

    if (composerExpand) {

        composerExpand.addEventListener(
            "click",
            () => {

                if (!input) return;


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

        if (sidebar) {

            sidebar.classList.add(
                "open"
            );

        }


        if (mobileOverlay) {

            mobileOverlay.classList.add(
                "show"
            );

        }

    }


    function closeMobileSidebar() {

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }


        if (mobileOverlay) {

            mobileOverlay.classList.remove(
                "show"
            );

        }

    }


    /* =================================================
       KEYBOARD SHORTCUTS
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();


                if (input) {

                    input.focus();

                }

            }


            if (
                event.key === "Escape"
            ) {

                if (toolsPopup) {

                    toolsPopup.classList.remove(
                        "show"
                    );

                }


                closeMobileSidebar();

            }

        }
    );


    /* =================================================
       HELPER
    ================================================= */

    function sleep(
        ms
    ) {

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
           ANIMATE CURSOR
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
                (
                    trail,
                    index
                ) => {

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


        /* =============================================
           HOVER
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
           CLICK
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


        document.addEventListener(
            "mouseenter",
            () => {

                cursor.style.opacity =
                    "1";

            }
        );

    }
);
