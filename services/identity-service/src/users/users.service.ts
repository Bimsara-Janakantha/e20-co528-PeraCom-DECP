import {
  Injectable,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { v7 as uuidv7 } from "uuid";
import { publishEvent, type BaseEvent } from "@decp/event-bus";
import type { CreateUserDto } from "./dto/create-user.dto.js";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // SINGLE USER CREATION LOGIC
  // ==========================================
  async createSingleUser(data: CreateUserDto) {
    // 1. Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });

    // 2. If email exists, throw an error
    if (existing) {
      console.log("Email already exists:", data.email);
      throw new ConflictException("Email already exists");
    }

    // 3. Create the user in the database
    const newUser = await this.prisma.user.create({
      data: {
        id: uuidv7(),
        email: data.email.trim().toLowerCase(),
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        reg_number: data.email.split("@")[0] || "",
        role: data.role || "STUDENT",
      },
    });

    // 6. Broadcast the event so other services can prepare
    const userCreatedEvent: BaseEvent<any> = {
      eventId: uuidv7(),
      eventType: "identity.user.created",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "identity-service",
      correlationId: newUser.id,
      data: {
        user_id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
      },
    };

    await publishEvent("identity.user.events", userCreatedEvent);

    return { status: "user_created" };
  }

  // ==========================================
  // BULK VALIDATION LOGIC
  // ==========================================
  async validateBulkStudents(students: CreateUserDto[]) {
    const errors = [];
    const validStudents = [];

    const processedEmailsInFile = new Set<string>();

    // 1. Pre-process the incoming data (trim & lowerCase)
    const normalizedStudents: CreateUserDto[] = students.map((s) => ({
      ...s,
      email: s.email.trim().toLowerCase(),
    }));

    const emails = normalizedStudents.map((s) => s.email);
    console.log("Validating bulk students emails:", emails);

    // 2. Fetch existing users from the DB in ONE query
    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true }, // Only grab the email to save memory
    });

    const existingEmailSet = new Set(existingUsers.map((u) => u.email));

    // 3. Loop through and categorize
    for (let i = 0; i < normalizedStudents.length; i++) {
      const student = normalizedStudents[i] as CreateUserDto;

      // Error Type A: Already exists in the Database
      if (existingEmailSet.has(student.email)) {
        errors.push({
          row: i + 1,
          message: `Email ${student.email} already exists in the system`,
        });
        continue;
      }

      // Error Type B: Duplicate found within the uploaded CSV file itself
      if (processedEmailsInFile.has(student.email)) {
        errors.push({
          row: i + 1,
          message: `Duplicate email ${student.email} found in the uploaded file`,
        });
        continue;
      }

      // If it passes both checks, it's a valid new user
      processedEmailsInFile.add(student.email);
      validStudents.push(student);
    }

    return {
      validCount: validStudents.length,
      errorCount: errors.length,
      errors,
      validStudents,
    };
  }

  // ==========================================
  // BULK CREATION LOGIC
  // ==========================================
  async bulkCreateStudents(students: CreateUserDto[]) {
    // 1. Check for duplicates and separate valid students from errors
    const validationResult = await this.validateBulkStudents(students);

    // 2. If there are errors, return them immediately. Do not create partial batches.
    if (validationResult.errorCount > 0) {
      throw new BadRequestException({
        message: "Validation failed. Please fix errors and try again.",
        errors: validationResult.errors,
      });
    }

    // 3. If all students are valid, map the data for Prisma
    const usersToInsert = validationResult.validStudents.map((student) => {
      return {
        id: uuidv7(),
        email: student.email, // Already lowercased/trimmed in validate step
        first_name: student.first_name.trim(),
        last_name: student.last_name.trim(),
        reg_number: student.email.split("@")[0] || "",
        role: student.role || "STUDENT",
      };
    });

    // 4. Insert all valid students in a single query
    const created = await this.prisma.user.createMany({
      data: usersToInsert,
      skipDuplicates: true, // Extra safety net
    });

    // 5. Broadcast a SINGLE Kafka event for the entire batch
    const batchCreatedEvent: BaseEvent<any> = {
      eventId: uuidv7(),
      eventType: "identity.batch_users.created",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "identity-service",
      data: {
        count: created.count,
        users: usersToInsert.map((u) => ({
          user_id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
        })),
      },
    };

    await publishEvent("identity.user.events", batchCreatedEvent);

    // 6. Return the result
    return { status: "Users created", count: created.count };
  }
}
