import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing in env!');
  process.exit(1);
}

const bot = new Telegraf(token);

async function main() {
  try {
    const chat = await bot.telegram.getChat('@anoatesbot');
    console.log('--- CHAT INFO ---');
    console.log(chat);
  } catch (err: any) {
    console.error('Error fetching chat:', err.message);
  }
}

main();
