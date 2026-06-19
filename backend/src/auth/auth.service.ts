import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private createEmailVerification() {
    return {
      token: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  private async sendVerificationEmail(user: {
    email: string;
    fullName?: string | null;
    emailVerificationToken?: string | null;
  }, throwOnError = false) {
    if (!user.emailVerificationToken) {
      return;
    }

    try {
      await this.mailService.sendEmailVerificationEmail({
        to: user.email,
        name: user.fullName || user.email,
        verificationUrl: `${this.getFrontendUrl()}/verify-email?token=${user.emailVerificationToken}`,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar correo de verificacion a ${user.email}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (throwOnError) {
        throw new BadRequestException(
          'No se pudo enviar el correo de verificacion',
        );
      }
    }
  }

  private async buildAuthResponse(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        interests: user.interests,
        emailVerifiedAt: user.emailVerifiedAt,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      if (!existingUser.emailVerifiedAt) {
        return {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          requiresEmailVerification: true,
          message:
            'Esta cuenta ya existe pero aun no esta verificada. Revisa tu correo o solicita un nuevo enlace.',
        };
      }

      throw new ConflictException('El correo ya esta registrado');
    }

    if (!this.mailService.isConfigured()) {
      throw new BadRequestException(
        'Correo no configurado. Agrega RESEND_API_KEY en backend/.env y reinicia el backend.',
      );
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const verification = this.createEmailVerification();

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: registerDto.fullName,
        interests: registerDto.interests || null,
        emailVerificationToken: verification.token,
        emailVerificationExpiresAt: verification.expiresAt,
        passwordHash,
        role: 'CLIENT',
      },
      include: {
        profile: {
          include: {
            category: true,
          },
        },
      },
    });

    await this.sendVerificationEmail(user, true);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      interests: user.interests,
      role: user.role,
      profile: user.profile,
      message:
        'Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesion.',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Debes verificar tu correo antes de iniciar sesion',
      );
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Esta cuenta esta suspendida');
    }

    return this.buildAuthResponse(user.id);
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Token de verificacion requerido');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Token de verificacion invalido');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('El enlace de verificacion vencio');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      verified: true,
      message: 'Correo verificado correctamente',
    };
  }

  async resendVerificationEmail(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new BadRequestException('Correo requerido');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return {
        message:
          'Si el correo existe, enviaremos un nuevo enlace de verificacion.',
      };
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Este correo ya esta verificado. Puedes iniciar sesion.',
      };
    }

    if (!this.mailService.isConfigured()) {
      throw new BadRequestException(
        'Correo no configurado. Agrega RESEND_API_KEY en backend/.env y reinicia el backend.',
      );
    }

    const verification = this.createEmailVerification();
    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerificationToken: verification.token,
        emailVerificationExpiresAt: verification.expiresAt,
      },
    });

    await this.sendVerificationEmail(updatedUser, true);

    return {
      message: `Correo de verificacion enviado a ${updatedUser.email}.`,
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: {
          include: {
            category: true,
            portfolioItems: {
              orderBy: {
                createdAt: 'desc',
              },
              include: {
                assets: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      interests: user.interests,
      emailVerifiedAt: user.emailVerifiedAt,
      role: user.role,
      profile: user.profile,
    };
  }
}
