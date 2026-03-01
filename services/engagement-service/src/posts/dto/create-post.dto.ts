import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  postId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  content!: string;
}
