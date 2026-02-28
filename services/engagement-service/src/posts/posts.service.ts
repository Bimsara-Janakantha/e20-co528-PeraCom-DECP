import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Post, type PostDocument } from "./schemas/post.schema.js";
import { CreatePostDto } from "./dto/create-post.dto.js";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";
import { v7 as uuidv7 } from "uuid";
import { publishEvent, type BaseEvent } from "@decp/event-bus";
import { MinioService } from "../minio/minio.service.js";

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,

    private readonly minioService: MinioService,

    @InjectMetric("engagement_posts_created_total")
    private postCounter: Counter<string>,
  ) {}

  // =================================================
  // Post Retrieval with Pagination
  // =================================================
  async getPostById(
    actorId: string,
    correlationId: string,
    postId: string,
  ): Promise<Post> {
    // 1. Validate postId format
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException("Invalid post ID");
    }

    // 2. Fetch post from database
    const post = await this.postModel.findById(postId).lean().exec();

    // 3. Handle not found case
    if (!post) throw new NotFoundException("Post not found!");

    // 4. Increment Prometheus metric
    this.postCounter.inc();

    // 5. Emit an event or log for further processing
    const viewEvent: BaseEvent<any> = {
      eventId: uuidv7(),
      eventType: "engagement.post.viewed",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "engagement-service",
      correlationId: correlationId,
      actorId: actorId,
      data: {
        post_id: post._id,
      },
    };

    publishEvent("engagement.post.viewed", viewEvent).catch((err) => {
      console.error(
        `[TraceID: ${correlationId}] Failed to publish view event:`,
        err.message,
      );
    });

    // 6. Return post data
    return post;
  }

  // =================================================
  // Cursor-based pagination for post listing
  // =================================================
  async getFeed(
    actorId: string,
    correlationId: string,
    cursor?: string,
    limit: number = 10,
  ) {
    // 1. Protect the database from massive queries
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    // 2. Build query filter from cursor
    let filter = {};

    if (cursor) {
      if (!Types.ObjectId.isValid(cursor)) {
        throw new BadRequestException("Invalid cursor");
      }

      // Fetch posts older (less than) the ID of the last post they saw
      filter = {
        _id: { $lt: new Types.ObjectId(cursor) },
      };
    }

    // 3. Fetch posts from database
    const posts = await this.postModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(safeLimit)
      .lean() // ✨ Maximum read performance
      .exec();

    // 4. Determine next cursor for pagination
    const nextCursor =
      posts.length === safeLimit
        ? String(posts[posts.length - 1]?._id ?? "")
        : null;

    // 5. Increment Prometheus metric
    this.postCounter.inc();

    // 5. Emit an event or log for further processing
    const feedViewedEvent: BaseEvent<any> = {
      eventId: uuidv7(),
      eventType: "engagement.feed.viewed",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "engagement-service",
      correlationId: correlationId,
      actorId: actorId,
      data: {
        cursor: cursor ?? null,
        limit: safeLimit,
        result_count: posts.length,
        next_cursor: nextCursor,
      },
    };

    publishEvent("engagement.events", feedViewedEvent).catch((err) => {
      console.error(
        `[TraceID: ${correlationId}] Failed to publish feed viewed event:`,
        err.message,
      );
    });

    // 6. Return feed payload
    return {
      data: posts,
      nextCursor,
    };
  }

  // =================================================
  // Post Creation with Media Handling
  // =================================================
  async createPost(
    userId: string,
    correlationId: string,
    dto: CreatePostDto,
    files: Express.Multer.File[] = [],
  ) {
    // 1. Validate media attachments
    let images: string[] = [];
    let video: string | null = null;

    // 2. Enforce media rules
    const imageFiles = files.filter((file) =>
      file.mimetype.startsWith("image/"),
    );

    const videoFiles = files.filter((file) =>
      file.mimetype.startsWith("video/"),
    );

    // 3. Enforce rules
    // Rule 1: Cannot have both
    if (imageFiles.length > 0 && videoFiles.length > 0) {
      throw new BadRequestException("Cannot upload both images and video");
    }

    // Rule 2: Max 10 images
    if (imageFiles.length > 10) {
      throw new BadRequestException("Maximum 10 images allowed");
    }

    // Rule 3: Max 1 video
    if (videoFiles.length > 1) {
      throw new BadRequestException("Only 1 video allowed");
    }

    // 4. Upload images
    for (const file of imageFiles) {
      const objectName = `posts/${Date.now()}-${file.originalname}`;
      const url = await this.minioService.uploadFile(
        "posts-bucket",
        objectName,
        file.buffer,
        file.mimetype,
      );
      images.push(url);
    }

    // 5. Upload video
    if (videoFiles.length === 1) {
      const file = videoFiles[0];
      if (!file) {
        throw new BadRequestException("Invalid video file");
      }

      const objectName = `posts/${Date.now()}-${file.originalname}`;
      video = await this.minioService.uploadFile(
        "posts-bucket",
        objectName,
        file.buffer,
        file.mimetype,
      );
    }

    // 6. Create post document
    const createdPost = new this.postModel({
      ...dto,
      images,
      video,
      authorId: userId,
    });

    // 7. Save to database
    const savedPost = await createdPost.save();

    // 8. Increment Prometheus counter
    this.postCounter.inc();

    // 9. Emit an event or log for further processing
    const postCreatedEvent: BaseEvent<any> = {
      eventId: uuidv7(),
      eventType: "engagement.post.created",
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      producer: "engagement-service",
      correlationId: correlationId,
      actorId: userId,
      data: {
        post_id: savedPost.id,
      },
    };

    publishEvent("engagement.events", postCreatedEvent).catch((err) => {
      console.error(
        `[TraceID: ${correlationId}] Failed to publish post created event:`,
        err.message,
      );
    });

    // 10. Return the created post
    return savedPost;
  }
}
