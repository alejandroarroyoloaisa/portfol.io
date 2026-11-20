import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  forgotPasswordSchema, loginSchema, LoginInput, refreshSchema, registerSchema, RegisterInput, resetPasswordSchema,
} from '@portfolio/schemas';
import { z } from 'zod';
import { Public } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) b: RegisterInput) {
    return this.auth.register(b);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginSchema)) b: LoginInput) {
    return this.auth.login(b);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodPipe(refreshSchema)) b: { refreshToken: string }) {
    return this.auth.refresh(b.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body(new ZodPipe(refreshSchema)) b: { refreshToken: string }) {
    return this.auth.logout(b.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body(new ZodPipe(forgotPasswordSchema)) b: { email: string }) {
    return this.auth.forgotPassword(b.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  reset(@Body(new ZodPipe(resetPasswordSchema)) b: { token: string; password: string }) {
    return this.auth.resetPassword(b.token, b.password);
  }

  @Post('oauth/:provider')
  @HttpCode(200)
  oauth(@Param('provider') provider: 'google' | 'apple', @Body(new ZodPipe(z.object({ idToken: z.string().min(10) }))) b: { idToken: string }) {
    return this.auth.oauth(provider, b.idToken);
  }
}
