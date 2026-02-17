// ⚠ WARNING: BOT_TOKEN is exposed here. Only use if you trust users.
const BOT_TOKEN = "8585104821:AAFXZn3g7QG9NsCmLmZuyfviQkPddOYMJzc";
const CHAT_ID = "8468538314";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const transactions = {};
const usedMessages = {}; // NEW: track used payment messages
let lastUpdateId = 0; 

async function submitPayment(sessionId, mpesaMessage, selectedContent, user = "User123") {

    // CHECK if payment message has been used before
    if (usedMessages[mpesaMessage]) {
        alert("Access Denied: This payment message has already been used for another content.");
        return false;
    }

    transactions[sessionId] = { status: "pending", user, mpesaMessage, selectedContent };

    const message = `💰 New Payment\nUser: ${user}\nSelected Content: ${selectedContent}\nPayment Message:\n${mpesaMessage}\nSession: ${sessionId}\nApprove?`;

    try {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ YES", callback_data: `approve_${sessionId}` },
                            { text: "❌ NO", callback_data: `reject_${sessionId}` }
                        ]
                    ]
                }
            })
        });

        // MARK payment message as used
        usedMessages[mpesaMessage] = selectedContent;

        return true;

    } catch (err) {
        console.error(err);
        return false;
    }
}

function pollStatus(sessionId, callback) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}`);
            const data = await res.json();

            if (data.result && data.result.length) {
                data.result.forEach(update => {
                    lastUpdateId = update.update_id;

                    if (
                        update.callback_query &&
                        update.callback_query.data &&
                        update.callback_query.data.includes(sessionId)
                    ) {
                        if (update.callback_query.data.startsWith("approve_")) {
                            clearInterval(interval);
                            callback("approved");
                        }
                        if (update.callback_query.data.startsWith("reject_")) {
                            clearInterval(interval);
                            callback("rejected");
                        }
                    }
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById("submitPayment");
    const textarea = document.getElementById("mpesaMessage");
    const dropdown = document.getElementById("targetLink");
    const overlay = document.getElementById("overlay");

    if (!submitBtn || !textarea || !overlay || !dropdown) return;

    submitBtn.addEventListener("click", async () => {

        if (!dropdown.value) {
            alert("Please select the content you want to access before pasting your payment message.");
            dropdown.focus();
            return;
        }

        if (!textarea.value.trim()) {
            alert("Please paste your PayPal or MPESA payment message for admin confirmation.");
            textarea.focus();
            return;
        }

        const mpesaMessage = textarea.value.trim();

        // CHECK if message is already used
        if (usedMessages[mpesaMessage] && usedMessages[mpesaMessage] !== dropdown.value) {
            alert("Access Denied: This payment message has already been used for another content.");
            return;
        }

        overlay.style.display = "flex";

        const sessionId = "SID_" + Date.now();
        const selectedContent = dropdown.value;

        const sent = await submitPayment(sessionId, mpesaMessage, selectedContent);

        if (sent) {
            pollStatus(sessionId, (status) => {
                if (status === "approved") {
                    overlay.style.display = "none";
                    alert("Payment Approved!");
                    window.location.href = selectedContent; // redirect to chosen content
                }
                if (status === "rejected") {
                    overlay.style.display = "none";
                    alert("Payment Rejected.");
                }
            });
        }

    });
});