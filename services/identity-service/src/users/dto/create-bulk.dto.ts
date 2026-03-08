import { ArrayNotEmpty, IsArray } from "class-validator";
import type { CreateUserDto } from "./create-user.dto.js";

export class CreateBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  students!: CreateUserDto[];
}
