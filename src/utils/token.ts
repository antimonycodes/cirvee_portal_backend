import jwt, { SignOptions } from "jsonwebtoken";

import redis from "../config/redis";
import { randomBytes } from "crypto";

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export class TokenUtil {
  static generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN as any) || "1d",
    };

    return jwt.sign(payload, process.env.JWT_SECRET as string, options);
  }

  static generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || "7d",
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, options);
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as TokenPayload;
  }

  static async saveRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    const expiryDays = 7;
    await redis.setex(key, expiryDays * 24 * 60 * 60, token);
  }

  static async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return await redis.get(key);
  }

  static async deleteRefreshToken(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redis.del(key);
  }

  static generatePasswordResetToken(): string {
    return randomBytes(32).toString("hex");
  }

  static async savePasswordResetToken(
    email: string,
    token: string
  ): Promise<void> {
    const key = `reset_token:${email}`;
    await redis.setex(key, 60 * 60, token); // 1 hour
  }

  static async verifyPasswordResetToken(
    email: string,
    token: string
  ): Promise<boolean> {
    const key = `reset_token:${email}`;
    const savedToken = await redis.get(key);

    if (!savedToken || savedToken !== token) {
      return false;
    }

    await redis.del(key);
    return true;
  }
}
