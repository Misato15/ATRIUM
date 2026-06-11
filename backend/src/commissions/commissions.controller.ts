import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommissionsService } from './commissions.service';
import { CreateCommissionRequestDto } from './dto/create-commission-request.dto';
import { UpdateCommissionNoteDto } from './dto/update-commission-note.dto';
import { UpdateCommissionProposalDto } from './dto/update-commission-proposal.dto';
import { UpdateCommissionStatusDto } from './dto/update-commission-status.dto';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post('artists/:artistProfileId')
  createForArtist(
    @Param('artistProfileId') artistProfileId: string,
    @Body() createCommissionRequestDto: CreateCommissionRequestDto,
  ) {
    return this.commissionsService.createForArtist(
      Number(artistProfileId),
      createCommissionRequestDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: { user: { userId: number } }) {
    return this.commissionsService.findMine(request.user.userId);
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
}
