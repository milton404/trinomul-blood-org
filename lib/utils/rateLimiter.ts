interface RateLimitEntry {
  count: number;
  lastAttempt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimits.get(identifier);

  if (!entry) {
    rateLimits.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
  }

  const timeSinceLastAttempt = now - entry.lastAttempt;

  if (timeSinceLastAttempt > windowMs) {
    rateLimits.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxAttempts) {
    const resetTime = entry.lastAttempt + windowMs;
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      resetTime 
    };
  }

  entry.count++;
  entry.lastAttempt = now;
  
  return { 
    allowed: true, 
    remainingAttempts: maxAttempts - entry.count, 
    resetTime: entry.lastAttempt + windowMs 
  };
}

export function clearRateLimit(identifier: string): void {
  rateLimits.delete(identifier);
}

export function getRemainingAttempts(
  identifier: string,
  maxAttempts: number = 5
): number {
  const entry = rateLimits.get(identifier);
  if (!entry) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}
