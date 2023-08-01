import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('subscribe')
  async subscribeUser(@Body('telegramId') telegramId: number) {
    return this.userService.subscribeUser(telegramId);
  }

  @Post('unsubscribe')
  async unsubscribeUser(@Body('telegramId') telegramId: number) {
    return this.userService.unsubscribeUser(telegramId);
  }

  @Post('setcity')
  async setPreferredCity(
    @Body('telegramId') telegramId: number,
    @Body('city') city: string,
  ) {
    return this.userService.setPreferredCity(telegramId, city);
  }
}
