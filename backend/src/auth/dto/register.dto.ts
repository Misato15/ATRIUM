export class RegisterDto {
  email!: string;
  password!: string;
  fullName!: string;
  artistName?: string;
  category!: string;
  location?: string;
}