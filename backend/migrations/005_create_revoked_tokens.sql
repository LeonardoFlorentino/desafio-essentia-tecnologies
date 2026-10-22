-- Session tokens ended by a logout before their natural expiry. A row is only needed until the
-- token would have expired anyway; after that the signature check already rejects it.
CREATE TABLE revoked_tokens (
  jti CHAR(36) NOT NULL PRIMARY KEY,
  expires_at DATETIME NOT NULL,
  INDEX revoked_tokens_expires_idx (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
