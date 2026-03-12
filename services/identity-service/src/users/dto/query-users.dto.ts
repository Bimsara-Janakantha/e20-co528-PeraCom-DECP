import { Transform, Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsArray,
} from "class-validator";
import { SortOptions, SortOrder, UserRole } from "../schemas/user.schema.js";

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

  @IsOptional()
  @IsEnum(SortOptions)
  sortBy?: SortOptions;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}

export class UserSummaryDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : [value];
  })
  users!: string[];
}
