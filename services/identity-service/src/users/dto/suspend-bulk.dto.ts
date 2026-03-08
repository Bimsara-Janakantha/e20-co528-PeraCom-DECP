import { IsNotEmpty, Matches } from "class-validator";
import { BatchPattern } from "../schemas/user.schema.js";

export class BulkSuspendDto {
  @IsNotEmpty()
  @Matches(BatchPattern, {
    message: "Batch must be in the format 'EXX' where XX is the batch number",
  })
  batch!: string;
}
