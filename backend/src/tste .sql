GRANT ALL PRIVILEGES ON test.* TO 'Admin'@'localhost' IDENTIFIED BY 'Toor';
FLUSH PRIVILEGES;

SHOW GRANTS FOR 'Admin'@'localhost';

mysql -u root -p