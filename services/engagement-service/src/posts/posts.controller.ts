import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Param,
  Get,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { PostsService } from "./posts.service.js";
import { CreatePostDto } from "./dto/create-post.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { ActorId } from "../auth/decorators/actor.decorator.js";
import { CorrelationId } from "../auth/decorators/correlation-id.decorator.js";
import multer from "multer";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // POST /posts
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor("media", 10, {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
      },
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype.startsWith("image/") ||
          file.mimetype.startsWith("video/")
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only image or video allowed"), false);
        }
      },
    }),
  )
  async create(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.postsService.createPost(
      actorId,
      correlationId,
      createPostDto,
      files,
    );
  }

  // GET /posts/:id
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getPost(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Param("id") postId: string,
  ) {
    return this.postsService.getPostById(actorId, correlationId, postId);
  }

  // GET /posts?cursor=xxx&limit=10
  @UseGuards(JwtAuthGuard)
  @Get()
  async getFeed(
    @ActorId() actorId: string,
    @CorrelationId() correlationId: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe)
    limit?: number,
  ) {
    return this.postsService.getFeed(actorId, correlationId, cursor, limit);
  }
}
