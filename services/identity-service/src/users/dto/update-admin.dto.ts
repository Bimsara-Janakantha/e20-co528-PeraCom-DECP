import {
  IsOptional,
  IsString,
  IsEmail,
  IsUUID,
  Matches,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
} from "class-validator";
import { EmailPattern, UserRole } from "../schemas/user.schema.js";

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  userIds!: string[];

  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserAdminDto {
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  @Matches(EmailPattern, {
    message: "Use the university email address",
  })
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
