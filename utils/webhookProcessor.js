const Message = require("../models/Message")
const fs = require("fs")
const path = require("path")

class WebhookProcessor {
    async processWebhook(payload, io) {
        try {
            // Handle the metaData structure from your sample files
            const webhookData = payload.metaData || payload

            if (webhookData.entry && webhookData.entry[0] && webhookData.entry[0].changes) {
                const changes = webhookData.entry[0].changes[0]

                if (changes.value.messages) {
                    // Process incoming messages
                    for (const message of changes.value.messages) {
                        await this.processMessage(message, changes.value.contacts, io)
                    }
                }

                if (changes.value.statuses) {
                    // Process status updates
                    for (const status of changes.value.statuses) {
                        await this.processStatusUpdate(status, io)
                    }
                }
            }
        } catch (error) {
            console.error("Error processing webhook:", error)
        }
    }

    async processMessage(messageData, contacts, io) {
        try {
            const contact = contacts?.find((c) => c.wa_id === messageData.from)

            const message = new Message({
                wa_id: messageData.from,
                from: messageData.from,
                text: messageData.text?.body || messageData.image?.caption || "Media message",
                timestamp: new Date(Number.parseInt(messageData.timestamp) * 1000),
                type: messageData.type || "text",
                status: "delivered",
                meta_msg_id: messageData.id,
                profile_name: contact?.profile?.name,
            })

            await message.save()

            // Emit to all connected clients
            if (io) {
                io.emit("newMessage", message)
            }

            console.log(`Message processed: ${message._id} from ${contact?.profile?.name || messageData.from}`)
        } catch (error) {
            console.error("Error processing message:", error)
        }
    }

    async processStatusUpdate(statusData, io) {
        try {
            // Use meta_msg_id or id field to find the message
            const messageId = statusData.meta_msg_id || statusData.id
            const message = await Message.findOne({ meta_msg_id: messageId })

            if (message) {
                message.status = statusData.status
                await message.save()

                // Emit status update to all connected clients
                if (io) {
                    io.emit("messageStatusUpdate", message)
                }

                console.log(`Status updated: ${messageId} -> ${statusData.status}`)
            } else {
                console.log(`Message not found for status update: ${messageId}`)
            }
        } catch (error) {
            console.error("Error processing status update:", error)
        }
    }

    async processSamplePayloads() {
        const sampleDataDir = path.join(__dirname, "../sample-data")

        try {
            if (!fs.existsSync(sampleDataDir)) {
                console.log("Sample data directory not found. Please add your JSON files to server/sample-data/")
                return
            }

            const files = fs.readdirSync(sampleDataDir)
            const jsonFiles = files.filter((file) => file.endsWith(".json"))

            if (jsonFiles.length === 0) {
                console.log("No JSON files found in sample-data directory")
                return
            }

            // Sort files to process messages before status updates
            const messageFiles = jsonFiles.filter((file) => file.includes("message")).sort()
            const statusFiles = jsonFiles.filter((file) => file.includes("status")).sort()

            // Process message files first
            for (const file of messageFiles) {
                const filePath = path.join(sampleDataDir, file)
                const payload = JSON.parse(fs.readFileSync(filePath, "utf8"))
                await this.processWebhook(payload)
                console.log(`Processed sample file: ${file}`)

                // Add small delay to maintain chronological order
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            // Then process status files
            for (const file of statusFiles) {
                const filePath = path.join(sampleDataDir, file)
                const payload = JSON.parse(fs.readFileSync(filePath, "utf8"))
                await this.processWebhook(payload)
                console.log(`Processed sample file: ${file}`)

                // Add small delay to maintain chronological order
                await new Promise((resolve) => setTimeout(resolve, 100))
            }
        } catch (error) {
            console.error("Error processing sample payloads:", error)
        }
    }
}

module.exports = new WebhookProcessor()
