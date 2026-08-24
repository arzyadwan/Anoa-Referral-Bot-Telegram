-- Add the direct Telegram invite link stored for each inviter.
ALTER TABLE "User"
ADD COLUMN "inviteLink" TEXT;

CREATE UNIQUE INDEX "User_inviteLink_key" ON "User"("inviteLink");
