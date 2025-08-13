CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL,
    ucp_username VARCHAR(255),
    email VARCHAR(255),
    password_hash VARCHAR(255),  -- Gunakan hashing untuk security!
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);