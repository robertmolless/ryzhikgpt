# Рыжик: Тайна загородного дома

Готовый HTML5 canvas-проект для GitHub Pages и Telegram WebApp.

## Запуск
Открой `index.html` в браузере или загрузи файлы в GitHub Pages.

## GitHub Pages
1. Создай репозиторий `ryzhik-cat-game`.
2. Загрузи `index.html`, `style.css`, `game.js`, `manifest.json` в корень.
3. Settings → Pages → Deploy from branch → main / root.
4. Получишь ссылку вида `https://username.github.io/ryzhik-cat-game/`.

## Telegram WebApp
В BotFather укажи домен через `/setdomain`, например `https://username.github.io`.

Пример Python-бота:
```python
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = "TOKEN"
GAME_URL = "https://username.github.io/ryzhik-cat-game/"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("🐈 Играть в Рыжика", web_app=WebAppInfo(url=GAME_URL))]]
    await update.message.reply_text("Мяу! Запускай игру 🐾", reply_markup=InlineKeyboardMarkup(keyboard))

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
```

## Управление
Телефон: виртуальный джойстик и кнопки. ПК: WASD/стрелки, E, Space, I, M, Q, Esc.
