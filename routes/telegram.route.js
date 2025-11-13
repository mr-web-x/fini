// routes/reports.js
import express from "express";
import telegramController from "../controllers/telegramController.js";

const router = express.Router();

// POST /api/telegram/send - создание жалобы
router.post("/send", telegramController.sendMessage);

export default router;
