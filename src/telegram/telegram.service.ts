import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { TEST_USER_ID } from './telegram.constants';
import * as TelegramBot from 'node-telegram-bot-api'; // works after installing types
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import axios from 'axios';
import EnvironmentVariables from 'src/interface/env.interface';
import { UserService } from 'src/user/user.service';

/**
 * Service for managing interactions with the Telegram bot.
 * Handles user subscriptions, city preferences, and sending daily weather updates.
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly bot: TelegramBot; // Telegram bot instance
  private logger = new Logger(TelegramService.name); // Logger instance

  /**
   * Initializes the TelegramService and sets up the bot and cron job.
   * @param configService - Provides configuration variables.
   * @param userService - Provides user-related functionalities.
   */
  constructor(
    private configService: ConfigService<EnvironmentVariables>,
    private userService: UserService,
  ) {
    this.logger.log('Initializing WeatherFatherBot...');
    const telegram_token = this.configService.get('TELEGRAM_TOKEN', {
      infer: true,
    });

    // Initialize the bot with only basic configuration, webhook will be set later
    this.bot = new TelegramBot(telegram_token, { webHook: true });

    this.handleReceiceMessage = this.handleReceiceMessage.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleSubscribe = this.handleSubscribe.bind(this);
    this.handleUnsubscribe = this.handleUnsubscribe.bind(this);
    this.handleSetCity = this.handleSetCity.bind(this);

    this.logger.log('Setting up bot event listeners...');

    // Setup bot event listeners
    this.bot.on('message', this.handleReceiceMessage);
    this.bot.onText(/\/start/, this.handleStart);
    this.bot.onText(/\/subscribe/, this.handleSubscribe);
    this.bot.onText(/\/unsubscribe/, this.handleUnsubscribe);
    this.bot.onText(/\/setcity (.+)/, this.handleSetCity);

    // Setup the cron job to run daily at 8:00 AM
    this.setupCronJob();
  }

  async onModuleInit() {
    const webhookUrl = `${this.configService.get('APP_URL')}/telegram-webhook`;

    this.logger.log(`Setting webhook to ${webhookUrl}...`);
    await this.bot.setWebHook(webhookUrl);
  }

  // Public method to process updates
  public processUpdate(update: TelegramBot.Update) {
    this.bot.processUpdate(update);
  }

  /**
   * Logs received messages for debugging purposes.
   * @param msg - The received message.
   */
  private handleReceiceMessage = (msg: any) => {
    this.logger.debug(msg);
  };

  /**
   * Handles the /start command. Sends a welcome message to the user.
   * @param msg - The message containing the /start command.
   */
  private handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    console.log('bot', this.bot);
    this.bot.sendMessage(chatId, 'Welcome to WeatherFatherBot');
  }

  /**
   * Handles the /subscribe command. Subscribes the user to daily weather updates.
   * @param msg - The message containing the /subscribe command.
   */
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

  /**
   * Handles the /unsubscribe command. Unsubscribes the user from daily weather updates.
   * @param msg - The message containing the /unsubscribe command.
   */
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

  /**
   * Handles the /setcity command. Sets the user's preferred city for weather updates.
   * @param msg - The message containing the /setcity command.
   * @param match - The result of the regex match containing the city name.
   */
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

  /**
   * Fetches the current weather data for a specified city.
   * @param city - The name of the city.
   * @returns A string describing the weather in the city.
   */
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

  /**
   * Sends daily weather updates to all subscribed users with a preferred city.
   */
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

  /**
   * Sets up a cron job to run the daily weather update at 8 AM daily.
   */
  private setupCronJob() {
    // Set up the cron job to run daily at 8 AM
    cron.schedule('* * * * *', async () => {
      this.logger.debug('Running daily weather update cron job...');
      await this.sendDailyWeatherUpdate();
    });
  }
}
