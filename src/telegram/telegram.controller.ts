import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post()
  handleWebhook(@Req() req: Request, @Res() res: Response) {
    // Feed the update from the webhook to the bot
    this.telegramService.processUpdate(req.body);
    res.status(200).send('OK');
  }
}
