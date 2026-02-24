import {
  IsOptional,
  IsString,
  IsEmail,
  IsUUID,
  Matches,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";

export enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  ALUMNI = "ALUMNI",
}

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  userIds!: string[];

  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  @Matches(/^[^\s@]+@eng\.pdn\.ac\.lk$/, {
    message: "Use the university email address",
  })
  email?: string;
}
