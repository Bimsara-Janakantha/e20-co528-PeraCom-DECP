import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  // This automatically enforces your university domain rule!
  @Matches(/^[^\s@]+@eng\.pdn\.ac\.lk$/, {
    message: "Use the university email address",
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  role!: "STUDENT" | "ALUMNI" | "ADMIN";
}
