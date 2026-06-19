import { Module } from '@nestjs/common';
import { ArtistsModule } from './artists/artists.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AuthModule } from './auth/auth.module';
import { ArtistCategoriesModule } from './artist-categories/artist-categories.module';
import { UploadsModule } from './uploads/uploads.module';
import { CommissionsModule } from './commissions/commissions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { JobPostsModule } from './job-posts/job-posts.module';
import { DigitalProductsModule } from './digital-products/digital-products.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ArtistsModule,
    PortfolioModule,
    AuthModule,
    ArtistCategoriesModule,
    UploadsModule,
    CommissionsModule,
    NotificationsModule,
    PaymentsModule,
    ReviewsModule,
    JobPostsModule,
    DigitalProductsModule,
    AdminModule,
  ],
})
export class AppModule {}
