import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: number;

  @Column()
  isSubscribed: boolean;

  @Column({ nullable: true })
  preferredCity: string;
}
