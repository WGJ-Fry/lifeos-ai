ALTER TABLE app_secrets ADD COLUMN secret_storage TEXT NOT NULL DEFAULT 'local_aes_gcm';
