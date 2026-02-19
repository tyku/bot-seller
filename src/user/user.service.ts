import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseUserDto } from './dto/response-user.dto';
import { UserDocument, SourceType } from './schemas/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    this.logger.log(
      `Creating user: ${createUserDto.sourceType}:${createUserDto.externalId}`,
    );

    try {
      const existing = await this.userRepository.findByExternalId(
        createUserDto.sourceType,
        createUserDto.externalId,
      );
      if (existing) {
        throw new ConflictException(
          'User with this sourceType and externalId already exists',
        );
      }

      const user = await this.userRepository.create(createUserDto);
      this.logger.log(`User created: ${user._id}`);
      return this.mapToResponseDto(user);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error.code === 11000) {
        this.logger.error(
          `Duplicate key error: ${error.message}`,
          error.stack,
        );
        throw new ConflictException('User already exists');
      }
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create user');
    }
  }

  async findById(id: string): Promise<ResponseUserDto> {
    this.logger.log(`Fetching user by ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async findByExternalId(
    sourceType: SourceType,
    externalId: string,
  ): Promise<ResponseUserDto> {
    this.logger.log(`Fetching user: ${sourceType}:${externalId}`);
    const user = await this.userRepository.findByExternalId(
      sourceType,
      externalId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ResponseUserDto> {
    this.logger.log(`Updating user: ${id}`);
    const user = await this.userRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.logger.log(`User updated: ${id}`);
    return this.mapToResponseDto(user);
  }

  async upsertByExternalId(
    sourceType: SourceType,
    externalId: string,
    data: Partial<CreateUserDto>,
  ): Promise<ResponseUserDto> {
    this.logger.log(`Upserting user: ${sourceType}:${externalId}`);
    const user = await this.userRepository.upsertByExternalId(
      sourceType,
      externalId,
      data,
    );
    this.logger.log(`User upserted: ${user._id}`);
    return this.mapToResponseDto(user);
  }

  private mapToResponseDto(user: UserDocument): ResponseUserDto {
    return new ResponseUserDto({
      id: user._id.toString(),
      sourceType: user.sourceType,
      externalId: user.externalId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      email: user.email,
      languageCode: user.languageCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
