<?php
// Database configuration template
// Copy this file to database.php and fill in your actual credentials

define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');

// Ensure PHP uses the correct local timezone
// For Tanzania/East Africa use Africa/Dar_es_Salaam
date_default_timezone_set('Africa/Dar_es_Salaam');

// Create database connection
function getDBConnection() {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        // Set MySQL session time zone to match PHP's timezone
        $pdo->exec("SET time_zone = '+03:00'");
        return $pdo;
    } catch(PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    }
}

// Application settings
define('APP_NAME', 'Business Manager');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost/store/');

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS

session_start();
?>
