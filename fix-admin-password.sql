-- ============================================================
--  FIX: Update admin password hash
--  Run this in phpMyAdmin → u615113169_crmmanagement → SQL tab
--
--  This sets password to: admin123
-- ============================================================

UPDATE `users`
SET `password_hash` = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE `email` = 'admin';

-- Verify it updated
SELECT id, email, role, LEFT(password_hash, 20) AS hash_preview FROM users WHERE email = 'admin';
