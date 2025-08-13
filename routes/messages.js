const express = require("express")
const router = express.Router()
const Message = require("../models/Message")

// Get messages for a specific wa_id
router.get("/:wa_id", async (req, res) => {
    try {
        const { wa_id } = req.params
        const messages = await Message.find({ wa_id }).sort({ timestamp: 1 }).limit(100) // Limit to last 100 messages

        res.json(messages)
    } catch (error) {
        console.error("Error fetching messages:", error)
        res.status(500).json({ error: "Failed to fetch messages" })
    }
})

// Send a new message
router.post("/send", async (req, res) => {
    try {
        const { wa_id, text, type = "outgoing" } = req.body

        if (!wa_id || !text) {
            return res.status(400).json({ error: "wa_id and text are required" })
        }

        const message = new Message({
            wa_id,
            text,
            type,
            timestamp: new Date(),
            status: "sent",
        })

        await message.save()

        // Emit to all connected clients
        const io = req.app.get("io")
        io.emit("newMessage", message)

        res.status(201).json(message)
    } catch (error) {
        console.error("Error sending message:", error)
        res.status(500).json({ error: "Failed to send message" })
    }
})

// Update message status
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const message = await Message.findByIdAndUpdate(id, { status }, { new: true })

        if (!message) {
            return res.status(404).json({ error: "Message not found" })
        }

        // Emit status update to all connected clients
        const io = req.app.get("io")
        io.emit("messageStatusUpdate", message)

        res.json(message)
    } catch (error) {
        console.error("Error updating message status:", error)
        res.status(500).json({ error: "Failed to update message status" })
    }
})

module.exports = router
