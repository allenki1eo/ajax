<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Sales';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle form submissions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'add') {
        $sale_date = $_POST['sale_date'];
        $customer_name = trim($_POST['customer_name']);
        $customer_email = trim($_POST['customer_email']);
        $customer_phone = trim($_POST['customer_phone']);
        $payment_method = $_POST['payment_method'];
        $notes = trim($_POST['notes']);
        $products = $_POST['products'] ?? [];
        $quantities = $_POST['quantities'] ?? [];
        $prices = $_POST['prices'] ?? [];
        
        if (empty($products)) {
            $message = 'Please add at least one product to the sale.';
            $messageType = 'danger';
        } else {
            try {
                $pdo->beginTransaction();
                
                // Calculate total
                $total_amount = 0;
                for ($i = 0; $i < count($products); $i++) {
                    $total_amount += floatval($quantities[$i]) * floatval($prices[$i]);
                }
                
                // Insert sale
                $stmt = $pdo->prepare("INSERT INTO sales (sale_date, customer_name, customer_email, customer_phone, total_amount, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$sale_date, $customer_name, $customer_email, $customer_phone, $total_amount, $payment_method, $notes, $_SESSION['user_id']]);
                $sale_id = $pdo->lastInsertId();
                
                // Insert sale items and update stock
                for ($i = 0; $i < count($products); $i++) {
                    $product_id = intval($products[$i]);
                    $quantity = intval($quantities[$i]);
                    $unit_price = floatval($prices[$i]);
                    $total_price = $quantity * $unit_price;
                    
                    // Insert sale item
                    $stmt = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$sale_id, $product_id, $quantity, $unit_price, $total_price]);
                    
                    // Update product stock
                    $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
                    $stmt->execute([$quantity, $product_id]);
                    
                    // Record stock movement
                    $stmt = $pdo->prepare("INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by) VALUES (?, 'out', ?, 'sale', ?, ?)");
                    $stmt->execute([$product_id, $quantity, $sale_id, $_SESSION['user_id']]);
                }
                
                $pdo->commit();
                $message = 'Sale recorded successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $pdo->rollBack();
                $message = 'Error recording sale: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'delete') {
        $id = intval($_POST['id']);
        
        try {
            $pdo->beginTransaction();
            
            // Get sale items to restore stock
            $stmt = $pdo->prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?");
            $stmt->execute([$id]);
            $sale_items = $stmt->fetchAll();
            
            // Restore stock
            foreach ($sale_items as $item) {
                $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
                $stmt->execute([$item['quantity'], $item['product_id']]);
                
                // Record stock movement
                $stmt = $pdo->prepare("INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, 'in', ?, 'return', ?, 'Sale cancellation', ?)");
                $stmt->execute([$item['product_id'], $item['quantity'], $id, $_SESSION['user_id']]);
            }
            
            // Update sale status
            $stmt = $pdo->prepare("UPDATE sales SET status = 'cancelled' WHERE id = ?");
            $stmt->execute([$id]);
            
            $pdo->commit();
            $message = 'Sale cancelled successfully!';
            $messageType = 'success';
        } catch (PDOException $e) {
            $pdo->rollBack();
            $message = 'Error cancelling sale: ' . $e->getMessage();
            $messageType = 'danger';
        }
    }
}

// Get filter parameters
$search = $_GET['search'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';
$status_filter = $_GET['status'] ?? '';

// Pagination parameters
$page = max(1, intval($_GET['page'] ?? 1));
$records_per_page = 20;
$offset = ($page - 1) * $records_per_page;

// Build query
$where_conditions = [];
$params = [];

if (!empty($search)) {
    $where_conditions[] = "(s.customer_name LIKE ? OR s.customer_email LIKE ? OR s.customer_phone LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if (!empty($date_from)) {
    $where_conditions[] = "s.sale_date >= ?";
    $params[] = $date_from;
}

if (!empty($date_to)) {
    $where_conditions[] = "s.sale_date <= ?";
    $params[] = $date_to;
}

if (!empty($status_filter)) {
    $where_conditions[] = "s.status = ?";
    $params[] = $status_filter;
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

// Get total count for pagination
$count_stmt = $pdo->prepare("SELECT COUNT(DISTINCT s.id) as total
                            FROM sales s
                            LEFT JOIN users u ON s.created_by = u.id
                            LEFT JOIN sale_items si ON s.id = si.sale_id
                            $where_clause");
$count_stmt->execute($params);
$total_records = $count_stmt->fetch()['total'];
$total_pages = ceil($total_records / $records_per_page);

// Get sales with pagination
$stmt = $pdo->prepare("SELECT s.*, u.full_name as created_by_name,
                              DATE_FORMAT(s.sale_date, '%M %d, %Y') as formatted_date,
                              COUNT(si.id) as item_count
                       FROM sales s
                       LEFT JOIN users u ON s.created_by = u.id
                       LEFT JOIN sale_items si ON s.id = si.sale_id
                       $where_clause
                       GROUP BY s.id
                       ORDER BY s.created_at DESC
                       LIMIT $records_per_page OFFSET $offset");
$stmt->execute($params);
$sales = $stmt->fetchAll();

// Get products for sale form
$stmt = $pdo->query("SELECT id, name, selling_price, stock_quantity FROM products WHERE status = 'active' AND stock_quantity > 0 ORDER BY name");
$products = $stmt->fetchAll();

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-shopping-cart me-2"></i>Sales</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="exportTableToCSV('salesTable', 'sales')">
                <i class="fas fa-download me-1"></i>Export
            </button>
        </div>
        <button type="button" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#saleModal">
            <i class="fas fa-plus me-1"></i>New Sale
        </button>
    </div>
</div>

<?php if ($message): ?>
<div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
    <?php echo $message; ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
<?php endif; ?>

<!-- Filters -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-3">
            <div class="col-md-3">
                <label for="search" class="form-label">Search Customer</label>
                <input type="text" class="form-control" id="search" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Search customers...">
            </div>
            <div class="col-md-2">
                <label for="date_from" class="form-label">Date From</label>
                <input type="date" class="form-control" id="date_from" name="date_from" value="<?php echo $date_from; ?>">
            </div>
            <div class="col-md-2">
                <label for="date_to" class="form-label">Date To</label>
                <input type="date" class="form-control" id="date_to" name="date_to" value="<?php echo $date_to; ?>">
            </div>
            <div class="col-md-3">
                <label for="status" class="form-label">Status</label>
                <select class="form-select" id="status" name="status">
                    <option value="">All Status</option>
                    <option value="completed" <?php echo $status_filter == 'completed' ? 'selected' : ''; ?>>Completed</option>
                    <option value="pending" <?php echo $status_filter == 'pending' ? 'selected' : ''; ?>>Pending</option>
                    <option value="cancelled" <?php echo $status_filter == 'cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                </select>
            </div>
            <div class="col-md-2">
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

<!-- Sales Table -->
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover" id="salesTable">
                <thead>
                    <tr>
                        <th>Sale ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                        <th>Payment Method</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($sales as $sale): ?>
                    <tr>
                        <td>#<?php echo str_pad($sale['id'], 4, '0', STR_PAD_LEFT); ?></td>
                        <td><?php echo $sale['formatted_date']; ?></td>
                        <td>
                            <strong><?php echo htmlspecialchars($sale['customer_name'] ?: 'Walk-in Customer'); ?></strong>
                            <?php if ($sale['customer_email']): ?>
                            <br><small class="text-muted"><?php echo htmlspecialchars($sale['customer_email']); ?></small>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="badge bg-info"><?php echo $sale['item_count']; ?> items</span>
                        </td>
                        <td>
                            <strong>TZS <?php echo number_format($sale['total_amount'], 2); ?></strong>
                        </td>
                        <td>
                            <span class="badge bg-secondary"><?php echo ucfirst(str_replace('_', ' ', $sale['payment_method'])); ?></span>
                        </td>
                        <td>
                            <span class="badge bg-<?php echo $sale['status'] == 'completed' ? 'success' : ($sale['status'] == 'pending' ? 'warning' : 'danger'); ?>">
                                <?php echo ucfirst($sale['status']); ?>
                            </span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-info" onclick="viewSale(<?php echo $sale['id']; ?>)" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <?php if ($sale['status'] != 'cancelled'): ?>
                                <button type="button" class="btn btn-outline-danger" onclick="cancelSale(<?php echo $sale['id']; ?>)" title="Cancel Sale">
                                    <i class="fas fa-times"></i>
                                </button>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <?php if (empty($sales)): ?>
            <div class="text-center py-4">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <p class="text-muted">No sales found.</p>
                <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#saleModal">
                    <i class="fas fa-plus me-1"></i>Record Your First Sale
                </button>
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
                    <?php echo number_format($total_records); ?> sales
                </small>
            </div>
            <div class="col-md-6">
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Sales pagination">
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

<!-- Sale Modal -->
<div class="modal fade" id="saleModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-shopping-cart me-2"></i>New Sale
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST" id="saleForm">
                <div class="modal-body">
                    <input type="hidden" name="action" value="add">
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <label for="sale_date" class="form-label">Sale Date *</label>
                            <input type="date" class="form-control" id="sale_date" name="sale_date" value="<?php echo date('Y-m-d'); ?>" required>
                        </div>
                        <div class="col-md-3">
                            <label for="customer_name" class="form-label">Customer Name</label>
                            <input type="text" class="form-control" id="customer_name" name="customer_name">
                        </div>
                        <div class="col-md-3">
                            <label for="customer_email" class="form-label">Customer Email</label>
                            <input type="email" class="form-control" id="customer_email" name="customer_email">
                        </div>
                        <div class="col-md-3">
                            <label for="customer_phone" class="form-label">Customer Phone</label>
                            <input type="text" class="form-control" id="customer_phone" name="customer_phone">
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <label for="payment_method" class="form-label">Payment Method *</label>
                            <select class="form-select" id="payment_method" name="payment_method" required>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label for="notes" class="form-label">Notes</label>
                            <input type="text" class="form-control" id="notes" name="notes">
                        </div>
                    </div>
                    
                    <h6 class="mb-3">Sale Items</h6>
                    <div id="saleItems">
                        <div class="sale-item row mb-3">
                            <div class="col-md-5">
                                <label class="form-label">Product *</label>
                                <select class="form-select product-select" name="products[]" required>
                                    <option value="">Select Product</option>
                                    <?php foreach ($products as $product): ?>
                                    <option value="<?php echo $product['id']; ?>" data-price="<?php echo $product['selling_price']; ?>" data-stock="<?php echo $product['stock_quantity']; ?>">
                                        <?php echo htmlspecialchars($product['name']); ?> (Stock: <?php echo $product['stock_quantity']; ?>)
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Quantity *</label>
                                <input type="number" class="form-control quantity-input" name="quantities[]" min="1" value="1" required>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Unit Price *</label>
                                <input type="number" class="form-control price-input" name="prices[]" step="0.01" min="0" required>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Total</label>
                                <div class="form-control-plaintext fw-bold item-total">$0.00</div>
                            </div>
                            <div class="col-md-1">
                                <label class="form-label">&nbsp;</label>
                                <button type="button" class="btn btn-outline-danger btn-sm remove-item" style="display: none;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <button type="button" class="btn btn-outline-primary" id="addItem">
                                <i class="fas fa-plus me-1"></i>Add Item
                            </button>
                        </div>
                        <div class="col-md-6 text-end">
                            <h5>Total: <span id="grandTotal">TZS 0.00</span></h5>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-save me-1"></i>Record Sale
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Sale Details Modal -->
<div class="modal fade" id="saleDetailsModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-receipt me-2"></i>Sale Details
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="saleDetailsContent">
                <!-- Content loaded via AJAX -->
            </div>
        </div>
    </div>
</div>

<!-- Delete Form -->
<form id="cancelForm" method="POST" style="display: none;">
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="id" id="cancelId">
</form>

<script>
let itemCount = 1;

// Add new sale item
document.getElementById('addItem').addEventListener('click', function() {
    const saleItems = document.getElementById('saleItems');
    const newItem = document.querySelector('.sale-item').cloneNode(true);
    
    // Reset values
    newItem.querySelectorAll('input, select').forEach(input => {
        if (input.type === 'number') {
            input.value = input.name === 'quantities[]' ? '1' : '';
        } else {
            input.value = '';
        }
    });
    
    newItem.querySelector('.item-total').textContent = 'TZS0.00';
    newItem.querySelector('.remove-item').style.display = 'block';
    
    saleItems.appendChild(newItem);
    itemCount++;
    
    // Add event listeners to new item
    addItemEventListeners(newItem);
    updateRemoveButtons();
});

// Remove sale item
function removeItem(button) {
    button.closest('.sale-item').remove();
    itemCount--;
    updateRemoveButtons();
    calculateGrandTotal();
}

// Update remove button visibility
function updateRemoveButtons() {
    const items = document.querySelectorAll('.sale-item');
    items.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-item');
        if (items.length > 1) {
            removeBtn.style.display = 'block';
            removeBtn.onclick = () => removeItem(removeBtn);
        } else {
            removeBtn.style.display = 'none';
        }
    });
}

// Add event listeners to sale item
function addItemEventListeners(item) {
    const productSelect = item.querySelector('.product-select');
    const quantityInput = item.querySelector('.quantity-input');
    const priceInput = item.querySelector('.price-input');
    
    productSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const price = selectedOption.dataset.price || 0;
        const stock = selectedOption.dataset.stock || 0;
        
        priceInput.value = price;
        quantityInput.max = stock;
        calculateItemTotal(item);
    });
    
    quantityInput.addEventListener('input', () => calculateItemTotal(item));
    priceInput.addEventListener('input', () => calculateItemTotal(item));
}

// Calculate item total
function calculateItemTotal(item) {
    const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
    const price = parseFloat(item.querySelector('.price-input').value) || 0;
    const total = quantity * price;
    
    item.querySelector('.item-total').textContent = '$' + total.toFixed(2);
    calculateGrandTotal();
}

// Calculate grand total
function calculateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.sale-item').forEach(item => {
        const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
        const price = parseFloat(item.querySelector('.price-input').value) || 0;
        grandTotal += quantity * price;
    });
    
    document.getElementById('grandTotal').textContent = 'TZS' + grandTotal.toFixed(2);
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    addItemEventListeners(document.querySelector('.sale-item'));
});

// View sale details
function viewSale(id) {
    fetch('ajax/sale_details.php?id=' + id)
        .then(response => response.text())
        .then(data => {
            document.getElementById('saleDetailsContent').innerHTML = data;
            const modal = new bootstrap.Modal(document.getElementById('saleDetailsModal'));
            modal.show();
        })
        .catch(error => {
            alert('Error loading sale details');
        });
}

// Cancel sale
function cancelSale(id) {
    if (confirmDelete('Are you sure you want to cancel this sale? This will restore the stock quantities.')) {
        document.getElementById('cancelId').value = id;
        document.getElementById('cancelForm').submit();
    }
}

// Auto-advance date inputs at local midnight without page refresh
(function autoAdvanceDateAtMidnight() {
    function setTodayDate() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        const dateInput = document.getElementById('sale_date');
        if (dateInput && dateInput.value !== today) {
            dateInput.value = today;
        }
    }

    function scheduleNextMidnightTick() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0); // next local midnight
        const ms = nextMidnight.getTime() - now.getTime();
        setTimeout(() => {
            setTodayDate();
            scheduleNextMidnightTick();
        }, ms);
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
        setTodayDate();
        scheduleNextMidnightTick();
    });
})();
</script>

<?php include 'includes/footer.php'; ?>
