export enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  ALUMNI = "ALUMNI",
}

export enum SortOptions {
  NAME = "first_name",
  ROLE = "role",
  REG_NO = "reg_number",
  STATUS = "is_active",
}

export class SortOrder {
  static ASC = "asc";
  static DESC = "desc";
}

export const EmailPattern = /^[^\s@]+@([^\s@]+\.)?pdn\.ac\.lk$/;

export const BatchPattern = /^E\d{2}$/;
