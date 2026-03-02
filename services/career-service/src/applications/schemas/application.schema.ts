import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ApplicationDocument = Application & Document;

// The Strict State Machine Enum
export enum ApplicationStatus {
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  INTERVIEWING = "INTERVIEWING",
  REJECTED = "REJECTED",
  ACCEPTED = "ACCEPTED",
  WITHDRAWN = "WITHDRAWN",
}

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Application {
  @Prop({ type: Types.ObjectId, required: true, ref: "Job" })
  jobId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  applicantId!: string;

  @Prop({ required: true })
  resume!: string;

  @Prop({ required: false })
  coverLetter?: string;

  @Prop({
    type: String,
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
    index: true,
  })
  status!: ApplicationStatus;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// ============================================================================
// ✨ ENTERPRISE INDEXING ✨
// ============================================================================

// 1. The Idempotency Shield: Prevents duplicate applications
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

// 2. Candidate Dashboard: Fast sorting for "My Applications"
ApplicationSchema.index({ applicantId: 1, createdAt: -1 });

// 3. Recruiter Dashboard: Fast filtering for a specific job's applicants
ApplicationSchema.index({ jobId: 1, status: 1, createdAt: 1 });
