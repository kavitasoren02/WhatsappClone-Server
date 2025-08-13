const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http")
const socketIo = require("socket.io")
require("dotenv").config()

const messageRoutes = require("./routes/messages")
const chatRoutes = require("./routes/chats")
const webhookProcessor = require("./utils/webhookProcessor")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
})

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp")

const db = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error:"))
db.once("open", () => {
    console.log("Connected to MongoDB")
})

io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    socket.on("sendMessage", (message) => {
        socket.broadcast.emit("newMessage", message)
    })

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)
    })
})

app.set("io", io)

app.use("/api/messages", messageRoutes)
app.use("/api/chats", chatRoutes)

app.post("/webhook", (req, res) => {
    console.log("Webhook received:", JSON.stringify(req.body, null, 2))

    webhookProcessor.processWebhook(req.body, io)

    res.status(200).send("OK")
})

app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() })
})

const processSamplePayloads = async () => {
    try {
        await webhookProcessor.processSamplePayloads()
        console.log("Sample payloads processed successfully")
    } catch (error) {
        console.error("Error processing sample payloads:", error)
    }
}

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)

    setTimeout(processSamplePayloads, 2000)
})
