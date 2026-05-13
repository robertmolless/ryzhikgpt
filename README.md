# Рыжик: Тайна загородного дома — v2

HTML5 canvas game для GitHub Pages и Telegram WebApp.

## Что добавлено в v2
- Более логичная цепочка квестов
- 3 мини-игры: рыбалка, светлячки, мяу-концерт
- Экран улучшений кошачьего уголка
- Прогресс квестов
- Больше деталей на карте
- Улучшенные эффекты вечера, ночи, дождя, светлячков
- Сохранение v2 в localStorage

## Файлы
- `index.html`
- `style.css`
- `game.js`
- `manifest.json`
- `README.md`

## Как обновить GitHub Pages
1. Распакуй ZIP.
2. Зайди в репозиторий игры.
3. Загрузи файлы поверх старых.
4. Нажми Commit changes.
5. Через 30–60 секунд GitHub Pages обновится.

## Telegram Bot WebApp
Ссылка остаётся та же, если репозиторий и Pages URL не менялись.

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
