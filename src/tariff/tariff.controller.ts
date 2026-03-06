import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { TariffService } from './tariff.service';
import { TariffResponseDto } from './dto/tariff-response.dto';

@Controller('tariffs')
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<{
    success: boolean;
    data: TariffResponseDto[];
    message: string;
  }> {
    const onlyActive = activeOnly === 'true';
    const data = await this.tariffService.findAll(onlyActive);
    return {
      success: true,
      data,
      message: 'Tariffs retrieved successfully',
    };
  }
}
