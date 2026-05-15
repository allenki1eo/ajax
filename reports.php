<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Reports';

$pdo = getDBConnection();

// Get report parameters
$report_type = $_GET['type'] ?? 'sales';
$date_from = $_GET['date_from'] ?? date('Y-m-01'); // First day of current month
$date_to = $_GET['date_to'] ?? date('Y-m-d'); // Today

// Sales Report Data
if ($report_type == 'sales') {
    // Daily sales
    $stmt = $pdo->prepare("SELECT DATE(sale_date) as date, 
                                  COUNT(*) as transaction_count,
                                  SUM(total_amount) as total_sales,
                                  AVG(total_amount) as avg_sale
                           FROM sales 
                           WHERE sale_date BETWEEN ? AND ? AND status = 'completed'
                           GROUP BY DATE(sale_date)
                           ORDER BY date DESC");
    $stmt->execute([$date_from, $date_to]);
    $daily_sales = $stmt->fetchAll();
    
    // Sales summary
    $stmt = $pdo->prepare("SELECT COUNT(*) as total_transactions,
                                  SUM(total_amount) as total_revenue,
                                  AVG(total_amount) as avg_transaction,
                                  MAX(total_amount) as highest_sale
                           FROM sales 
                           WHERE sale_date BETWEEN ? AND ? AND status = 'completed'");
    $stmt->execute([$date_from, $date_to]);
    $sales_summary = $stmt->fetch();
    
    // Top customers
    $stmt = $pdo->prepare("SELECT customer_name, customer_email,
                                  COUNT(*) as purchase_count,
                                  SUM(total_amount) as total_spent
                           FROM sales 
                           WHERE sale_date BETWEEN ? AND ? AND status = 'completed' AND customer_name IS NOT NULL
                           GROUP BY customer_name, customer_email
                           ORDER BY total_spent DESC
                           LIMIT 10");
    $stmt->execute([$date_from, $date_to]);
    $top_customers = $stmt->fetchAll();
}

// Products Report Data
if ($report_type == 'products') {
    // Product performance
    $stmt = $pdo->prepare("SELECT p.name, p.sku, p.cost_price, p.selling_price,
                                  COALESCE(SUM(si.quantity), 0) as total_sold,
                                  COALESCE(SUM(si.total_price), 0) as total_revenue,
                                  COALESCE(SUM(si.quantity * p.cost_price), 0) as total_cost,
                                  COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price), 0) as total_profit,
                                  p.stock_quantity
                           FROM products p
                           LEFT JOIN sale_items si ON p.id = si.product_id
                           LEFT JOIN sales s ON si.sale_id = s.id AND s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
                           WHERE p.status = 'active'
                           GROUP BY p.id, p.name, p.sku, p.cost_price, p.selling_price, p.stock_quantity
                           ORDER BY total_sold DESC");
    $stmt->execute([$date_from, $date_to]);
    $product_performance = $stmt->fetchAll();
    
    // Low stock products
    $stmt = $pdo->query("SELECT name, sku, stock_quantity, min_stock_level
                         FROM products 
                         WHERE stock_quantity <= min_stock_level AND status = 'active'
                         ORDER BY stock_quantity ASC");
    $low_stock_products = $stmt->fetchAll();
}

// Profit/Loss Report Data
if ($report_type == 'profit') {
    // Monthly profit/loss
    $stmt = $pdo->prepare("SELECT YEAR(s.sale_date) as year,
                                  MONTH(s.sale_date) as month,
                                  MONTHNAME(s.sale_date) as month_name,
                                  SUM(si.total_price) as revenue,
                                  SUM(si.quantity * p.cost_price) as cost,
                                  SUM(si.total_price) - SUM(si.quantity * p.cost_price) as profit,
                                  CASE WHEN SUM(si.quantity * p.cost_price) > 0 
                                       THEN ((SUM(si.total_price) - SUM(si.quantity * p.cost_price)) / SUM(si.quantity * p.cost_price) * 100)
                                       ELSE 0 END as profit_margin
                           FROM sales s
                           JOIN sale_items si ON s.id = si.sale_id
                           JOIN products p ON si.product_id = p.id
                           WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
                           GROUP BY YEAR(s.sale_date), MONTH(s.sale_date), MONTHNAME(s.sale_date)
                           ORDER BY year DESC, month DESC");
    $stmt->execute([$date_from, $date_to]);
    $monthly_profit = $stmt->fetchAll();
    
    // Overall profit summary
    $stmt = $pdo->prepare("SELECT SUM(si.total_price) as total_revenue,
                                  SUM(si.quantity * p.cost_price) as total_cost,
                                  SUM(si.total_price) - SUM(si.quantity * p.cost_price) as total_profit,
                                  CASE WHEN SUM(si.quantity * p.cost_price) > 0 
                                       THEN ((SUM(si.total_price) - SUM(si.quantity * p.cost_price)) / SUM(si.quantity * p.cost_price) * 100)
                                       ELSE 0 END as overall_margin
                           FROM sales s
                           JOIN sale_items si ON s.id = si.sale_id
                           JOIN products p ON si.product_id = p.id
                           WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'");
    $stmt->execute([$date_from, $date_to]);
    $profit_summary = $stmt->fetch();
}

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-chart-bar me-2"></i>Reports</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printReport()">
                <i class="fas fa-print me-1"></i>Print
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="exportReport()">
                <i class="fas fa-download me-1"></i>Export
            </button>
        </div>
    </div>
</div>

<!-- Report Filters -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-3">
            <div class="col-md-3">
                <label for="type" class="form-label">Report Type</label>
                <select class="form-select" id="type" name="type">
                    <option value="sales" <?php echo $report_type == 'sales' ? 'selected' : ''; ?>>Sales Report</option>
                    <option value="products" <?php echo $report_type == 'products' ? 'selected' : ''; ?>>Products Report</option>
                    <option value="profit" <?php echo $report_type == 'profit' ? 'selected' : ''; ?>>Profit/Loss Report</option>
                </select>
            </div>
            <div class="col-md-3">
                <label for="date_from" class="form-label">Date From</label>
                <input type="date" class="form-control" id="date_from" name="date_from" value="<?php echo $date_from; ?>">
            </div>
            <div class="col-md-3">
                <label for="date_to" class="form-label">Date To</label>
                <input type="date" class="form-control" id="date_to" name="date_to" value="<?php echo $date_to; ?>">
            </div>
            <div class="col-md-3">
                <label class="form-label">&nbsp;</label>
                <div class="d-grid">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-chart-bar me-1"></i>Generate Report
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<?php if ($report_type == 'sales'): ?>
<!-- Sales Report -->
<div class="row mb-4">
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($sales_summary['total_transactions'] ?? 0); ?></div>
                    <div class="small">Total Transactions</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-shopping-cart fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card success">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS <?php echo number_format($sales_summary['total_revenue'] ?? 0, 2); ?></div>
                    <div class="small">Total Revenue</div>
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
                    <div class="h5 mb-0">TZS<?php echo number_format($sales_summary['avg_transaction'] ?? 0, 2); ?></div>
                    <div class="small">Average Transaction</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-chart-line fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card warning">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS<?php echo number_format($sales_summary['highest_sale'] ?? 0, 2); ?></div>
                    <div class="small">Highest Sale</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-trophy fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-8 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i>Daily Sales</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover" id="reportTable">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Transactions</th>
                                <th>Total Sales</th>
                                <th>Average Sale</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($daily_sales as $day): ?>
                            <tr>
                                <td><?php echo date('M d, Y', strtotime($day['date'])); ?></td>
                                <td><?php echo number_format($day['transaction_count']); ?></td>
                                <td>TZS<?php echo number_format($day['total_sales'], 2); ?></td>
                                <td>TZS<?php echo number_format($day['avg_sale'], 2); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-lg-4 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-users me-2"></i>Top Customers</h5>
            </div>
            <div class="card-body">
                <?php if (empty($top_customers)): ?>
                    <p class="text-muted text-center">No customer data available.</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Orders</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($top_customers as $customer): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo htmlspecialchars($customer['customer_name']); ?></strong>
                                        <?php if ($customer['customer_email']): ?>
                                        <br><small class="text-muted"><?php echo htmlspecialchars($customer['customer_email']); ?></small>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo number_format($customer['purchase_count']); ?></td>
                                    <td>TZS<?php echo number_format($customer['total_spent'], 2); ?></td>
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

<?php elseif ($report_type == 'products'): ?>
<!-- Products Report -->
<div class="row">
    <div class="col-lg-8 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-box me-2"></i>Product Performance</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover" id="reportTable">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Sold</th>
                                <th>Revenue</th>
                                <th>Profit</th>
                                <th>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($product_performance as $product): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($product['name']); ?></td>
                                <td><?php echo htmlspecialchars($product['sku'] ?: 'N/A'); ?></td>
                                <td><?php echo number_format($product['total_sold']); ?></td>
                                <td>TZS<?php echo number_format($product['total_revenue'], 2); ?></td>
                                <td>
                                    <span class="<?php echo $product['total_profit'] < 0 ? 'text-danger' : 'text-success'; ?>">
                                        TZS<?php echo number_format($product['total_profit'], 2); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-<?php echo $product['stock_quantity'] <= 10 ? 'danger' : 'success'; ?>">
                                        <?php echo $product['stock_quantity']; ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-lg-4 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Low Stock Alert</h5>
            </div>
            <div class="card-body">
                <?php if (empty($low_stock_products)): ?>
                    <p class="text-success text-center">All products are well stocked!</p>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current</th>
                                    <th>Min Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($low_stock_products as $product): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo htmlspecialchars($product['name']); ?></strong>
                                        <?php if ($product['sku']): ?>
                                        <br><small class="text-muted"><?php echo htmlspecialchars($product['sku']); ?></small>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <span class="badge bg-danger"><?php echo $product['stock_quantity']; ?></span>
                                    </td>
                                    <td><?php echo $product['min_stock_level']; ?></td>
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

<?php elseif ($report_type == 'profit'): ?>
<!-- Profit/Loss Report -->
<div class="row mb-4">
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card success">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS<?php echo number_format($profit_summary['total_revenue'] ?? 0, 2); ?></div>
                    <div class="small">Total Revenue</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-dollar-sign fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card warning">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS<?php echo number_format($profit_summary['total_cost'] ?? 0, 2); ?></div>
                    <div class="small">Total Cost</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-coins fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card <?php echo ($profit_summary['total_profit'] ?? 0) >= 0 ? 'success' : 'warning'; ?>">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS<?php echo number_format($profit_summary['total_profit'] ?? 0, 2); ?></div>
                    <div class="small">Total Profit</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-chart-line fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card info">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($profit_summary['overall_margin'] ?? 0, 1); ?>%</div>
                    <div class="small">Profit Margin</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-percentage fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-header">
        <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Monthly Profit/Loss</h5>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover" id="reportTable">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Revenue</th>
                        <th>Cost</th>
                        <th>Profit/Loss</th>
                        <th>Margin %</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($monthly_profit as $month): ?>
                    <tr>
                        <td><?php echo $month['month_name'] . ' ' . $month['year']; ?></td>
                        <td>TZS<?php echo number_format($month['revenue'], 2); ?></td>
                        <td>TZS<?php echo number_format($month['cost'], 2); ?></td>
                        <td>
                            <span class="<?php echo $month['profit'] >= 0 ? 'text-success' : 'text-danger'; ?>">
                                TZS<?php echo number_format($month['profit'], 2); ?>
                            </span>
                        </td>
                        <td>
                            <span class="badge bg-<?php echo $month['profit_margin'] >= 0 ? 'success' : 'danger'; ?>">
                                <?php echo number_format($month['profit_margin'], 1); ?>%
                            </span>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<script>
function printReport() {
    window.print();
}

function exportReport() {
    const reportType = '<?php echo $report_type; ?>';
    const filename = reportType + '_report_' + '<?php echo $date_from; ?>' + '_to_' + '<?php echo $date_to; ?>';
    exportTableToCSV('reportTable', filename);
}
</script>

<?php include 'includes/footer.php'; ?>
