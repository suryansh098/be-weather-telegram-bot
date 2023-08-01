import { Injectable, Logger } from '@nestjs/common';
// import { TEST_USER_ID } from './telegram.constants';
import * as TelegramBot from 'node-telegram-bot-api'; // works after installing types
import { ConfigService } from '@nestjs/config';
import EnvironmentVariables from 'src/interface/env.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class TelegramService {
  private readonly bot: TelegramBot; // works after installing types
  private logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService<EnvironmentVariables>,
    private userService: UserService,
  ) {
    console.log('Initializing WeatherFatherBot...');
    const telegram_token = this.configService.get('TELEGRAM_TOKEN', {
      infer: true,
    });
    this.bot = new TelegramBot(telegram_token, { polling: true });

    this.handleReceiceMessage = this.handleReceiceMessage.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleSubscribe = this.handleSubscribe.bind(this);
    this.handleUnsubscribe = this.handleUnsubscribe.bind(this);
    this.handleSetCity = this.handleSetCity.bind(this);

    // Set up the bot event listeners with the bound methods
    console.log('Bot:', this.bot);
    console.log('Setting up bot event listeners...');
    this.bot.on('message', this.handleReceiceMessage);
    this.bot.onText(/\/start/, this.handleStart);
    this.bot.onText(/\/subscribe/, this.handleSubscribe);
    this.bot.onText(/\/unsubscribe/, this.handleUnsubscribe);
    this.bot.onText(/\/setcity (.+)/, this.handleSetCity);
    this.bot.on('polling_error', (error) => {
      this.logger.error('Polling error occurred:', error.message);
      // Handle the error as needed, e.g., retry or take corrective actions
    });
  }

  handleReceiceMessage = (msg: any) => {
    this.logger.debug(msg);
  };

  handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    console.log('bot', this.bot);
    this.bot.sendMessage(chatId, 'Welcome to WeatherFatherBot');
  }

  async handleSubscribe(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      const user = await this.userService.subscribeUser(telegramId);
      if (user) {
        this.bot.sendMessage(
          chatId,
          'You are now subscribed to daily weather updates.',
        );
      } else {
        this.bot.sendMessage(
          chatId,
          'You are already subscribed to daily weather updates.',
        );
      }
    } catch (error) {
      this.bot.sendMessage(
        chatId,
        'Failed to subscribe. Please try again later.',
      );
    }
  }

  async handleUnsubscribe(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      const user = await this.userService.unsubscribeUser(telegramId);
      if (user) {
        this.bot.sendMessage(
          chatId,
          'You are now unsubscribed from daily weather updates.',
        );
      } else {
        this.bot.sendMessage(
          chatId,
          'You are already unsubscribed from daily weather updates.',
        );
      }
    } catch (error) {
      this.bot.sendMessage(
        chatId,
        'Failed to unsubscribe. Please try again later.',
      );
    }
  }

  async handleSetCity(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const city = match[1];

    try {
      await this.userService.setPreferredCity(telegramId, city);
      this.bot.sendMessage(
        chatId,
        `Your preferred city has been set to ${city}.`,
      );
    } catch (error) {
      this.bot.sendMessage(
        chatId,
        'Failed to set your preferred city. Please try again later.',
      );
    }
  }
}
