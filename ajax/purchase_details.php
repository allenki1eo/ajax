<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

$auth->requireLogin();

$purchase_id = intval($_GET['id'] ?? 0);

if (!$purchase_id) {
    echo '<p class="text-danger">Invalid purchase ID.</p>';
    exit;
}

$pdo = getDBConnection();

// Get purchase details
$stmt = $pdo->prepare("SELECT p.*, s.name as supplier_name, s.contact_person, s.email as supplier_email, s.phone as supplier_phone,
                              u.full_name as created_by_name,
                              DATE_FORMAT(p.purchase_date, '%M %d, %Y') as formatted_date,
                              DATE_FORMAT(p.created_at, '%M %d, %Y at %h:%i %p') as created_at_formatted
                       FROM purchases p
                       LEFT JOIN suppliers s ON p.supplier_id = s.id
                       LEFT JOIN users u ON p.created_by = u.id
                       WHERE p.id = ?");
$stmt->execute([$purchase_id]);
$purchase = $stmt->fetch();

if (!$purchase) {
    echo '<p class="text-danger">Purchase not found.</p>';
    exit;
}

// Get purchase items
$stmt = $pdo->prepare("SELECT pi.*, pr.name as product_name, pr.sku
                       FROM purchase_items pi
                       JOIN products pr ON pi.product_id = pr.id
                       WHERE pi.purchase_id = ?
                       ORDER BY pr.name");
$stmt->execute([$purchase_id]);
$purchase_items = $stmt->fetchAll();
?>

<div class="row">
    <div class="col-md-6">
        <h6>Purchase Information</h6>
        <table class="table table-sm">
            <tr>
                <td><strong>Purchase ID:</strong></td>
                <td>#<?php echo str_pad($purchase['id'], 4, '0', STR_PAD_LEFT); ?></td>
            </tr>
            <tr>
                <td><strong>Date:</strong></td>
                <td><?php echo $purchase['formatted_date']; ?></td>
            </tr>
            <tr>
                <td><strong>Status:</strong></td>
                <td>
                    <span class="badge bg-<?php echo $purchase['status'] == 'received' ? 'success' : ($purchase['status'] == 'pending' ? 'warning' : 'danger'); ?>">
                        <?php echo ucfirst($purchase['status']); ?>
                    </span>
                </td>
            </tr>
            <tr>
                <td><strong>Created By:</strong></td>
                <td><?php echo htmlspecialchars($purchase['created_by_name']); ?></td>
            </tr>
            <tr>
                <td><strong>Created At:</strong></td>
                <td><?php echo $purchase['created_at_formatted']; ?></td>
            </tr>
        </table>
    </div>
    
    <div class="col-md-6">
        <h6>Supplier Information</h6>
        <table class="table table-sm">
            <tr>
                <td><strong>Supplier:</strong></td>
                <td><?php echo htmlspecialchars($purchase['supplier_name'] ?: 'No Supplier'); ?></td>
            </tr>
            <?php if ($purchase['contact_person']): ?>
            <tr>
                <td><strong>Contact Person:</strong></td>
                <td><?php echo htmlspecialchars($purchase['contact_person']); ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($purchase['supplier_email']): ?>
            <tr>
                <td><strong>Email:</strong></td>
                <td><?php echo htmlspecialchars($purchase['supplier_email']); ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($purchase['supplier_phone']): ?>
            <tr>
                <td><strong>Phone:</strong></td>
                <td><?php echo htmlspecialchars($purchase['supplier_phone']); ?></td>
            </tr>
            <?php endif; ?>
            <?php if ($purchase['notes']): ?>
            <tr>
                <td><strong>Notes:</strong></td>
                <td><?php echo htmlspecialchars($purchase['notes']); ?></td>
            </tr>
            <?php endif; ?>
        </table>
    </div>
</div>

<h6 class="mt-4">Purchase Items</h6>
<div class="table-responsive">
    <table class="table table-sm">
        <thead>
            <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($purchase_items as $item): ?>
            <tr>
                <td><?php echo htmlspecialchars($item['product_name']); ?></td>
                <td><?php echo htmlspecialchars($item['sku'] ?: 'N/A'); ?></td>
                <td><?php echo number_format($item['quantity']); ?></td>
                <td>TZS<?php echo number_format($item['unit_cost'], 2); ?></td>
                <td>TZS<?php echo number_format($item['total_cost'], 2); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
        <tfoot>
            <tr class="table-active">
                <th colspan="4">Total Amount:</th>
                <th>$<?php echo number_format($purchase['total_amount'], 2); ?></th>
            </tr>
        </tfoot>
    </table>
</div>
