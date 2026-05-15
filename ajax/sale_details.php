<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

$auth->requireLogin();

$sale_id = intval($_GET['id'] ?? 0);

if (!$sale_id) {
    echo '<p class="text-danger">Invalid sale ID.</p>';
    exit;
}

$pdo = getDBConnection();

// Get sale details
$stmt = $pdo->prepare("SELECT s.*, u.full_name as created_by_name,
                              DATE_FORMAT(s.sale_date, '%M %d, %Y') as formatted_date,
                              DATE_FORMAT(s.created_at, '%M %d, %Y at %h:%i %p') as created_at_formatted
                       FROM sales s
                       LEFT JOIN users u ON s.created_by = u.id
                       WHERE s.id = ?");
$stmt->execute([$sale_id]);
$sale = $stmt->fetch();

if (!$sale) {
    echo '<p class="text-danger">Sale not found.</p>';
    exit;
}

// Get sale items
$stmt = $pdo->prepare("SELECT si.*, p.name as product_name, p.sku
                       FROM sale_items si
                       JOIN products p ON si.product_id = p.id
                       WHERE si.sale_id = ?
                       ORDER BY p.name");
$stmt->execute([$sale_id]);
$sale_items = $stmt->fetchAll();
?>

<div class="row">
    <div class="col-md-6">
        <h6>Sale Information</h6>
        <table class="table table-sm">
            <tr>
                <td><strong>Sale ID:</strong></td>
                <td>#<?php echo str_pad($sale['id'], 4, '0', STR_PAD_LEFT); ?></td>
            </tr>
            <tr>
                <td><strong>Date:</strong></td>
                <td><?php echo $sale['formatted_date']; ?></td>
            </tr>
            <tr>
                <td><strong>Status:</strong></td>
                <td>
                    <span class="badge bg-<?php echo $sale['status'] == 'completed' ? 'success' : ($sale['status'] == 'pending' ? 'warning' : 'danger'); ?>">
                        <?php echo ucfirst($sale['status']); ?>
                    </span>
                </td>
            </tr>
            <tr>
                <td><strong>Payment Method:</strong></td>
                <td><?php echo ucfirst(str_replace('_', ' ', $sale['payment_method'])); ?></td>
            </tr>
            <tr>
                <td><strong>Created By:</strong></td>
                <td><?php echo htmlspecialchars($sale['created_by_name']); ?></td>
            </tr>
            <tr>
                <td><strong>Created At:</strong></td>
                <td><?php echo $sale['created_at_formatted']; ?></td>
            </tr>
        </table>
    </div>
    
    <div class="col-md-6">
        <h6>Customer Information</h6>
        <table class="table table-sm">
            <tr>
                <td><strong>Name:</strong></td>
                <td><?php echo htmlspecialchars($sale['customer_name'] ?: 'Walk-in Customer'); ?></td>
            </tr>
            <tr>
                <td><strong>Email:</strong></td>
                <td><?php echo htmlspecialchars($sale['customer_email'] ?: 'N/A'); ?></td>
            </tr>
            <tr>
                <td><strong>Phone:</strong></td>
                <td><?php echo htmlspecialchars($sale['customer_phone'] ?: 'N/A'); ?></td>
            </tr>
            <?php if ($sale['notes']): ?>
            <tr>
                <td><strong>Notes:</strong></td>
                <td><?php echo htmlspecialchars($sale['notes']); ?></td>
            </tr>
            <?php endif; ?>
        </table>
    </div>
</div>

<h6 class="mt-4">Sale Items</h6>
<div class="table-responsive">
    <table class="table table-sm">
        <thead>
            <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($sale_items as $item): ?>
            <tr>
                <td><?php echo htmlspecialchars($item['product_name']); ?></td>
                <td><?php echo htmlspecialchars($item['sku'] ?: 'N/A'); ?></td>
                <td><?php echo number_format($item['quantity']); ?></td>
                <td>TZS<?php echo number_format($item['unit_price'], 2); ?></td>
                <td>TZS<?php echo number_format($item['total_price'], 2); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
        <tfoot>
            <tr class="table-active">
                <th colspan="4">Total Amount:</th>
                <th>$<?php echo number_format($sale['total_amount'], 2); ?></th>
            </tr>
        </tfoot>
    </table>
</div>
