<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Purchases';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle form submissions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'add') {
        $supplier_id = $_POST['supplier_id'] ?: null;
        $purchase_date = $_POST['purchase_date'];
        $notes = trim($_POST['notes']);
        $products = $_POST['products'] ?? [];
        $quantities = $_POST['quantities'] ?? [];
        $costs = $_POST['costs'] ?? [];
        
        if (empty($products)) {
            $message = 'Please add at least one product to the purchase.';
            $messageType = 'danger';
        } else {
            try {
                $pdo->beginTransaction();
                
                // Calculate total
                $total_amount = 0;
                for ($i = 0; $i < count($products); $i++) {
                    $total_amount += floatval($quantities[$i]) * floatval($costs[$i]);
                }
                
                // Insert purchase
                $stmt = $pdo->prepare("INSERT INTO purchases (supplier_id, purchase_date, total_amount, notes, created_by) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$supplier_id, $purchase_date, $total_amount, $notes, $_SESSION['user_id']]);
                $purchase_id = $pdo->lastInsertId();
                
                // Insert purchase items and update stock
                for ($i = 0; $i < count($products); $i++) {
                    $product_id = intval($products[$i]);
                    $quantity = intval($quantities[$i]);
                    $unit_cost = floatval($costs[$i]);
                    $total_cost = $quantity * $unit_cost;
                    
                    // Insert purchase item
                    $stmt = $pdo->prepare("INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$purchase_id, $product_id, $quantity, $unit_cost, $total_cost]);
                    
                    // Update product stock and cost price
                    $stmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?");
                    $stmt->execute([$quantity, $unit_cost, $product_id]);
                    
                    // Record stock movement
                    $stmt = $pdo->prepare("INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by) VALUES (?, 'in', ?, 'purchase', ?, ?)");
                    $stmt->execute([$product_id, $quantity, $purchase_id, $_SESSION['user_id']]);
                }
                
                $pdo->commit();
                $message = 'Purchase recorded successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $pdo->rollBack();
                $message = 'Error recording purchase: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'update_status') {
        $id = intval($_POST['id']);
        $status = $_POST['status'];
        
        try {
            $stmt = $pdo->prepare("UPDATE purchases SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            
            $message = 'Purchase status updated successfully!';
            $messageType = 'success';
        } catch (PDOException $e) {
            $message = 'Error updating purchase status: ' . $e->getMessage();
            $messageType = 'danger';
        }
    }
}

// Get filter parameters
$search = $_GET['search'] ?? '';
$supplier_filter = $_GET['supplier'] ?? '';
$status_filter = $_GET['status'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';

// Pagination parameters
$page = max(1, intval($_GET['page'] ?? 1));
$records_per_page = 20;
$offset = ($page - 1) * $records_per_page;

// Build query
$where_conditions = [];
$params = [];

if (!empty($search)) {
    $where_conditions[] = "(s.name LIKE ? OR p.notes LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if (!empty($supplier_filter)) {
    $where_conditions[] = "p.supplier_id = ?";
    $params[] = $supplier_filter;
}

if (!empty($status_filter)) {
    $where_conditions[] = "p.status = ?";
    $params[] = $status_filter;
}

if (!empty($date_from)) {
    $where_conditions[] = "p.purchase_date >= ?";
    $params[] = $date_from;
}

if (!empty($date_to)) {
    $where_conditions[] = "p.purchase_date <= ?";
    $params[] = $date_to;
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

// Get total count for pagination
$count_stmt = $pdo->prepare("SELECT COUNT(DISTINCT p.id) as total
                            FROM purchases p
                            LEFT JOIN suppliers s ON p.supplier_id = s.id
                            LEFT JOIN users u ON p.created_by = u.id
                            LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                            $where_clause");
$count_stmt->execute($params);
$total_records = $count_stmt->fetch()['total'];
$total_pages = ceil($total_records / $records_per_page);

// Get purchases with pagination
$stmt = $pdo->prepare("SELECT p.*, s.name as supplier_name, u.full_name as created_by_name,
                              DATE_FORMAT(p.purchase_date, '%M %d, %Y') as formatted_date,
                              COUNT(pi.id) as item_count
                       FROM purchases p
                       LEFT JOIN suppliers s ON p.supplier_id = s.id
                       LEFT JOIN users u ON p.created_by = u.id
                       LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                       $where_clause
                       GROUP BY p.id
                       ORDER BY p.created_at DESC
                       LIMIT $records_per_page OFFSET $offset");
$stmt->execute($params);
$purchases = $stmt->fetchAll();

// Get suppliers for filters and forms
$stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name");
$suppliers = $stmt->fetchAll();

// Get products for purchase form
$stmt = $pdo->query("SELECT id, name, cost_price FROM products WHERE status = 'active' ORDER BY name");
$products = $stmt->fetchAll();

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-truck me-2"></i>Purchases</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="exportTableToCSV('purchasesTable', 'purchases')">
                <i class="fas fa-download me-1"></i>Export
            </button>
        </div>
        <button type="button" class="btn btn-sm btn-info" data-bs-toggle="modal" data-bs-target="#purchaseModal">
            <i class="fas fa-plus me-1"></i>Record Purchase
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
            <div class="col-md-2">
                <label for="search" class="form-label">Search</label>
                <input type="text" class="form-control" id="search" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Search...">
            </div>
            <div class="col-md-2">
                <label for="supplier" class="form-label">Supplier</label>
                <select class="form-select" id="supplier" name="supplier">
                    <option value="">All Suppliers</option>
                    <?php foreach ($suppliers as $supplier): ?>
                    <option value="<?php echo $supplier['id']; ?>" <?php echo $supplier_filter == $supplier['id'] ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($supplier['name']); ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label for="status" class="form-label">Status</label>
                <select class="form-select" id="status" name="status">
                    <option value="">All Status</option>
                    <option value="pending" <?php echo $status_filter == 'pending' ? 'selected' : ''; ?>>Pending</option>
                    <option value="received" <?php echo $status_filter == 'received' ? 'selected' : ''; ?>>Received</option>
                    <option value="cancelled" <?php echo $status_filter == 'cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                </select>
            </div>
            <div class="col-md-2">
                <label for="date_from" class="form-label">Date From</label>
                <input type="date" class="form-control" id="date_from" name="date_from" value="<?php echo $date_from; ?>">
            </div>
            <div class="col-md-2">
                <label for="date_to" class="form-label">Date To</label>
                <input type="date" class="form-control" id="date_to" name="date_to" value="<?php echo $date_to; ?>">
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

<!-- Purchases Table -->
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover" id="purchasesTable">
                <thead>
                    <tr>
                        <th>Purchase ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($purchases as $purchase): ?>
                    <tr>
                        <td>#<?php echo str_pad($purchase['id'], 4, '0', STR_PAD_LEFT); ?></td>
                        <td><?php echo $purchase['formatted_date']; ?></td>
                        <td><?php echo htmlspecialchars($purchase['supplier_name'] ?: 'No Supplier'); ?></td>
                        <td>
                            <span class="badge bg-info"><?php echo $purchase['item_count']; ?> items</span>
                        </td>
                        <td>
                            <strong>TZS <?php echo number_format($purchase['total_amount'], 2); ?></strong>
                        </td>
                        <td>
                            <span class="badge bg-<?php echo $purchase['status'] == 'received' ? 'success' : ($purchase['status'] == 'pending' ? 'warning' : 'danger'); ?>">
                                <?php echo ucfirst($purchase['status']); ?>
                            </span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-info" onclick="viewPurchase(<?php echo $purchase['id']; ?>)" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <?php if ($purchase['status'] == 'pending'): ?>
                                <button type="button" class="btn btn-outline-success" onclick="updateStatus(<?php echo $purchase['id']; ?>, 'received')" title="Mark as Received">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger" onclick="updateStatus(<?php echo $purchase['id']; ?>, 'cancelled')" title="Cancel">
                                    <i class="fas fa-times"></i>
                                </button>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <?php if (empty($purchases)): ?>
            <div class="text-center py-4">
                <i class="fas fa-truck fa-3x text-muted mb-3"></i>
                <p class="text-muted">No purchases found.</p>
                <button type="button" class="btn btn-info" data-bs-toggle="modal" data-bs-target="#purchaseModal">
                    <i class="fas fa-plus me-1"></i>Record Your First Purchase
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
                    <?php echo number_format($total_records); ?> purchases
                </small>
            </div>
            <div class="col-md-6">
                <?php if ($total_pages > 1): ?>
                <nav aria-label="Purchases pagination">
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

<!-- Purchase Modal -->
<div class="modal fade" id="purchaseModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-truck me-2"></i>Record Purchase
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST" id="purchaseForm">
                <div class="modal-body">
                    <input type="hidden" name="action" value="add">
                    
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <label for="purchase_date" class="form-label">Purchase Date *</label>
                            <input type="date" class="form-control" id="purchase_date" name="purchase_date" value="<?php echo date('Y-m-d'); ?>" required>
                        </div>
                        <div class="col-md-4">
                            <label for="supplier_id" class="form-label">Supplier</label>
                            <select class="form-select" id="supplier_id" name="supplier_id">
                                <option value="">Select Supplier</option>
                                <?php foreach ($suppliers as $supplier): ?>
                                <option value="<?php echo $supplier['id']; ?>">
                                    <?php echo htmlspecialchars($supplier['name']); ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label for="notes" class="form-label">Notes</label>
                            <input type="text" class="form-control" id="notes" name="notes">
                        </div>
                    </div>
                    
                    <h6 class="mb-3">Purchase Items</h6>
                    <div id="purchaseItems">
                        <div class="purchase-item row mb-3">
                            <div class="col-md-5">
                                <label class="form-label">Product *</label>
                                <select class="form-select product-select" name="products[]" required>
                                    <option value="">Select Product</option>
                                    <?php foreach ($products as $product): ?>
                                    <option value="<?php echo $product['id']; ?>" data-cost="<?php echo $product['cost_price']; ?>">
                                        <?php echo htmlspecialchars($product['name']); ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Quantity *</label>
                                <input type="number" class="form-control quantity-input" name="quantities[]" min="1" value="1" required>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Unit Cost *</label>
                                <input type="number" class="form-control cost-input" name="costs[]" step="0.01" min="0" required>
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
                            <button type="button" class="btn btn-outline-primary" id="addPurchaseItem">
                                <i class="fas fa-plus me-1"></i>Add Item
                            </button>
                        </div>
                        <div class="col-md-6 text-end">
                            <h5>Total: <span id="purchaseGrandTotal">TZS 0.00</span></h5>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-info">
                        <i class="fas fa-save me-1"></i>Record Purchase
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Purchase Details Modal -->
<div class="modal fade" id="purchaseDetailsModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-receipt me-2"></i>Purchase Details
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="purchaseDetailsContent">
                <!-- Content loaded via AJAX -->
            </div>
        </div>
    </div>
</div>

<!-- Status Update Form -->
<form id="statusForm" method="POST" style="display: none;">
    <input type="hidden" name="action" value="update_status">
    <input type="hidden" name="id" id="statusId">
    <input type="hidden" name="status" id="statusValue">
</form>

<script>
let purchaseItemCount = 1;

// Add new purchase item
document.getElementById('addPurchaseItem').addEventListener('click', function() {
    const purchaseItems = document.getElementById('purchaseItems');
    const newItem = document.querySelector('.purchase-item').cloneNode(true);
    
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
    
    purchaseItems.appendChild(newItem);
    purchaseItemCount++;
    
    // Add event listeners to new item
    addPurchaseItemEventListeners(newItem);
    updatePurchaseRemoveButtons();
});

// Remove purchase item
function removePurchaseItem(button) {
    button.closest('.purchase-item').remove();
    purchaseItemCount--;
    updatePurchaseRemoveButtons();
    calculatePurchaseGrandTotal();
}

// Update remove button visibility
function updatePurchaseRemoveButtons() {
    const items = document.querySelectorAll('.purchase-item');
    items.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-item');
        if (items.length > 1) {
            removeBtn.style.display = 'block';
            removeBtn.onclick = () => removePurchaseItem(removeBtn);
        } else {
            removeBtn.style.display = 'none';
        }
    });
}

// Add event listeners to purchase item
function addPurchaseItemEventListeners(item) {
    const productSelect = item.querySelector('.product-select');
    const quantityInput = item.querySelector('.quantity-input');
    const costInput = item.querySelector('.cost-input');
    
    productSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const cost = selectedOption.dataset.cost || 0;
        
        costInput.value = cost;
        calculatePurchaseItemTotal(item);
    });
    
    quantityInput.addEventListener('input', () => calculatePurchaseItemTotal(item));
    costInput.addEventListener('input', () => calculatePurchaseItemTotal(item));
}

// Calculate purchase item total
function calculatePurchaseItemTotal(item) {
    const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
    const cost = parseFloat(item.querySelector('.cost-input').value) || 0;
    const total = quantity * cost;
    
    item.querySelector('.item-total').textContent = 'TZS' + total.toFixed(2);
    calculatePurchaseGrandTotal();
}

// Calculate purchase grand total
function calculatePurchaseGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.purchase-item').forEach(item => {
        const quantity = parseFloat(item.querySelector('.quantity-input').value) || 0;
        const cost = parseFloat(item.querySelector('.cost-input').value) || 0;
        grandTotal += quantity * cost;
    });
    
    document.getElementById('purchaseGrandTotal').textContent = 'TZS' + grandTotal.toFixed(2);
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    addPurchaseItemEventListeners(document.querySelector('.purchase-item'));
});

// View purchase details
function viewPurchase(id) {
    fetch('ajax/purchase_details.php?id=' + id)
        .then(response => response.text())
        .then(data => {
            document.getElementById('purchaseDetailsContent').innerHTML = data;
            const modal = new bootstrap.Modal(document.getElementById('purchaseDetailsModal'));
            modal.show();
        })
        .catch(error => {
            alert('Error loading purchase details');
        });
}

// Update purchase status
function updateStatus(id, status) {
    const message = status === 'received' ? 'Mark this purchase as received?' : 'Cancel this purchase?';
    if (confirm(message)) {
        document.getElementById('statusId').value = id;
        document.getElementById('statusValue').value = status;
        document.getElementById('statusForm').submit();
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
        const dateInput = document.getElementById('purchase_date');
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
