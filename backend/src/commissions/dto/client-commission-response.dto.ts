export class ClientCommissionResponseDto {
  decision!: 'ACCEPT' | 'REJECT' | 'REQUEST_REVISION';
  revisionRequest?: string;
}
