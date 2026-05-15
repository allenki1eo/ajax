<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? $pageTitle . ' - ' . APP_NAME : APP_NAME; ?></title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <style>
        :root {
            /* Primary Brand Colors */
            --primary-color: #2c3e50;
            --primary-light: #34495e;
            --primary-dark: #1a252f;
            
            /* Secondary Colors */
            --secondary-color: #3498db;
            --secondary-light: #5dade2;
            --secondary-dark: #2980b9;
            
            /* Status Colors */
            --success-color: #27ae60;
            --success-light: #58d68d;
            --success-dark: #1e8449;
            
            --warning-color: #f39c12;
            --warning-light: #f7dc6f;
            --warning-dark: #d68910;
            
            --danger-color: #e74c3c;
            --danger-light: #ec7063;
            --danger-dark: #c0392b;
            
            --info-color: #17a2b8;
            --info-light: #5bc0de;
            --info-dark: #138496;
            
            /* Neutral Colors */
            --dark-color: #34495e;
            --light-color: #ecf0f1;
            --muted-color: #6c757d;
            
            /* Background Colors */
            --bg-primary: #f8f9fa;
            --bg-secondary: #e9ecef;
            --bg-dark: #343a40;
            --bg-light: #ffffff;
            
            /* Text Colors */
            --text-primary: #2c3e50;
            --text-secondary: #6c757d;
            --text-light: #ffffff;
            --text-muted: #868e96;
            
            /* Border Colors */
            --border-color: #dee2e6;
            --border-light: #e9ecef;
            --border-dark: #adb5bd;
            
            /* Shadow Colors */
            --shadow-light: rgba(0,0,0,0.1);
            --shadow-medium: rgba(0,0,0,0.15);
            --shadow-dark: rgba(0,0,0,0.3);
            --focus-shadow: rgba(52, 152, 219, 0.25);
            
            /* Gradient Colors for Stats Cards */
            --gradient-primary: linear-gradient(135deg, var(--primary-color) 0%, var(--dark-color) 100%);
            --gradient-success: linear-gradient(135deg, var(--success-color) 0%, var(--success-light) 100%);
            --gradient-warning: linear-gradient(135deg, var(--warning-color) 0%, var(--danger-color) 100%);
            --gradient-info: linear-gradient(135deg, var(--info-color) 0%, var(--secondary-color) 100%);
        }
        
        body {
            background-color: var(--bg-primary);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text-primary);
        }
        
        .navbar-brand {
            font-weight: bold;
            color: var(--primary-color) !important;
        }
        
        .sidebar {
            background: linear-gradient(135deg, var(--primary-color), var(--dark-color));
            min-height: calc(100vh - 56px);
            box-shadow: 2px 0 10px var(--shadow-light);
        }
        
        .sidebar .nav-link {
            color: rgba(255,255,255,0.8);
            padding: 12px 20px;
            margin: 2px 0;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .sidebar .nav-link:hover,
        .sidebar .nav-link.active {
            color: white;
            background-color: rgba(255,255,255,0.1);
            transform: translateX(5px);
        }
        
        .sidebar .nav-link i {
            width: 20px;
            margin-right: 10px;
        }
        
        .main-content {
            padding: 20px;
        }
        
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 4px 15px var(--shadow-light);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card-header {
            background: linear-gradient(135deg, var(--secondary-color), var(--secondary-light));
            color: var(--text-light);
            border-radius: 15px 15px 0 0 !important;
            padding: 15px 20px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--secondary-color), var(--secondary-light));
            border: none;
            border-radius: 25px;
            padding: 10px 25px;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px var(--focus-shadow);
        }
        
        .btn-success {
            background: linear-gradient(135deg, var(--success-color), var(--success-light));
            border: none;
            border-radius: 25px;
        }
        
        .btn-warning {
            background: linear-gradient(135deg, var(--warning-color), var(--warning-light));
            border: none;
            border-radius: 25px;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, var(--danger-color), var(--danger-light));
            border: none;
            border-radius: 25px;
        }
        
        .stats-card {
            background: var(--gradient-primary);
            color: var(--text-light);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .stats-card.success {
            background: var(--gradient-success);
        }
        
        .stats-card.warning {
            background: var(--gradient-warning);
        }
        
        .stats-card.info {
            background: var(--gradient-info);
        }
        
        .table {
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px var(--shadow-light);
        }
        
        .table thead th {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 15px;
        }
        
        .table tbody tr:hover {
            background-color: var(--bg-primary);
        }
        
        .form-control, .form-select {
            border-radius: 10px;
            border: 2px solid var(--border-light);
            padding: 12px 15px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--secondary-color);
            box-shadow: 0 0 0 0.2rem var(--focus-shadow);
        }
        
        .alert {
            border-radius: 10px;
            border: none;
        }
        
        .navbar {
            box-shadow: 0 2px 10px var(--shadow-light);
        }
        
        @media (max-width: 767.98px) {
            .sidebar {
                position: fixed;
                top: 56px;
                left: 0;
                width: 100%;
                height: calc(100vh - 56px);
                z-index: 1000;
                background: linear-gradient(135deg, var(--primary-color), var(--dark-color));
                transform: translateX(-100%);
                transition: transform 0.3s ease-in-out;
                overflow-y: auto;
            }
            
            .sidebar.show {
                transform: translateX(0);
            }
            
            .sidebar .nav-link {
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .main-content {
                padding: 10px;
                margin-left: 0 !important;
            }
            
            .navbar-toggler {
                border: none;
                padding: 4px 8px;
            }
            
            .navbar-toggler:focus {
                box-shadow: none;
            }
        }
        
        @media (min-width: 768px) {
            .sidebar {
                display: block !important;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white">
        <div class="container-fluid">
            <a class="navbar-brand" href="dashboard.php">
                <i class="fas fa-chart-line me-2"></i><?php echo APP_NAME; ?>
            </a>
            
            <button class="navbar-toggler me-2" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu" aria-controls="sidebarMenu" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <i class="fas fa-user"></i>
            </button>
            
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <?php if (isset($auth) && $auth->isLoggedIn()): ?>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                                <i class="fas fa-user me-1"></i><?php echo $_SESSION['full_name']; ?>
                            </a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="profile.php"><i class="fas fa-user-edit me-2"></i>Profile</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="logout.php"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                            </ul>
                        </li>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container-fluid">
        <div class="row">
            <?php if (isset($auth) && $auth->isLoggedIn() && !isset($hideNavigation)): ?>
            <!-- Sidebar -->
            <nav class="col-md-3 col-lg-2 d-md-block sidebar collapse" id="sidebarMenu">
                <div class="position-sticky pt-3">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'dashboard.php' ? 'active' : ''; ?>" href="dashboard.php">
                                <i class="fas fa-tachometer-alt"></i>Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'products.php' ? 'active' : ''; ?>" href="products.php">
                                <i class="fas fa-box"></i>Products
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'sales.php' ? 'active' : ''; ?>" href="sales.php">
                                <i class="fas fa-shopping-cart"></i>Sales
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'purchases.php' ? 'active' : ''; ?>" href="purchases.php">
                                <i class="fas fa-truck"></i>Purchases
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'inventory.php' ? 'active' : ''; ?>" href="inventory.php">
                                <i class="fas fa-warehouse"></i>Inventory
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'reports.php' ? 'active' : ''; ?>" href="reports.php">
                                <i class="fas fa-chart-bar"></i>Reports
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'categories.php' ? 'active' : ''; ?>" href="categories.php">
                                <i class="fas fa-tags"></i>Categories
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'suppliers.php' ? 'active' : ''; ?>" href="suppliers.php">
                                <i class="fas fa-truck-loading"></i>Suppliers
                            </a>
                        </li>
                        <?php if ($auth->isAdmin()): ?>
                        <li class="nav-item">
                            <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'users.php' ? 'active' : ''; ?>" href="users.php">
                                <i class="fas fa-users"></i>Users
                            </a>
                        </li>
                        <?php endif; ?>
                    </ul>
                </div>
            </nav>
            
            <!-- Main content -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 main-content">
            <?php else: ?>
            <main class="col-12 main-content">
            <?php endif; ?>
