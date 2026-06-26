import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  private readonly digitalProductExtensions = new Set([
    '.pdf',
    '.zip',
    '.rar',
    '.7z',
    '.abr',
    '.psd',
    '.ai',
    '.eps',
    '.svg',
    '.mxl',
    '.musicxml',
    '.mid',
    '.midi',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff',
    '.webp',
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
  ]);

  private ensureFile(file: Express.Multer.File | undefined, message: string) {
    if (!file) {
      throw new BadRequestException(message);
    }

    return file;
  }

  private ensureMaxSize(file: Express.Multer.File, maxSize: number, message: string) {
    if (file.size > maxSize) {
      throw new BadRequestException(message);
    }
  }

  private getFileExtension(file: Express.Multer.File) {
    const name = file.originalname.toLowerCase();
    const dotIndex = name.lastIndexOf('.');

    return dotIndex >= 0 ? name.slice(dotIndex) : '';
  }

  private isDigitalProductFile(file: Express.Multer.File) {
    return (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-rar-compressed' ||
      file.mimetype === 'application/vnd.rar' ||
      file.mimetype === 'application/x-7z-compressed' ||
      this.digitalProductExtensions.has(this.getFileExtension(file))
    );
  }

  private toUploadResponse(file: Express.Multer.File, result: {
    secure_url: string;
    public_id: string;
    resource_type?: string;
    type?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }) {
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      deliveryType: result.type,
      name: file.originalname,
      mimeType: file.mimetype,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes || file.size,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const upload = this.ensureFile(file, 'Debes enviar una imagen');

    if (!upload.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    return this.toUploadResponse(
      upload,
      await this.cloudinaryService.uploadImage(upload.buffer),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const upload = this.ensureFile(file, 'Debes enviar un archivo');
    this.ensureMaxSize(
      upload,
      15 * 1024 * 1024,
      'El archivo no puede superar 15 MB',
    );

    return this.toUploadResponse(
      upload,
      await this.cloudinaryService.uploadFile(upload.buffer),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('portfolio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPortfolioFile(@UploadedFile() file: Express.Multer.File) {
    const upload = this.ensureFile(file, 'Debes enviar un archivo de portafolio');
    this.ensureMaxSize(
      upload,
      50 * 1024 * 1024,
      'El archivo de portafolio no puede superar 50 MB',
    );

    if (
      !upload.mimetype.startsWith('image/') &&
      !upload.mimetype.startsWith('video/') &&
      upload.mimetype !== 'application/pdf'
    ) {
      throw new BadRequestException('El portafolio acepta imagenes, videos o PDF');
    }

    return this.toUploadResponse(
      upload,
      await this.cloudinaryService.uploadFile(upload.buffer, 'atrium/portfolio'),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('commission-final')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCommissionFinalFile(@UploadedFile() file: Express.Multer.File) {
    const upload = this.ensureFile(file, 'Debes enviar un archivo final');
    this.ensureMaxSize(
      upload,
      50 * 1024 * 1024,
      'El archivo final no puede superar 50 MB',
    );

    return this.toUploadResponse(
      upload,
      await this.cloudinaryService.uploadFile(
        upload.buffer,
        'atrium/commission-finals',
        { authenticated: true },
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('digital-product')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDigitalProductFile(@UploadedFile() file: Express.Multer.File) {
    const upload = this.ensureFile(file, 'Debes enviar un archivo digital');
    this.ensureMaxSize(
      upload,
      100 * 1024 * 1024,
      'El archivo digital no puede superar 100 MB',
    );

    if (!this.isDigitalProductFile(upload)) {
      throw new BadRequestException(
        'El producto digital acepta imagenes, videos, PDF o paquetes descargables',
      );
    }

    return this.toUploadResponse(
      upload,
      await this.cloudinaryService.uploadFile(
        upload.buffer,
        'atrium/digital-products',
        { authenticated: true, resourceType: 'raw' },
      ),
    );
  }
}
