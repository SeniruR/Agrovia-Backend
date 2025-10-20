-- Migration: add response tracking columns to contact_messages
ALTER TABLE contact_messages
  ADD COLUMN phone VARCHAR(25) NULL AFTER email,
  ADD COLUMN status ENUM('pending','responded','discarded') NOT NULL DEFAULT 'pending' AFTER source,
  ADD COLUMN response_message TEXT NULL AFTER status,
  ADD COLUMN response_subject VARCHAR(255) NULL AFTER response_message,
  ADD COLUMN responded_by BIGINT UNSIGNED NULL AFTER response_subject,
  ADD COLUMN responded_at DATETIME NULL AFTER responded_by;

CREATE INDEX idx_contact_status ON contact_messages (status);
ALTER TABLE contact_messages
  ADD CONSTRAINT fk_contact_messages_responder
    FOREIGN KEY (responded_by) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
