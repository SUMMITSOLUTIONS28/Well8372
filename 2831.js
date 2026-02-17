// ⚠ WARNING: BOT_TOKEN is exposed here. Only use if you trust users.
const BOT_TOKEN = "8585104821:AAFXZn3g7QG9NsCmLmZuyfviQkPddOYMJzc";
const CHAT_ID = "8468538314";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const transactions = {};
let lastUpdateId = 0; // prevent duplicate processing

// Submit payment message to Telegram
async function submitPayment(sessionId, mpesaMessage, user = "User123") {
    transactions[sessionId] = { status: "pending", user, mpesaMessage };

    const message = `💰 New MPESA Payment\nUser: ${user}\nMessage:\n${mpesaMessage}\nSession: ${sessionId}\nApprove?`;

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

        return true;

    } catch (err) {
        console.error(err);
        return false;
    }
}

// Poll Telegram for manual approval
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

// 🔗 Connect to existing HTML submit button
document.addEventListener("DOMContentLoaded", () => {

    const submitBtn = document.getElementById("submitPayment");
    const textarea = document.getElementById("mpesaMessage");
    const overlay = document.getElementById("overlay");

    if (!submitBtn || !textarea || !overlay) return;

    submitBtn.addEventListener("click", async () => {

        if (!textarea.value.trim()) {
            alert("Please enter your PayPal or MPESA transaction message before submitting.");
            textarea.focus();
            return;
        }

        // Show overlay (keeps your HTML functionality intact)
        overlay.style.display = "flex";

        const sessionId = "SID_" + Date.now();
        const mpesaMessage = textarea.value.trim();

        const sent = await submitPayment(sessionId, mpesaMessage);

        if (sent) {
            pollStatus(sessionId, (status) => {

                if (status === "approved") {
                    overlay.style.display = "none";
                    alert("Payment Approved!");
                    window.location.href = "https://youtube.com";
                }

                if (status === "rejected") {
                    overlay.style.display = "none";
                    alert("Payment Rejected.");
                }

            });
        }

    });

});