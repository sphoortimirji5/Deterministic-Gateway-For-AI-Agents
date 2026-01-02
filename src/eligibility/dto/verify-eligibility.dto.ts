import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VerifyEligibilityDto {
    @IsString()
    @IsNotEmpty()
    patient_name!: string;

    @IsString()
    @IsNotEmpty()
    payer_id!: string;

    @IsString()
    @IsOptional()
    batch_id?: string;
}
