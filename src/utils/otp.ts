import crypto from "crypto";
import redis from "../config/redis";

export class OtpUtil {
  static generate(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  static async save(
    email: string,
    otp: string,
    expiryMinutes: number = 10
  ): Promise<void> {
    const key = `otp:${email}`;
    await redis.setex(key, expiryMinutes * 60, otp);
  }

  static async verify(email: string, otp: string): Promise<boolean> {
    const key = `otp:${email}`;
    const savedOtp = await redis.get(key);

    if (!savedOtp || savedOtp !== otp) {
      return false;
    }

    await redis.del(key);
    return true;
  }

  static async delete(email: string): Promise<void> {
    const key = `otp:${email}`;
    await redis.del(key);
  }
}
