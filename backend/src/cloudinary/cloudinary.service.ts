import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    buffer: Buffer,
    folder = 'atrium/uploads',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException('No se pudo subir la imagen'),
            );
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  async uploadFile(
    buffer: Buffer,
    folder = 'atrium/commission-files',
    options: { authenticated?: boolean; resourceType?: 'auto' | 'raw' } = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: options.resourceType || 'auto',
          type: options.authenticated ? 'authenticated' : 'upload',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException('No se pudo subir el archivo'),
            );
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  createWatermarkedImageUrl(publicId: string, deliveryType = 'upload') {
    return cloudinary.url(publicId, {
      resource_type: 'image',
      type: deliveryType,
      secure: true,
      sign_url: deliveryType === 'authenticated',
      transformation: [
        {
          overlay: {
            font_family: 'Arial',
            font_size: 56,
            font_weight: 'bold',
            text: 'ATRIUM PREVIEW',
          },
          color: 'white',
          opacity: 45,
          gravity: 'center',
          flags: 'relative',
          width: 0.85,
        },
      ],
    });
  }

  createSignedDownloadUrl(input: {
    publicId: string;
    resourceType?: string | null;
    deliveryType?: string | null;
    attachmentName?: string | null;
  }) {
    const expiresAt = Math.floor(Date.now() / 1000 + 10 * 60);

    return cloudinary.url(input.publicId, {
      resource_type: input.resourceType || 'raw',
      type: input.deliveryType || 'authenticated',
      secure: true,
      sign_url: true,
      expires_at: expiresAt,
      flags: 'attachment',
    });
  }
}
