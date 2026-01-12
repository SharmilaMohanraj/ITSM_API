import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Ticket } from './entities/ticket.entity';
import { Team } from './entities/team.entity';
import { Comment } from './entities/comment.entity';
import { Attachment } from './entities/attachment.entity';
import { TicketHistory } from './entities/ticket-history.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'itsm_db',
      entities: [User, Ticket, Team, Comment, Attachment, TicketHistory],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    AuthModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

