import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

/**
 * Controller for managing user-related operations.
 * Provides endpoints for subscribing, unsubscribing, and setting a preferred city for users.
 */
@Controller('users')
export class UserController {
  /**
   * Initializes the UserController with the user service.
   * @param userService - The service for managing user operations.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint to subscribe a user with the provided Telegram ID to daily updates.
   * @param telegramId - The Telegram ID of the user to subscribe.
   * @returns The subscribed user.
   */
  @Post('subscribe')
  async subscribeUser(@Body('telegramId') telegramId: number) {
    return this.userService.subscribeUser(telegramId);
  }

  /**
   * Endpoint to unsubscribe a user with the provided Telegram ID from daily updates.
   * @param telegramId - The Telegram ID of the user to unsubscribe.
   * @returns The updated user.
   */
  @Post('unsubscribe')
  async unsubscribeUser(@Body('telegramId') telegramId: number) {
    return this.userService.unsubscribeUser(telegramId);
  }

  /**
   * Endpoint to set the preferred city for a user with the provided Telegram ID.
   * @param telegramId - The Telegram ID of the user.
   * @param city - The preferred city to set for the user.
   * @returns The updated user with the new preferred city.
   */
  @Post('setcity')
  async setPreferredCity(
    @Body('telegramId') telegramId: number,
    @Body('city') city: string,
  ) {
    return this.userService.setPreferredCity(telegramId, city);
  }
}
