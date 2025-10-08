// services/tg.service.js
import axios from "axios";
import { microServices } from "../config/micro.js";
import { cryptoData, cryptoXAPIKey } from "../utils/crypto.js";

class TGService {
  constructor() {
    this.baseUrl = microServices.telegram.baseUrl;
    this.apiKey = microServices.telegram.xApiKey;

    this.client = axios.create({
      baseURL: microServices.telegram.baseUrl,
      timeout: 10000,
    });

    // Interceptor для логирования
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `📧 TG Service Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("❌ TG Service Request Error:", error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(
          `✅ TG Service Response: ${response.status} ${response.config.url}`
        );
        console.log(`✅ TG sent:`, response.data?.status);
        return response;
      },
      (error) => {
        console.error(
          `❌ TG Service Error: ${error.response?.status || "NETWORK"} ${
            error.config?.url
          }`
        );
        console.error(
          "Error details:",
          error.response?.data || error.message || "none"
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Отправка tg через микросервис
   * @param {string} messageToSend - TG получателя
   * @returns {Promise<object>} Результат отправки
   */
  async sendMessage(messageToSend) {
    try {
      if (!messageToSend) {
        throw new Error("Missing required fields: messageToSend");
      }

      const authToken = cryptoXAPIKey({
        apiKey: microServices.telegram.xApiKey,
        timestamp: Date.now(),
      });

      const response = await this.client.post(
        "/tg/send",
        {
          data: cryptoData({ messageToSend }),
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TGService-Client/1.0",
            "X-API-Key": authToken, // ✅ Правильное название заголовка + свежий токен
          },
        }
      );

      console.log("[TG] Message was sended!");

      return {
        success: response.data.status,
        message: response.data.message,
        response: response.data.response,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`❌ Failed to send tg message:`, errorMessage);

      throw new Error(`TG sending failed: ${errorMessage}`);
    }
  }
}

// Создание и экспорт экземпляра сервиса
const tgService = new TGService();

export default tgService;
