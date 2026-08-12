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
/* =========================================
   PREMIUM AI CURSOR + SMOOTH TRAIL
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const cursor = document.querySelector(".ai-cursor");

    if (!cursor) return;

    const core = cursor.querySelector(".cursor-core");

    const trails = Array.from(
        document.querySelectorAll(".cursor-trail")
    );

    /* =========================================
       CURSOR POSITION
    ========================================= */

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let cursorX = mouseX;
    let cursorY = mouseY;


    /* =========================================
       TRAIL POSITIONS
    ========================================= */

    const trailPositions = trails.map(() => ({
        x: mouseX,
        y: mouseY
    }));


    /* =========================================
       MOUSE MOVE
    ========================================= */

    document.addEventListener("mousemove", (e) => {

        mouseX = e.clientX;
        mouseY = e.clientY;

        cursor.style.opacity = "1";

        trails.forEach((trail) => {
            trail.style.opacity = "";
        });

    });


    /* =========================================
       SMOOTH CURSOR ANIMATION
    ========================================= */

    function animateCursor() {

        /* Main cursor */

        cursorX +=
            (mouseX - cursorX) * 0.20;

        cursorY +=
            (mouseY - cursorY) * 0.20;


        cursor.style.left =
            cursorX + "px";

        cursor.style.top =
            cursorY + "px";


        /* =====================================
           TRAIL
        ===================================== */

        let targetX = cursorX;
        let targetY = cursorY;


        trails.forEach((trail, index) => {

            const position =
                trailPositions[index];


            /*
             * Each trail follows the
             * previous trail.
             */

            const speed =
                Math.max(
                    0.08,
                    0.20 - (index * 0.018)
                );


            position.x +=
                (targetX - position.x) *
                speed;


            position.y +=
                (targetY - position.y) *
                speed;


            trail.style.left =
                position.x + "px";


            trail.style.top =
                position.y + "px";


            /* =================================
               TRAIL SIZE
            ================================= */

            const scale =
                Math.max(
                    0.25,
                    1 - (index * 0.10)
                );


            /* =================================
               TRAIL OPACITY
            ================================= */

            const opacity =
                Math.max(
                    0.08,
                    0.65 - (index * 0.075)
                );


            trail.style.transform =
                `translate(-50%, -50%) scale(${scale})`;


            trail.style.opacity =
                opacity;


            /*
             * IMPORTANT:
             * Next trail follows THIS trail,
             * not the main cursor.
             */

            targetX =
                position.x;

            targetY =
                position.y;

        });


        requestAnimationFrame(
            animateCursor
        );

    }


    animateCursor();


    /* =========================================
       HOVER EFFECT
    ========================================= */

    function addHoverEvents() {

        const interactiveElements =
            document.querySelectorAll(
                `
                a,
                button,
                input,
                textarea,
                select,
                .feature-card,
                .mani-ai-logo,
                .new-chat,
                .quick-card,
                .tool-option,
                .conversation,
                [role="button"]
                `
            );


        interactiveElements.forEach(
            (element) => {

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


    addHoverEvents();


    /* =========================================
       CLICK ANIMATION
    ========================================= */

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


    /* =========================================
       MOUSE LEAVE
    ========================================= */

    document.addEventListener(
        "mouseleave",
        () => {

            cursor.classList.add(
                "cursor-hidden"
            );

            trails.forEach(
                (trail) => {

                    trail.classList.add(
                        "cursor-hidden"
                    );

                }
            );

        }
    );


    /* =========================================
       MOUSE ENTER
    ========================================= */

    document.addEventListener(
        "mouseenter",
        () => {

            cursor.classList.remove(
                "cursor-hidden"
            );


            trails.forEach(
                (trail) => {

                    trail.classList.remove(
                        "cursor-hidden"
                    );

                }
            );

        }
    );

});
