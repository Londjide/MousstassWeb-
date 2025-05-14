CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  full_name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  photo_url VARCHAR(255),
  preferences JSON
);

CREATE TABLE user_keys (
  user_id INT PRIMARY KEY,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  file_path VARCHAR(255),
  timestamp DATETIME,
  duration INT,
  user_id INT,
  encryption_key TEXT,
  description TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE shared_recordings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recording_id INT,
  source_user_id INT,
  target_user_id INT,
  encryption_key TEXT,
  FOREIGN KEY (recording_id) REFERENCES recordings(id),
  FOREIGN KEY (source_user_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id)
);

CREATE TABLE audio_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  filename VARCHAR(255),
  encrypted_data LONGBLOB,
  hash_verification VARCHAR(255),
  description TEXT,
  duration_seconds INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE financial_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  data_type VARCHAR(50),
  encrypted_content LONGBLOB,
  hash_verification VARCHAR(255),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
); 