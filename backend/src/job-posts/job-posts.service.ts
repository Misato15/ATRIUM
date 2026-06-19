import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  JobApplicationStatus,
  JobPostStatus,
} from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { CreateJobPostDto } from './dto/create-job-post.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';

const ACCEPTING_APPLICATION_STATUSES: JobPostStatus[] = [
  JobPostStatus.OPEN,
  JobPostStatus.IN_REVIEW,
];
const EDITABLE_JOB_POST_STATUSES = [
  JobPostStatus.OPEN,
  JobPostStatus.IN_REVIEW,
  JobPostStatus.PAUSED,
  JobPostStatus.CLOSED,
] as readonly string[];
const APPLICATION_DECISION_STATUSES = [
  JobApplicationStatus.SHORTLISTED,
  JobApplicationStatus.ACCEPTED,
  JobApplicationStatus.REJECTED,
] as readonly string[];
const VALID_SERVICE_MODES = ['ONLINE', 'IN_PERSON', 'BOTH'] as const;

function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

function parseDeadlineDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const [, year, month, day] = match;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function parseBudgetAmount(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const normalizedValue = value.replace(/[^\d.]/g, '');

  if (!normalizedValue) {
    return null;
  }

  const amount = Number(normalizedValue);

  return Number.isNaN(amount) ? null : amount;
}

function validateBudgetRange(budgetMin?: string | null, budgetMax?: string | null) {
  const min = parseBudgetAmount(budgetMin);
  const max = parseBudgetAmount(budgetMax);

  if (budgetMin?.trim() && min === null) {
    throw new BadRequestException('El presupuesto minimo debe ser numerico');
  }

  if (budgetMax?.trim() && max === null) {
    throw new BadRequestException('El presupuesto maximo debe ser numerico');
  }

  if (min !== null && max !== null && max < min) {
    throw new BadRequestException(
      'El presupuesto maximo no puede ser menor que el minimo',
    );
  }
}

function validateAmount(value: string, message: string) {
  if (parseBudgetAmount(value) === null) {
    throw new BadRequestException(message);
  }
}

@Injectable()
export class JobPostsService {
  private readonly logger = new Logger(JobPostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(userId: number, createJobPostDto: CreateJobPostDto) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!clientUser) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const title = createJobPostDto.title?.trim();
    const description = createJobPostDto.description?.trim();

    if (!title || !description) {
      throw new BadRequestException('La oferta necesita titulo y descripcion');
    }

    validateBudgetRange(createJobPostDto.budgetMin, createJobPostDto.budgetMax);
    const categoryId = await this.resolveCategoryId(createJobPostDto.categoryId);

    const desiredDeadline = parseDeadlineDate(createJobPostDto.desiredDeadline);

    if (desiredDeadline && Number.isNaN(desiredDeadline.getTime())) {
      throw new BadRequestException('La fecha de entrega no es valida');
    }

    if (desiredDeadline && isPastDate(desiredDeadline)) {
      throw new BadRequestException(
        'La fecha de entrega no puede estar en el pasado',
      );
    }

    if (
      createJobPostDto.serviceMode &&
      !VALID_SERVICE_MODES.includes(createJobPostDto.serviceMode)
    ) {
      throw new BadRequestException('La modalidad no es valida');
    }

    const serviceMode = createJobPostDto.serviceMode || null;

    return this.prisma.jobPost.create({
      data: {
        clientUserId: userId,
        title,
        description,
        categoryId,
        budgetMin: createJobPostDto.budgetMin?.trim() || null,
        budgetMax: createJobPostDto.budgetMax?.trim() || null,
        desiredDeadline,
        isFlexibleDeadline: Boolean(createJobPostDto.isFlexibleDeadline),
        serviceMode,
        location: createJobPostDto.location?.trim() || null,
      },
      include: this.getJobPostInclude(),
    });
  }

  async update(userId: number, jobPostId: number, updateJobPostDto: UpdateJobPostDto) {
    const jobPost = await this.findOwnedJobPost(userId, jobPostId);

    if (jobPost.status === JobPostStatus.ASSIGNED) {
      throw new ConflictException('No puedes editar una oferta ya asignada');
    }

    const title = updateJobPostDto.title?.trim();
    const description = updateJobPostDto.description?.trim();

    if (updateJobPostDto.title !== undefined && !title) {
      throw new BadRequestException('La oferta necesita titulo');
    }

    if (updateJobPostDto.description !== undefined && !description) {
      throw new BadRequestException('La oferta necesita descripcion');
    }

    const budgetMin =
      updateJobPostDto.budgetMin !== undefined
        ? updateJobPostDto.budgetMin
        : jobPost.budgetMin;
    const budgetMax =
      updateJobPostDto.budgetMax !== undefined
        ? updateJobPostDto.budgetMax
        : jobPost.budgetMax;

    validateBudgetRange(budgetMin, budgetMax);
    const categoryId =
      updateJobPostDto.categoryId !== undefined
        ? await this.resolveCategoryId(updateJobPostDto.categoryId)
        : undefined;

    const desiredDeadline =
      updateJobPostDto.desiredDeadline === undefined
        ? undefined
        : updateJobPostDto.desiredDeadline
          ? parseDeadlineDate(updateJobPostDto.desiredDeadline)
          : null;

    if (desiredDeadline && Number.isNaN(desiredDeadline.getTime())) {
      throw new BadRequestException('La fecha de entrega no es valida');
    }

    if (desiredDeadline && isPastDate(desiredDeadline)) {
      throw new BadRequestException(
        'La fecha de entrega no puede estar en el pasado',
      );
    }

    if (
      updateJobPostDto.serviceMode &&
      !VALID_SERVICE_MODES.includes(updateJobPostDto.serviceMode)
    ) {
      throw new BadRequestException('La modalidad no es valida');
    }

    const serviceMode =
      updateJobPostDto.serviceMode === undefined
        ? undefined
        : updateJobPostDto.serviceMode || null;

    return this.prisma.jobPost.update({
      where: {
        id: jobPostId,
      },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(updateJobPostDto.budgetMin !== undefined
          ? { budgetMin: budgetMin?.trim() || null }
          : {}),
        ...(updateJobPostDto.budgetMax !== undefined
          ? { budgetMax: budgetMax?.trim() || null }
          : {}),
        ...(desiredDeadline !== undefined ? { desiredDeadline } : {}),
        ...(updateJobPostDto.isFlexibleDeadline !== undefined
          ? { isFlexibleDeadline: Boolean(updateJobPostDto.isFlexibleDeadline) }
          : {}),
        ...(serviceMode !== undefined ? { serviceMode } : {}),
        ...(updateJobPostDto.location !== undefined
          ? { location: updateJobPostDto.location?.trim() || null }
          : {}),
      },
      include: this.getJobPostInclude(),
    });
  }

  async updateStatus(
    userId: number,
    jobPostId: number,
    status: 'OPEN' | 'IN_REVIEW' | 'PAUSED' | 'CLOSED',
  ) {
    if (!EDITABLE_JOB_POST_STATUSES.includes(status)) {
      throw new BadRequestException('El estado de la oferta no es valido');
    }

    const jobPost = await this.findOwnedJobPost(userId, jobPostId);

    if (jobPost.status === JobPostStatus.ASSIGNED) {
      throw new ConflictException('No puedes cambiar una oferta ya asignada');
    }

    return this.prisma.jobPost.update({
      where: {
        id: jobPostId,
      },
      data: {
        status,
      },
      include: this.getJobPostInclude(),
    });
  }

  findOpen() {
    return this.prisma.jobPost.findMany({
      where: {
        status: {
          in: ACCEPTING_APPLICATION_STATUSES,
        },
      },
      include: {
        ...this.getJobPostInclude(),
        _count: {
          select: {
            applications: {
              where: {
                status: {
                  not: JobApplicationStatus.WITHDRAWN,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findMine(userId: number) {
    return this.prisma.jobPost.findMany({
      where: {
        clientUserId: userId,
      },
      include: {
        ...this.getJobPostInclude(),
        applications: {
          include: this.getApplicationInclude(),
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findMyApplications(userId: number) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new ForbiddenException('Este usuario no tiene perfil de artista');
    }

    return this.prisma.jobApplication.findMany({
      where: {
        artistProfileId: profile.id,
      },
      include: {
        jobPost: {
          include: this.getJobPostInclude(),
        },
        commissionRequest: {
          select: {
            id: true,
            status: true,
            quotedPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async apply(
    userId: number,
    jobPostId: number,
    createJobApplicationDto: CreateJobApplicationDto,
  ) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        fullName: true,
        artistName: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!profile) {
      throw new ForbiddenException('Necesitas un perfil de artista para aplicar');
    }

    const jobPost = await this.prisma.jobPost.findUnique({
      where: {
        id: jobPostId,
      },
      include: {
        clientUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!jobPost) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (jobPost.clientUserId === userId) {
      throw new BadRequestException('No puedes aplicar a tu propia oferta');
    }

    if (!ACCEPTING_APPLICATION_STATUSES.includes(jobPost.status)) {
      throw new ConflictException('Esta oferta ya no recibe aplicaciones');
    }

    const message = createJobApplicationDto.message?.trim();
    const proposedPrice = createJobApplicationDto.proposedPrice?.trim();

    if (!message || !proposedPrice) {
      throw new BadRequestException(
        'La aplicacion necesita mensaje y precio propuesto',
      );
    }

    validateAmount(proposedPrice, 'El precio propuesto debe ser numerico');

    const existingApplication = await this.prisma.jobApplication.findUnique({
      where: {
        jobPostId_artistProfileId: {
          jobPostId,
          artistProfileId: profile.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (
      existingApplication &&
      existingApplication.status !== JobApplicationStatus.WITHDRAWN
    ) {
      throw new ConflictException('Ya aplicaste a esta oferta');
    }

    const application = await this.prisma.$transaction(async (transaction) => {
      const application = existingApplication
        ? await transaction.jobApplication.update({
            where: {
              id: existingApplication.id,
            },
            data: {
              message,
              proposedPrice,
              estimatedTimeline:
                createJobApplicationDto.estimatedTimeline?.trim() || null,
              portfolioLinks:
                createJobApplicationDto.portfolioLinks?.trim() || null,
              status: JobApplicationStatus.PENDING,
            },
            include: this.getApplicationInclude(),
          })
        : await transaction.jobApplication.create({
            data: {
              jobPostId,
              artistProfileId: profile.id,
              message,
              proposedPrice,
              estimatedTimeline:
                createJobApplicationDto.estimatedTimeline?.trim() || null,
              portfolioLinks:
                createJobApplicationDto.portfolioLinks?.trim() || null,
            },
            include: this.getApplicationInclude(),
          });

      if (jobPost.status === JobPostStatus.OPEN) {
        await transaction.jobPost.update({
          where: {
            id: jobPostId,
          },
          data: {
            status: JobPostStatus.IN_REVIEW,
          },
        });
      }

      await transaction.notification.create({
        data: {
          userId: jobPost.clientUserId,
          type: 'MESSAGE',
          title: existingApplication
            ? 'Aplicacion reenviada a tu oferta'
            : 'Nueva aplicacion a tu oferta',
          message: `${profile.artistName || profile.fullName || 'Un artista'} ${existingApplication ? 'volvio a aplicar' : 'aplico'} a "${jobPost.title}".`,
          relatedEntityId: jobPost.id,
        },
      });

      return application;
    });

    await this.mailService
      .sendJobApplicationEmail({
        to: jobPost.clientUser.email,
        clientName:
          jobPost.clientUser.fullName || jobPost.clientUser.email || 'cliente',
        artistName: profile.artistName || profile.fullName || 'Un artista',
        jobTitle: jobPost.title,
        proposedPrice,
        message,
      })
      .catch((error: Error) => {
        this.logger.warn(
          `No se pudo enviar correo de aplicacion: ${error.message}`,
        );
      });

    return application;
  }

  async updateApplicationStatus(
    userId: number,
    applicationId: number,
    status: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED',
  ) {
    if (!APPLICATION_DECISION_STATUSES.includes(status)) {
      throw new BadRequestException('El estado de la aplicacion no es valido');
    }

    const application = await this.prisma.jobApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        artistProfile: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            artistName: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        jobPost: {
          include: {
            clientUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Aplicacion no encontrada');
    }

    if (application.jobPost.clientUserId !== userId) {
      throw new ForbiddenException('No puedes modificar esta aplicacion');
    }

    if (application.status === JobApplicationStatus.ACCEPTED) {
      throw new ConflictException('Esta aplicacion ya fue aceptada');
    }

    if (
      application.status !== JobApplicationStatus.PENDING &&
      application.status !== JobApplicationStatus.SHORTLISTED
    ) {
      throw new ConflictException('Esta aplicacion ya no se puede modificar');
    }

    if (status !== 'ACCEPTED') {
      const title =
        status === JobApplicationStatus.SHORTLISTED
          ? 'Tu aplicacion fue preseleccionada'
          : 'Tu aplicacion fue rechazada';
      const message =
        status === JobApplicationStatus.SHORTLISTED
          ? `Tu propuesta para "${application.jobPost.title}" fue preseleccionada.`
          : `Tu propuesta para "${application.jobPost.title}" fue rechazada.`;

      const updatedApplication = await this.prisma.$transaction(async (transaction) => {
        const updatedApplication = await transaction.jobApplication.update({
          where: {
            id: applicationId,
          },
          data: {
            status,
          },
          include: this.getApplicationInclude(),
        });

        await transaction.notification.create({
          data: {
            userId: application.artistProfile.userId,
            type: 'MESSAGE',
            title,
            message,
            relatedEntityId: application.jobPost.id,
          },
        });

        return updatedApplication;
      });

      await this.mailService
        .sendJobApplicationDecisionEmail({
          to: application.artistProfile.user.email,
          artistName:
            application.artistProfile.artistName ||
            application.artistProfile.fullName ||
            'artista',
          jobTitle: application.jobPost.title,
          decision: status,
        })
        .catch((error: Error) => {
          this.logger.warn(
            `No se pudo enviar correo de decision de aplicacion: ${error.message}`,
          );
        });

      return updatedApplication;
    }

    if (!ACCEPTING_APPLICATION_STATUSES.includes(application.jobPost.status)) {
      throw new ConflictException('Esta oferta ya fue asignada o cerrada');
    }

    const clientName =
      application.jobPost.clientUser.fullName ||
      application.jobPost.clientUser.email;
    const artistDisplayName =
      application.artistProfile.artistName ||
      application.artistProfile.fullName ||
      'el artista';

    const acceptedApplication = await this.prisma.$transaction(async (transaction) => {
      const commissionRequest = await transaction.commissionRequest.create({
        data: {
          artistProfileId: application.artistProfile.id,
          clientUserId: application.jobPost.clientUserId,
          clientName,
          clientEmail: application.jobPost.clientUser.email,
          projectTitle: application.jobPost.title,
          message: `${application.jobPost.description}\n\nPropuesta aceptada de ${artistDisplayName}:\n${application.message}`,
          budget: application.proposedPrice,
          budgetMin: application.jobPost.budgetMin,
          budgetMax: application.jobPost.budgetMax,
          desiredDeadline: application.jobPost.desiredDeadline,
          isFlexibleDeadline: application.jobPost.isFlexibleDeadline,
          serviceMode: application.jobPost.serviceMode,
          artistResponse: application.message,
          quotedPrice: application.proposedPrice,
          status: 'ACCEPTED',
        },
      });

      const updatedApplication = await transaction.jobApplication.update({
        where: {
          id: application.id,
        },
        data: {
          status: JobApplicationStatus.ACCEPTED,
          commissionRequestId: commissionRequest.id,
        },
        include: this.getApplicationInclude(),
      });

      await transaction.jobApplication.updateMany({
        where: {
          jobPostId: application.jobPost.id,
          id: {
            not: application.id,
          },
          status: {
            in: [
              JobApplicationStatus.PENDING,
              JobApplicationStatus.SHORTLISTED,
            ],
          },
        },
        data: {
          status: JobApplicationStatus.REJECTED,
        },
      });

      await transaction.jobPost.update({
        where: {
          id: application.jobPost.id,
        },
        data: {
          status: JobPostStatus.ASSIGNED,
        },
      });

      await transaction.notification.create({
        data: {
          userId: application.artistProfile.userId,
          type: 'COMMISSION_REQUEST',
          title: 'Tu aplicacion fue aceptada',
          message: `${clientName} acepto tu propuesta para "${application.jobPost.title}". Ya puedes generar el pago.`,
          relatedEntityId: commissionRequest.id,
        },
      });

      return {
        ...updatedApplication,
        commissionRequest,
      };
    });

    await this.mailService
      .sendJobApplicationDecisionEmail({
        to: application.artistProfile.user.email,
        artistName:
          application.artistProfile.artistName ||
          application.artistProfile.fullName ||
          'artista',
        jobTitle: application.jobPost.title,
        decision: 'ACCEPTED',
      })
      .catch((error: Error) => {
        this.logger.warn(
          `No se pudo enviar correo de aplicacion aceptada: ${error.message}`,
        );
      });

    return acceptedApplication;
  }

  async withdrawApplication(userId: number, applicationId: number) {
    const application = await this.prisma.jobApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        artistProfile: {
          select: {
            userId: true,
            fullName: true,
            artistName: true,
          },
        },
        jobPost: {
          select: {
            id: true,
            title: true,
            clientUserId: true,
            status: true,
            clientUser: {
              select: {
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Aplicacion no encontrada');
    }

    if (application.artistProfile.userId !== userId) {
      throw new ForbiddenException('No puedes retirar esta aplicacion');
    }

    if (application.status === JobApplicationStatus.ACCEPTED) {
      throw new ConflictException('No puedes retirar una aplicacion aceptada');
    }

    if (application.status === JobApplicationStatus.WITHDRAWN) {
      return application;
    }

    const artistName =
      application.artistProfile.artistName ||
      application.artistProfile.fullName ||
      'Un artista';

    const withdrawnApplication = await this.prisma.$transaction(async (transaction) => {
      const updatedApplication = await transaction.jobApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: JobApplicationStatus.WITHDRAWN,
        },
        include: this.getApplicationInclude(),
      });

      const activeApplications = await transaction.jobApplication.count({
        where: {
          jobPostId: application.jobPost.id,
          status: {
            in: [
              JobApplicationStatus.PENDING,
              JobApplicationStatus.SHORTLISTED,
            ],
          },
        },
      });

      if (
        activeApplications === 0 &&
        application.jobPost.status === JobPostStatus.IN_REVIEW
      ) {
        await transaction.jobPost.update({
          where: {
            id: application.jobPost.id,
          },
          data: {
            status: JobPostStatus.OPEN,
          },
        });
      }

      await transaction.notification.create({
        data: {
          userId: application.jobPost.clientUserId,
          type: 'MESSAGE',
          title: 'Aplicacion retirada',
          message: `${artistName} retiro su aplicacion para "${application.jobPost.title}".`,
          relatedEntityId: application.jobPost.id,
        },
      });

      return updatedApplication;
    });

    await this.mailService
      .sendJobApplicationWithdrawnEmail({
        to: application.jobPost.clientUser.email,
        clientName:
          application.jobPost.clientUser.fullName ||
          application.jobPost.clientUser.email ||
          'cliente',
        artistName,
        jobTitle: application.jobPost.title,
      })
      .catch((error: Error) => {
        this.logger.warn(
          `No se pudo enviar correo de aplicacion retirada: ${error.message}`,
        );
      });

    return withdrawnApplication;
  }

  private getJobPostInclude() {
    return {
      clientUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      category: true,
    };
  }

  private async findOwnedJobPost(userId: number, jobPostId: number) {
    const jobPost = await this.prisma.jobPost.findUnique({
      where: {
        id: jobPostId,
      },
      select: {
        id: true,
        clientUserId: true,
        status: true,
        budgetMin: true,
        budgetMax: true,
      },
    });

    if (!jobPost) {
      throw new NotFoundException('Oferta no encontrada');
    }

    if (jobPost.clientUserId !== userId) {
      throw new ForbiddenException('No puedes modificar esta oferta');
    }

    return jobPost;
  }

  private async resolveCategoryId(categoryId?: number | null) {
    if (!categoryId) {
      return null;
    }

    const category = await this.prisma.artistCategory.findUnique({
      where: {
        id: Number(categoryId),
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new BadRequestException('La categoria no es valida');
    }

    return category.id;
  }

  private getApplicationInclude() {
    return {
      artistProfile: {
        select: {
          id: true,
          fullName: true,
          artistName: true,
          location: true,
          profileImageUrl: true,
        },
      },
      commissionRequest: {
        select: {
          id: true,
          status: true,
          quotedPrice: true,
        },
      },
    };
  }
}
