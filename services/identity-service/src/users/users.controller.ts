import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import type { CreateBulkDto } from "./dto/create-bulk.dto.js";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  // POST /users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createSingleUser(dto);
  }

  // POST /users/bulk/validate
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("bulk/validate")
  validateBulk(@Body() body: CreateBulkDto) {
    return this.usersService.validateBulkStudents(body.students);
  }

  // POST /users/bulk/create
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("bulk/create")
  bulkCreate(@Body() body: CreateBulkDto) {
    return this.usersService.bulkCreateStudents(body.students);
  }
}
