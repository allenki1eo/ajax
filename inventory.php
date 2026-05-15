<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Inventory Management';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle stock adjustments
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'adjust_stock') {
        $product_id = intval($_POST['product_id']);
        $adjustment_type = $_POST['adjustment_type'];
        $quantity = intval($_POST['quantity']);
        $notes = trim($_POST['notes']);
        
        if ($quantity <= 0) {
            $message = 'Quantity must be greater than 0.';
            $messageType = 'danger';
        } else {
            try {
                $pdo->beginTransaction();
                
                // Get current stock
                $stmt = $pdo->prepare("SELECT stock_quantity, name FROM products WHERE id = ?");
                $stmt->execute([$product_id]);
                $product = $stmt->fetch();
                
                if (!$product) {
                    throw new Exception('Product not found.');
                }
                
                $current_stock = $product['stock_quantity'];
                $new_stock = $adjustment_type == 'increase' ? $current_stock + $quantity : $current_stock - $quantity;
                
                if ($new_stock < 0) {
                    throw new Exception('Cannot reduce stock below zero.');
                }
                
                // Update product stock
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
                $stmt->execute([$new_stock, $product_id]);
                
                // Record stock movement
                $movement_type = $adjustment_type == 'increase' ? 'in' : 'out';
                $stmt = $pdo->prepare("INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, ?, ?, 'adjustment', ?, ?)");
                $stmt->execute([$product_id, $movement_type, $quantity, $notes, $_SESSION['user_id']]);
                
                $pdo->commit();
                $message = 'Stock adjusted successfully for ' . htmlspecialchars($product['name']) . '!';
                $messageType = 'success';
            } catch (Exception $e) {
                $pdo->rollBack();
                $message = 'Error adjusting stock: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    }
}

// Get filter parameters
$search = $_GET['search'] ?? '';
$category_filter = $_GET['category'] ?? '';
$stock_filter = $_GET['filter'] ?? '';

// Pagination parameters
$page = max(1, intval($_GET['page'] ?? 1));
$records_per_page = 15;
$offset = ($page - 1) * $records_per_page;

// Build query conditions
$where_conditions = ["p.status = 'active'"];
$params = [];

if (!empty($search)) {
    $where_conditions[] = "(p.name LIKE ? OR p.sku LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if (!empty($category_filter)) {
    $where_conditions[] = "p.category_id = ?";
    $params[] = $category_filter;
}

if ($stock_filter == 'low_stock') {
    $where_conditions[] = "p.stock_quantity <= p.min_stock_level";
} elseif ($stock_filter == 'out_of_stock') {
    $where_conditions[] = "p.stock_quantity = 0";
} elseif ($stock_filter == 'overstocked') {
    $where_conditions[] = "p.stock_quantity > (p.min_stock_level * 3)";
}

$where_clause = 'WHERE ' . implode(' AND ', $where_conditions);

// Get total count for pagination
$count_stmt = $pdo->prepare("SELECT COUNT(*) as total
                            FROM products p
                            LEFT JOIN categories c ON p.category_id = c.id
                            LEFT JOIN suppliers s ON p.supplier_id = s.id
                            $where_clause");
$count_stmt->execute($params);
$total_records = $count_stmt->fetch()['total'];
$total_pages = ceil($total_records / $records_per_page);

// Get inventory data with pagination
$stmt = $pdo->prepare("SELECT p.*, c.name as category_name, s.name as supplier_name,
                              (p.stock_quantity * p.cost_price) as stock_value,
                              CASE 
                                  WHEN p.stock_quantity = 0 THEN 'Out of Stock'
                                  WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
                                  WHEN p.stock_quantity > (p.min_stock_level * 3) THEN 'Overstocked'
                                  ELSE 'Normal'
                              END as stock_status
                       FROM products p
                       LEFT JOIN categories c ON p.category_id = c.id
                       LEFT JOIN suppliers s ON p.supplier_id = s.id
                       $where_clause
                       ORDER BY p.name
                       LIMIT $records_per_page OFFSET $offset");
$stmt->execute($params);
$inventory = $stmt->fetchAll();

// Get categories for filter
$stmt = $pdo->query("SELECT * FROM categories ORDER BY name");
$categories = $stmt->fetchAll();

// Get inventory summary
$stmt = $pdo->query("SELECT 
                        COUNT(*) as total_products,
                        COALESCE(SUM(stock_quantity), 0) as total_items,
                        COALESCE(SUM(stock_quantity * cost_price), 0) as total_value,
                        COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END) as low_stock_count,
                        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_count
                     FROM products 
                     WHERE status = 'active'");
$summary = $stmt->fetch();

// Get recent stock movements
$stmt = $pdo->query("SELECT sm.*, p.name as product_name, u.full_name as user_name,
                            DATE_FORMAT(sm.created_at, '%M %d, %Y at %h:%i %p') as formatted_date
                     FROM stock_movements sm
                     JOIN products p ON sm.product_id = p.id
                     LEFT JOIN users u ON sm.created_by = u.id
                     ORDER BY sm.created_at DESC
                     LIMIT 10");
$recent_movements = $stmt->fetchAll();

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-warehouse me-2"></i>Inventory Management</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="exportTableToCSV('inventoryTable', 'inventory')">
                <i class="fas fa-download me-1"></i>Export
            </button>
        </div>
        <button type="button" class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#adjustStockModal">
            <i class="fas fa-edit me-1"></i>Adjust Stock
        </button>
    </div>
</div>

<?php if ($message): ?>
<div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
    <?php echo $message; ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
<?php endif; ?>

<!-- Inventory Summary -->
<div class="row mb-4">
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($summary['total_products']); ?></div>
                    <div class="small">Total Products</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-box fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card info">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0"><?php echo number_format($summary['total_items']); ?></div>
                    <div class="small">Total Items in Stock</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-cubes fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="stats-card success">
            <div class="d-flex justify-content-between">
                <div>
                    <div class="h5 mb-0">TZS <?php echo number_format($summary['total_value'], 2); ?></div>
                    <div class="small">Total Stock Value</div>
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
                    <div class="h5 mb-0"><?php echo number_format($summary['low_stock_count']); ?></div>
                    <div class="small">Low Stock Alerts</div>
                </div>
                <div class="align-self-center">
                    <i class="fas fa-exclamation-triangle fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Filters -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-3">
            <div class="col-md-3">
                <label for="search" class="form-label">Search Products</label>
                <input type="text" class="form-control" id="search" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Search products...">
            </div>
            <div class="col-md-3">
                <label for="category" class="form-label">Category</label>
                <select class="form-select" id="category" name="category">
                    <option value="">All Categories</option>
                    <?php foreach ($categories as $category): ?>
                    <option value="<?php echo $category['id']; ?>" <?php echo $category_filter == $category['id'] ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($category['name']); ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label for="filter" class="form-label">Stock Status</label>
                <select class="form-select" id="filter" name="filter">
                    <option value="">All Products</option>
                    <option value="low_stock" <?php echo $stock_filter == 'low_stock' ? 'selected' : ''; ?>>Low Stock</option>
                    <option value="out_of_stock" <?php echo $stock_filter == 'out_of_stock' ? 'selected' : ''; ?>>Out of Stock</option>
                    <option value="overstocked" <?php echo $stock_filter == 'overstocked' ? 'selected' : ''; ?>>Overstocked</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">&nbsp;</label>
                <div class="d-grid">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search me-1"></i>Filter
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="row">
    <!-- Inventory Table -->
    <div class="col-lg-8 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-list me-2"></i>Inventory List</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover" id="inventoryTable">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Current Stock</th>
                                <th>Min Level</th>
                                <th>Stock Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($inventory as $item): ?>
                            <tr>
                                <td>
                                    <strong><?php echo htmlspecialchars($item['name']); ?></strong>
                                    <?php if ($item['sku']): ?>
                                    <br><small class="text-muted">SKU: <?php echo htmlspecialchars($item['sku']); ?></small>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo htmlspecialchars($item['category_name'] ?: 'Uncategorized'); ?></td>
                                <td>
                                    <span class="fw-bold"><?php echo number_format($item['stock_quantity']); ?></span>
                                </td>
                                <td><?php echo number_format($item['min_stock_level']); ?></td>
                                <td>TZS <?php echo number_format($item['stock_value'], 2); ?></td>
                                <td>
                                    <?php
                                    $status_class = 'secondary';
                                    if ($item['stock_status'] == 'Low Stock' || $item['stock_status'] == 'Out of Stock') {
                                        $status_class = 'danger';
                                    } elseif ($item['stock_status'] == 'Overstocked') {
                                        $status_class = 'warning';
                                    } elseif ($item['stock_status'] == 'Normal') {
                                        $status_class = 'success';
                                    }
                                    ?>
                                    <span class="badge bg-<?php echo $status_class; ?>">
                                        <?php echo $item['stock_status']; ?>
                                    </span>
                                </td>
                                <td>
                                    <button type="button" class="btn btn-sm btn-outline-warning" onclick="adjustStock(<?php echo $item['id']; ?>, '<?php echo htmlspecialchars($item['name']); ?>', <?php echo $item['stock_quantity']; ?>)">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    
                    <?php if (empty($inventory)): ?>
                    <div class="text-center py-4">
                        <i class="fas fa-warehouse fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No inventory items found.</p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <?php if ($total_records > 0): ?>
            <!-- Pagination Info and Controls -->
            <div class="card-footer">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <small class="text-muted">
                            Showing <?php echo number_format(min($offset + 1, $total_records)); ?> to 
                            <?php echo number_format(min($offset + $records_per_page, $total_records)); ?> of 
                            <?php echo number_format($total_records); ?> products
                        </small>
                    </div>
                    <div class="col-md-6">
                        <?php if ($total_pages > 1): ?>
                        <nav aria-label="Inventory pagination">
                            <ul class="pagination pagination-sm justify-content-end mb-0">
                                <!-- Previous Page -->
                                <li class="page-item <?php echo $page <= 1 ? 'disabled' : ''; ?>">
                                    <a class="page-link" href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page - 1])); ?>">
                                        <i class="fas fa-chevron-left"></i>
                                    </a>
                                </li>
                                
                                <?php
                                // Calculate page range to show
                                $start_page = max(1, $page - 2);
                                $end_page = min($total_pages, $page + 2);
                                
                                // Show first page if not in range
                                if ($start_page > 1): ?>
                                    <li class="page-item">
                                        <a class="page-link" href="?<?php echo http_build_query(array_merge($_GET, ['page' => 1])); ?>">1</a>
                                    </li>
                                    <?php if ($start_page > 2): ?>
                                        <li class="page-item disabled"><span class="page-link">...</span></li>
                                    <?php endif; ?>
                                <?php endif; ?>
                                
                                <!-- Page Numbers -->
                                <?php for ($i = $start_page; $i <= $end_page; $i++): ?>
                                    <li class="page-item <?php echo $i == $page ? 'active' : ''; ?>">
                                        <a class="page-link" href="?<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>"><?php echo $i; ?></a>
                                    </li>
                                <?php endfor; ?>
                                
                                <!-- Show last page if not in range -->
                                <?php if ($end_page < $total_pages): ?>
                                    <?php if ($end_page < $total_pages - 1): ?>
                                        <li class="page-item disabled"><span class="page-link">...</span></li>
                                    <?php endif; ?>
                                    <li class="page-item">
                                        <a class="page-link" href="?<?php echo http_build_query(array_merge($_GET, ['page' => $total_pages])); ?>"><?php echo $total_pages; ?></a>
                                    </li>
                                <?php endif; ?>
                                
                                <!-- Next Page -->
                                <li class="page-item <?php echo $page >= $total_pages ? 'disabled' : ''; ?>">
                                    <a class="page-link" href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page + 1])); ?>">
                                        <i class="fas fa-chevron-right"></i>
                                    </a>
                                </li>
                            </ul>
                        </nav>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Recent Stock Movements -->
    <div class="col-lg-4 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-history me-2"></i>Recent Movements</h5>
            </div>
            <div class="card-body">
                <?php if (empty($recent_movements)): ?>
                    <p class="text-muted text-center">No stock movements recorded yet.</p>
                <?php else: ?>
                    <div class="timeline">
                        <?php foreach ($recent_movements as $movement): ?>
                        <div class="timeline-item mb-3">
                            <div class="d-flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-<?php echo $movement['movement_type'] == 'in' ? 'arrow-up text-success' : 'arrow-down text-danger'; ?>"></i>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <div class="fw-bold"><?php echo htmlspecialchars($movement['product_name']); ?></div>
                                    <div class="small text-muted">
                                        <?php echo ucfirst($movement['movement_type']); ?>: <?php echo number_format($movement['quantity']); ?> items
                                        <br><?php echo ucfirst($movement['reference_type']); ?>
                                        <?php if ($movement['notes']): ?>
                                        <br><em><?php echo htmlspecialchars($movement['notes']); ?></em>
                                        <?php endif; ?>
                                        <br><small><?php echo $movement['formatted_date']; ?></small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Adjust Stock Modal -->
<div class="modal fade" id="adjustStockModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-edit me-2"></i>Adjust Stock
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST">
                <div class="modal-body">
                    <input type="hidden" name="action" value="adjust_stock">
                    
                    <div class="mb-3">
                        <label for="product_id" class="form-label">Product *</label>
                        <select class="form-select" id="product_id" name="product_id" required>
                            <option value="">Select Product</option>
                            <?php foreach ($inventory as $item): ?>
                            <option value="<?php echo $item['id']; ?>" data-stock="<?php echo $item['stock_quantity']; ?>">
                                <?php echo htmlspecialchars($item['name']); ?> (Current: <?php echo $item['stock_quantity']; ?>)
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="adjustment_type" class="form-label">Adjustment Type *</label>
                                <select class="form-select" id="adjustment_type" name="adjustment_type" required>
                                    <option value="increase">Increase Stock</option>
                                    <option value="decrease">Decrease Stock</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="quantity" class="form-label">Quantity *</label>
                                <input type="number" class="form-control" id="quantity" name="quantity" min="1" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3" placeholder="Reason for adjustment..."></textarea>
                    </div>
                    
                    <div id="stockPreview" class="alert alert-info" style="display: none;">
                        <strong>Current Stock:</strong> <span id="currentStock">0</span><br>
                        <strong>New Stock:</strong> <span id="newStock">0</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-warning">
                        <i class="fas fa-save me-1"></i>Adjust Stock
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function adjustStock(productId, productName, currentStock) {
    document.getElementById('product_id').value = productId;
    updateStockPreview();
    
    const modal = new bootstrap.Modal(document.getElementById('adjustStockModal'));
    modal.show();
}

// Update stock preview
function updateStockPreview() {
    const productSelect = document.getElementById('product_id');
    const adjustmentType = document.getElementById('adjustment_type').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    
    if (productSelect.value && quantity > 0) {
        const currentStock = parseInt(productSelect.options[productSelect.selectedIndex].dataset.stock) || 0;
        const newStock = adjustmentType === 'increase' ? currentStock + quantity : currentStock - quantity;
        
        document.getElementById('currentStock').textContent = currentStock;
        document.getElementById('newStock').textContent = newStock;
        document.getElementById('stockPreview').style.display = 'block';
        
        // Warning for negative stock
        if (newStock < 0) {
            document.getElementById('stockPreview').className = 'alert alert-danger';
        } else {
            document.getElementById('stockPreview').className = 'alert alert-info';
        }
    } else {
        document.getElementById('stockPreview').style.display = 'none';
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('product_id').addEventListener('change', updateStockPreview);
    document.getElementById('adjustment_type').addEventListener('change', updateStockPreview);
    document.getElementById('quantity').addEventListener('input', updateStockPreview);
});
</script>

<?php include 'includes/footer.php'; ?>
