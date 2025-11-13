import tgService from "../services/telegramService.js";
import { formatResponse } from "../utils/helpers.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { writeLog } from "../middlewares/logger.js";

class TelegramController {
  // Получение списка пользователей (только админы)
  sendMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;

    writeLog(`[INFO]`, `Send message to telegram: ${message}`);

    if (!message) res.json(formatResponse(false, null, "Message not provided"));

    const result = await tgService.sendMessage(message);

    res.json(formatResponse(true, null, result.message));
  });
}

export default new TelegramController();
