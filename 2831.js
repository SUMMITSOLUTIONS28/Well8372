// ⚠ WARNING: BOT_TOKEN is exposed here. Only use if you trust users.
const BOT_TOKEN = "8585104821:AAFXZn3g7QG9NsCmLmZuyfviQkPddOYMJzc"; // replace with your Telegram bot token
const CHAT_ID = "8468538314";     // replace with your Telegram chat ID
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const transactions = {};

// Submit payment message to Telegram
async function submitPayment(sessionId, mpesaMessage, user="User123") {
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
                    inline_keyboard:[
                        [
                            { text:"✅ YES", callback_data:`approve_${sessionId}` },
                            { text:"❌ NO", callback_data:`reject_${sessionId}` }
                        ]
                    ]
                }
            })
        });
        return true;
    } catch(err){
        console.error(err);
        return false;
    }
}

// Poll Telegram for your manual approval
function pollStatus(sessionId, callback) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
            const data = await res.json();

            if(data.result && data.result.length) {
                data.result.forEach(update => {
                    if(update.callback_query && update.callback_query.data.includes(sessionId)) {
                        if(update.callback_query.data.startsWith("approve_")) {
                            clearInterval(interval);
                            callback("approved");
                        } else if(update.callback_query.data.startsWith("reject_")) {
                            clearInterval(interval);
                            callback("rejected");
                        }
                    }
                });
            }
        } catch(err){
            console.error(err);
        }
    }, 5000);
}