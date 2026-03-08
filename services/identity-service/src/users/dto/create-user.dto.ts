import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from "class-validator";
import { EmailPattern, UserRole } from "../schemas/user.schema.js";

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  // This automatically enforces your university domain rule!
  @Matches(EmailPattern, {
    message: "Use the university email address",
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;
}
