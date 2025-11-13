// routes/reports.js
import express from "express";
import telegrammController from "../controllers/telegrammController.js";

const router = express.Router();

// POST /api/telegram/send - создание жалобы
router.post("/send", telegrammController.sendMessage);

export default router;
