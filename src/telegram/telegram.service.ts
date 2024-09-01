import { Injectable, Logger } from '@nestjs/common';
// import { TEST_USER_ID } from './telegram.constants';
import * as TelegramBot from 'node-telegram-bot-api'; // works after installing types
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import axios from 'axios';
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
    this.logger.log('Initializing WeatherFatherBot...');
    const telegram_token = this.configService.get('TELEGRAM_TOKEN', {
      infer: true,
    });
    this.bot = new TelegramBot(telegram_token, { polling: true });

    this.handleReceiceMessage = this.handleReceiceMessage.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleSubscribe = this.handleSubscribe.bind(this);
    this.handleUnsubscribe = this.handleUnsubscribe.bind(this);
    this.handleSetCity = this.handleSetCity.bind(this);

    this.logger.log(`Setting up event listeners for the bot...`);

    // receive message and log errors
    this.bot.on('message', this.handleReceiceMessage);
    this.bot.on('polling_error', (error) => {
      this.logger.error('Polling error occurred:', error.message);
      // Handle the error as needed, e.g., retry or take corrective actions
    });

    // Setup bot event listeners
    this.bot.onText(/\/start/, this.handleStart);
    this.bot.onText(/\/subscribe/, this.handleSubscribe);
    this.bot.onText(/\/unsubscribe/, this.handleUnsubscribe);
    this.bot.onText(/\/setcity (.+)/, this.handleSetCity);

    // Setup the cron job
    this.setupCronJob();
  }

  private handleReceiceMessage = (msg: any) => {
    this.logger.debug(msg);
  };

  private handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    console.log('bot', this.bot);
    this.bot.sendMessage(chatId, 'Welcome to WeatherFatherBot');
  }

  private async handleSubscribe(msg: TelegramBot.Message) {
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

  private async handleUnsubscribe(msg: TelegramBot.Message) {
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

  private async handleSetCity(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
  ) {
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

  async fetchWeatherDataForCity(city: string): Promise<string> {
    const apiKey = this.configService.get('WEATHER_API_KEY');

    try {
      const response = await axios.get(
        `https://api.weatherbit.io/v2.0/current?city=${encodeURIComponent(
          city,
        )}&key=${apiKey}`,
      );
      const data = response.data;
      return `The weather in ${city} is ${data.data[0].weather.description} with a temperature of ${data.data[0].temp}°C.`;
    } catch (error) {
      console.error(`Failed to fetch weather data: ${error.message}`);
      return 'Failed to fetch weather data. Please try again later.';
    }
  }

  private async sendDailyWeatherUpdate() {
    this.logger.log('>>>>> Sending weather update...');
    try {
      // Get a list of all subscribed users with a preferred city
      const subscribedUsers =
        await this.userService.getAllSubscribedUsersWithPreferredCity();

      // Send the weather update to each subscribed user
      for (const user of subscribedUsers) {
        // Fetch weather data for the user's preferred city
        const weatherData = await this.fetchWeatherDataForCity(
          user.preferredCity,
        );

        // Send the weather update to the user
        this.bot.sendMessage(user.telegramId, weatherData);
      }

      this.logger.log('Daily weather update sent to all subscribed users.');
    } catch (error) {
      this.logger.error('Failed to send daily weather update:', error);
    }
  }

  private setupCronJob() {
    // Set up the cron job to run daily at 9:30 PM
    cron.schedule('* * * * *', async () => {
      this.logger.debug('Running daily weather update cron job...');
      await this.sendDailyWeatherUpdate();
    });
  }
}
