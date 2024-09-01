import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './user.entity';

/**
 * Service for managing user subscriptions and city preferences.
 * Provides methods for subscribing, unsubscribing, setting preferred cities,
 * and retrieving subscribed users with a preferred city.
 */
@Injectable()
export class UserService {
  /**
   * Initializes the UserService with the user repository.
   * @param userRepository - The repository for interacting with User entities.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Subscribes a user with a given Telegram ID to daily updates.
   * If the user does not exist, creates a new user and subscribes them.
   * @param telegramId - The Telegram ID of the user.
   * @returns The updated or newly created user.
   */
  async subscribeUser(telegramId: number): Promise<User> {
    let user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      user = this.userRepository.create({ telegramId, isSubscribed: true });
      await this.userRepository.save(user);
    } else {
      user.isSubscribed = true;
      await this.userRepository.save(user);
    }
    return user;
  }

  /**
   * Unsubscribes a user with a given Telegram ID from daily updates.
   * @param telegramId - The Telegram ID of the user.
   * @returns The updated user.
   */
  async unsubscribeUser(telegramId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user) {
      user.isSubscribed = false;
      await this.userRepository.save(user);
    }
    return user;
  }

  /**
   * Sets the preferred city for a user with a given Telegram ID.
   * @param telegramId - The Telegram ID of the user.
   * @param city - The preferred city to set.
   * @returns The updated user.
   */
  async setPreferredCity(telegramId: number, city: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user) {
      user.preferredCity = city;
      await this.userRepository.save(user);
    }
    return user;
  }

  /**
   * Retrieves all users who are subscribed and have a preferred city set.
   * @returns An array of subscribed users with a preferred city.
   */
  async getAllSubscribedUsersWithPreferredCity(): Promise<User[]> {
    return this.userRepository.find({
      where: {
        isSubscribed: true,
        preferredCity: Not(''),
      },
    });
  }
}
