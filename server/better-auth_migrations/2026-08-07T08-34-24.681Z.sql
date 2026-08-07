alter table "twoFactor" add column "failedVerificationCount" integer;

alter table "twoFactor" add column "lockedUntil" timestamptz;