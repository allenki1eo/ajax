<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Dashboard';

$pdo = getDBConnection();

// Get dashboard statistics
$stats = [];

// Total products
$stmt = $pdo->query("SELECT COUNT(*) as count FROM products WHERE status = 'active'");
$stats['total_products'] = $stmt->fetch()['count'];

// Low stock products
$stmt = $pdo->query("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND status = 'active'");
$stats['low_stock'] = $stmt->fetch()['count'];

// Total sales today
$stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE DATE(sale_date) = CURDATE()");
$stats['today_sales'] = $stmt->fetch()['total'];

// Total sales this month
$stmt = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())");
$stats['month_sales'] = $stmt->fetch()['total'];

// Recent sales
$stmt = $pdo->query("SELECT s.*, DATE_FORMAT(s.sale_date, '%M %d, %Y') as formatted_date 
                     FROM sales s 
                     ORDER BY s.created_at DESC 
                     LIMIT 5");
$recent_sales = $stmt->fetchAll();

// Top selling products
$stmt = $pdo->query("SELECT p.name, SUM(si.quantity) as total_sold, SUM(si.total_price) as total_revenue
                     FROM products p
                     JOIN sale_items si ON p.id = si.product_id
                     JOIN sales s ON si.sale_id = s.id
                     WHERE s.status = 'completed'
                     GROUP BY p.id, p.name
                     ORDER BY total_sold DESC
                     LIMIT 5");
$top_products = $stmt->fetchAll();

// Monthly sales data for chart
$stmt = $pdo->query("SELECT 
                        MONTH(sale_date) as month,
                        MONTHNAME(sale_date) as month_name,
                        SUM(total_amount) as total
                     FROM sales 
                     WHERE YEAR(sale_date) = YEAR(CURDATE())
                     GROUP BY MONTH(sale_date), MONTHNAME(sale_date)
                     ORDER BY MONTH(sale_date)");
$monthly_sales = $stmt->fetchAll();

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                <i class="fas fa-sync-alt me-1"></i>Refresh
            </button>
        </div>
    </div>
</div>

<!-- Statistics Cards -->
<div class="row mb-4">
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($stats['total_products']); ?></div>
                    <div class="small">Total Products</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-box fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card warning">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($stats['low_stock']); ?></div>
                    <div class="small">Low Stock Items</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-exclamation-triangle fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card success">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS <?php echo number_format($stats['today_sales'], 2); ?></div>
                    <div class="small">Today's Sales</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-dollar-sign fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card info">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS <?php echo number_format($stats['month_sales'], 2); ?></div>
                    <div class="small">This Month</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-chart-line fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <!-- Sales Chart -->
    <div class="col-lg-8 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-area me-2"></i>Monthly Sales Overview</h5>
            </div>
            <div class="card-body">
                <canvas id="salesChart" height="100"></canvas>
            </div>
        </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="col-lg-4 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-bolt me-2"></i>Quick Actions</h5>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    <a href="products.php?action=add" class="btn btn-primary">
                        <i class="fas fa-plus me-2"></i>Add Product
                    </a>
                    <a href="sales.php?action=add" class="btn btn-success">
                        <i class="fas fa-shopping-cart me-2"></i>New Sale
                    </a>
                    <a href="purchases.php?action=add" class="btn btn-info">
                        <i class="fas fa-truck me-2"></i>Record Purchase
                    </a>
                    <a href="reports.php" class="btn btn-warning">
                        <i class="fas fa-chart-bar me-2"></i>View Reports
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <!-- Recent Sales -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-shopping-cart me-2"></i>Recent Sales</h5>
                <a href="sales.php" class="btn btn-sm btn-outline-primary">View All</a>
            </div>
            <div class="card-body">
                <?php if (empty($recent_sales)): ?>
                    <p class="text-muted text-center py-3">No sales recorded yet.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recent_sales as $sale): ?>
                                <tr>
                                    <td><?php echo $sale['formatted_date']; ?></td>
                                    <td><?php echo htmlspecialchars($sale['customer_name'] ?: 'Walk-in'); ?></td>
                                    <td>TZS <?php echo number_format($sale['total_amount'], 2); ?></td>
                                    <td>
                                        <span class="badge bg-<?php echo $sale['status'] == 'completed' ? 'success' : 'warning'; ?>">
                                            <?php echo ucfirst($sale['status']); ?>
                                        </span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <!-- Top Products -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-star me-2"></i>Top Selling Products</h5>
                <a href="reports.php?type=products" class="btn btn-sm btn-outline-primary">View Report</a>
            </div>
            <div class="card-body">
                <?php if (empty($top_products)): ?>
                    <p class="text-muted text-center py-3">No sales data available yet.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Sold</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($top_products as $product): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($product['name']); ?></td>
                                    <td><?php echo number_format($product['total_sold']); ?></td>
                                    <td>TZS <?php echo number_format($product['total_revenue'], 2); ?></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php if ($stats['low_stock'] > 0): ?>
<!-- Low Stock Alert -->
<div class="row">
    <div class="col-12">
        <div class="alert alert-warning">
            <h5><i class="fas fa-exclamation-triangle me-2"></i>Low Stock Alert</h5>
            <p class="mb-2">You have <?php echo $stats['low_stock']; ?> product(s) running low on stock.</p>
            <a href="inventory.php?filter=low_stock" class="btn btn-warning btn-sm">
                <i class="fas fa-eye me-1"></i>View Low Stock Items
            </a>
        </div>
    </div>
</div>
<?php endif; ?>

<script>
// Sales Chart
const ctx = document.getElementById('salesChart').getContext('2d');
const salesChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [<?php echo implode(',', array_map(function($item) { return '"' . $item['month_name'] . '"'; }, $monthly_sales)); ?>],
        datasets: [{
            label: 'Sales (TZS)',
            data: [<?php echo implode(',', array_column($monthly_sales, 'total')); ?>],
            borderColor: 'rgb(52, 152, 219)',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return 'TZS' + value.toLocaleString();
                    }
                }
            }
        }
    }
});
</script>

<?php include 'includes/footer.php'; ?>
