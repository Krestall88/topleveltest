@echo off
echo 🧪 Простое тестирование системы email...
echo.

echo 📧 Тест 1: Первое письмо от нового клиента
curl -X POST http://localhost:3000/api/webhooks/email ^
  -H "Content-Type: application/json" ^
  -d "{\"from\":\"test.client@example.com\",\"subject\":\"Тестовое письмо\",\"text\":\"Привет! Нужна помощь с уборкой.\",\"messageId\":\"test-msg-1\"}"

echo.
echo.
echo 📋 Проверка заданий:
curl http://localhost:3000/api/additional-tasks

echo.
echo.
echo ✅ Тестирование завершено!
pause
