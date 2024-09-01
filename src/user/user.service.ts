// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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

  async unsubscribeUser(telegramId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user) {
      user.isSubscribed = false;
      await this.userRepository.save(user);
    }
    return user;
  }

  async setPreferredCity(telegramId: number, city: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (user) {
      user.preferredCity = city;
      await this.userRepository.save(user);
    }
    return user;
  }

  async getAllSubscribedUsersWithPreferredCity(): Promise<User[]> {
    return this.userRepository.find({
      where: {
        isSubscribed: true,
        preferredCity: Not(''),
      },
    });
  }
}
