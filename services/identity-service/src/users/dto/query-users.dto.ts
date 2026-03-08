import { Type } from "class-transformer";
import { IsOptional, IsString, IsEnum, IsNumber } from "class-validator";
import { UserRole } from "../schemas/user.schema.js";

export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
