import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DemoDraftService } from '../demo-draft.service';
import { DEMO_GENERATE_PROMPT_QUEUE } from '../constants/demo-generate-prompt.constants';
import type { DemoGeneratePromptJobData } from '../interfaces/demo-generate-prompt-job.interface';
import type { DemoGeneratePromptJobResult } from '../demo-draft.service';

@Processor(DEMO_GENERATE_PROMPT_QUEUE)
export class DemoGeneratePromptProcessor extends WorkerHost {
  constructor(private readonly demoDraftService: DemoDraftService) {
    super();
  }

  async process(
    job: Job<DemoGeneratePromptJobData, DemoGeneratePromptJobResult>,
  ): Promise<DemoGeneratePromptJobResult> {
    return this.demoDraftService.processGeneratePromptJob(job.data);
  }
}
