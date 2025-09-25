import { IsDecimal, IsNotEmpty } from 'class-validator';

export class CreateBudgetFromOrderDto {
  @IsNotEmpty()
  amount!: number;        // BRL

  expiresAt?: string;     // ISO opcional
}