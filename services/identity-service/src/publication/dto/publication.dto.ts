import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
  IsDate,
  IsUUID,
} from "class-validator";

export class NewPublicationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string;

  @IsOptional()
  @IsDate()
  published_date?: Date;

  @IsOptional()
  @IsUrl()
  link?: string;
}

export class UpdatePublicationDto {
  @IsNotEmpty()
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  journal?: string;

  @IsOptional()
  @IsDate()
  published_date?: Date;

  @IsOptional()
  @IsUrl()
  link?: string;
}
