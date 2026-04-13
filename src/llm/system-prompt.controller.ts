import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SystemPromptService } from './system-prompt.service';
import { ZodValidationPipe } from '../customer/pipes/zod-validation.pipe';
import {
  UpdateSystemPromptTextSchema,
  type UpdateSystemPromptTextDto,
} from './dto/update-system-prompt.dto';

@Controller('system-prompts')
@UseGuards(AdminGuard)
export class SystemPromptController {
  constructor(private readonly systemPromptService: SystemPromptService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      type: string;
      text: string;
    }>;
    message: string;
  }> {
    const data = await this.systemPromptService.listPromptsForAdmin();
    return {
      success: true,
      data,
      message: 'System prompts retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateText(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSystemPromptTextSchema))
    body: UpdateSystemPromptTextDto,
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      type: string;
      text: string;
    };
    message: string;
  }> {
    const updated = await this.systemPromptService.updatePromptText(
      id,
      body.text,
    );
    if (!updated) {
      throw new NotFoundException('System prompt not found');
    }
    return {
      success: true,
      data: updated,
      message: 'System prompt updated successfully',
    };
  }
}
