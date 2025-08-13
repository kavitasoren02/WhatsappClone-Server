const express = require("express")
const router = express.Router()
const Message = require("../models/Message")

// Get all chats with last message
router.get("/", async (req, res) => {
    try {
        // Aggregate to get unique wa_ids with their last message
        const chats = await Message.aggregate([
            {
                $sort: { timestamp: -1 },
            },
            {
                $group: {
                    _id: "$wa_id",
                    lastMessage: { $first: "$$ROOT" },
                    profile_name: { $first: "$profile_name" },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $and: [{ $ne: ["$type", "outgoing"] }, { $ne: ["$status", "read"] }] }, 1, 0],
                        },
                    },
                },
            },
            {
                $project: {
                    wa_id: "$_id",
                    profile_name: 1,
                    lastMessage: 1,
                    unreadCount: 1,
                    _id: 0,
                },
            },
            {
                $sort: { "lastMessage.timestamp": -1 },
            },
        ])

        res.json(chats)
    } catch (error) {
        console.error("Error fetching chats:", error)
        res.status(500).json({ error: "Failed to fetch chats" })
    }
})

// Mark messages as read for a specific chat
router.patch("/:wa_id/read", async (req, res) => {
    try {
        const { wa_id } = req.params

        await Message.updateMany(
            {
                wa_id,
                type: { $ne: "outgoing" },
                status: { $ne: "read" },
            },
            { status: "read" },
        )

        res.json({ success: true })
    } catch (error) {
        console.error("Error marking messages as read:", error)
        res.status(500).json({ error: "Failed to mark messages as read" })
    }
})

module.exports = router
