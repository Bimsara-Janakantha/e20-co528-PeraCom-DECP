import {
  IsOptional,
  IsString,
  IsEmail,
  IsUUID,
  Matches,
  IsEnum,
  IsNotEmpty,
} from "class-validator";
import {
  BatchPattern,
  EmailPattern,
  UserRole,
} from "../schemas/user.schema.js";

export class UpdateRolesDto {
  @IsNotEmpty()
  @Matches(BatchPattern, {
    message: "Batch must be in the format 'EXX' where XX is the batch number",
  })
  batch!: string;

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
