import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

function configuredToken(): string | null {
  const token = process.env.APEX_API_AUTH_TOKEN?.trim();
  return token ? token : null;
}

function matchesToken(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export function atlasApiAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = configuredToken();
  if (!expected) {
    next();
    return;
  }
  const authorization = req.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match || !matchesToken(match[1].trim(), expected)) {
    res.status(401).json({ error: "Atlas API authentication required." });
    return;
  }
  next();
}
