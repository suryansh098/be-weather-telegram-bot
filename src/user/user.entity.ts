import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entity representing a user in the system.
 * Stores user information including Telegram ID, subscription status, and preferred city.
 */
@Entity()
export class User {
  /**
   * The unique identifier for the user. Automatically generated.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The unique Telegram ID of the user.
   * This value must be unique for each user.
   */
  @Column({ unique: true })
  telegramId: number;

  /**
   * Indicates whether the user is subscribed to daily updates.
   * A boolean value where true means subscribed and false means not subscribed.
   */
  @Column()
  isSubscribed: boolean;

  /**
   * The user's preferred city for weather updates.
   * This value can be null if the user has not set a preferred city.
   */
  @Column({ nullable: true })
  preferredCity: string;
}
