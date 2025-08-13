const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
    {
        wa_id: {
            type: String,
            required: true,
            index: true,
        },
        from: {
            type: String,
            default: null,
        },
        text: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        type: {
            type: String,
            enum: ["text", "image", "document", "outgoing"],
            default: "text",
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
        },
        meta_msg_id: {
            type: String,
            sparse: true,
        },
        profile_name: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    },
)

// Index for efficient queries
messageSchema.index({ wa_id: 1, timestamp: -1 })

module.exports = mongoose.model("Message", messageSchema, "processed_messages")
