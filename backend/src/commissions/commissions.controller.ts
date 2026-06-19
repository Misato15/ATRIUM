import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommissionsService } from './commissions.service';
import { CancelCommissionDto } from './dto/cancel-commission.dto';
import { ClientCommissionResponseDto } from './dto/client-commission-response.dto';
import { CreateCommissionRequestDto } from './dto/create-commission-request.dto';
import { DeliverCommissionDto } from './dto/deliver-commission.dto';
import { OpenCommissionDisputeDto } from './dto/open-commission-dispute.dto';
import { ResolveCommissionDisputeDto } from './dto/resolve-commission-dispute.dto';
import { UpdateCommissionNoteDto } from './dto/update-commission-note.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';
import { UpdateCommissionStatusDto } from './dto/update-commission-status.dto';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('artists/:artistProfileId')
  createForArtist(
    @Param('artistProfileId') artistProfileId: string,
    @Req() request: { user: { userId: number } },
    @Body() createCommissionRequestDto: CreateCommissionRequestDto,
  ) {
    return this.commissionsService.createForArtist(
      Number(artistProfileId),
      request.user.userId,
      createCommissionRequestDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: { user: { userId: number } }) {
    return this.commissionsService.findMine(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('client/me')
  findRequestedByMe(@Req() request: { user: { userId: number } }) {
    return this.commissionsService.findRequestedByClient(request.user.userId);
  }

  @Get('proposals/:id')
  findProposal(@Param('id') id: string) {
    return this.commissionsService.findProposal(Number(id));
  }

  @Patch('proposals/:id/response')
  respondToProposal(
    @Param('id') id: string,
    @Body() clientCommissionResponseDto: ClientCommissionResponseDto,
  ) {
    return this.commissionsService.respondToProposal(
      Number(id),
      clientCommissionResponseDto.decision,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/final-download')
  getFinalDownloadUrl(
    @Param('id') id: string,
    @Query('attachmentId') attachmentId: string | undefined,
    @Req() request: { user: { userId: number } },
  ) {
    return this.commissionsService.getFinalDownloadUrl(
      request.user.userId,
      Number(id),
      attachmentId ? Number(attachmentId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('client/:id/proposal-response')
  respondToProposalAsClient(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() clientCommissionResponseDto: ClientCommissionResponseDto,
  ) {
    return this.commissionsService.respondToProposalAsClient(
      request.user.userId,
      Number(id),
      clientCommissionResponseDto.decision,
    );
  }

  @Get('deliveries/:id')
  findDelivery(@Param('id') id: string) {
    return this.commissionsService.findDelivery(Number(id));
  }

  @Patch('deliveries/:id/response')
  respondToDelivery(
    @Param('id') id: string,
    @Body() clientCommissionResponseDto: ClientCommissionResponseDto,
  ) {
    return this.commissionsService.respondToDelivery(
      Number(id),
      clientCommissionResponseDto.decision,
      clientCommissionResponseDto.revisionRequest,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('client/:id/delivery-response')
  respondToDeliveryAsClient(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() clientCommissionResponseDto: ClientCommissionResponseDto,
  ) {
    return this.commissionsService.respondToDeliveryAsClient(
      request.user.userId,
      Number(id),
      clientCommissionResponseDto.decision,
      clientCommissionResponseDto.revisionRequest,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('client/:id/cancel')
  cancelAsClient(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() cancelCommissionDto: CancelCommissionDto,
  ) {
    return this.commissionsService.cancelAsClient(
      request.user.userId,
      Number(id),
      cancelCommissionDto.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelAsArtist(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() cancelCommissionDto: CancelCommissionDto,
  ) {
    return this.commissionsService.cancelAsArtist(
      request.user.userId,
      Number(id),
      cancelCommissionDto.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('client/:id/dispute')
  openDisputeAsClient(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() openCommissionDisputeDto: OpenCommissionDisputeDto,
  ) {
    return this.commissionsService.openDisputeAsClient(
      request.user.userId,
      Number(id),
      openCommissionDisputeDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/dispute')
  openDisputeAsArtist(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() openCommissionDisputeDto: OpenCommissionDisputeDto,
  ) {
    return this.commissionsService.openDisputeAsArtist(
      request.user.userId,
      Number(id),
      openCommissionDisputeDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('disputes/:id/resolve')
  resolveDisputeAsAdmin(
    @Param('id') id: string,
    @Req() request: { user: { userId: number; role: string } },
    @Body() resolveCommissionDisputeDto: ResolveCommissionDisputeDto,
  ) {
    return this.commissionsService.resolveDisputeAsAdmin(
      request.user.userId,
      request.user.role,
      Number(id),
      resolveCommissionDisputeDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateMineStatus(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateCommissionStatusDto: UpdateCommissionStatusDto,
  ) {
    return this.commissionsService.updateMineStatus(
      request.user.userId,
      Number(id),
      updateCommissionStatusDto.status,
      updateCommissionStatusDto.rejectionReason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/note')
  updateMineNote(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateCommissionNoteDto: UpdateCommissionNoteDto,
  ) {
    return this.commissionsService.updateMineNote(
      request.user.userId,
      Number(id),
      updateCommissionNoteDto.artistNote,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/proposal')
  updateMineProposal(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateCommissionProposalDto: UpdateCommissionProposalDto,
  ) {
    return this.commissionsService.updateMineProposal(
      request.user.userId,
      Number(id),
      updateCommissionProposalDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/delivery')
  deliverMine(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() deliverCommissionDto: DeliverCommissionDto,
  ) {
    return this.commissionsService.deliverMine(
      request.user.userId,
      Number(id),
      deliverCommissionDto,
    );
  }
}
