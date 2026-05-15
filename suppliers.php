<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Suppliers';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle form submissions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'add') {
        $name = trim($_POST['name']);
        $contact_person = trim($_POST['contact_person']);
        $email = trim($_POST['email']);
        $phone = trim($_POST['phone']);
        $address = trim($_POST['address']);
        
        if (empty($name)) {
            $message = 'Supplier name is required.';
            $messageType = 'danger';
        } else {
            try {
                $stmt = $pdo->prepare("INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$name, $contact_person, $email, $phone, $address]);
                
                $message = 'Supplier added successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error adding supplier: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'edit') {
        $id = intval($_POST['id']);
        $name = trim($_POST['name']);
        $contact_person = trim($_POST['contact_person']);
        $email = trim($_POST['email']);
        $phone = trim($_POST['phone']);
        $address = trim($_POST['address']);
        
        if (empty($name)) {
            $message = 'Supplier name is required.';
            $messageType = 'danger';
        } else {
            try {
                $stmt = $pdo->prepare("UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?");
                $stmt->execute([$name, $contact_person, $email, $phone, $address, $id]);
                
                $message = 'Supplier updated successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error updating supplier: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'delete') {
        $id = intval($_POST['id']);
        
        try {
            // Check if supplier has products
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE supplier_id = ?");
            $stmt->execute([$id]);
            $product_count = $stmt->fetchColumn();
            
            if ($product_count > 0) {
                $message = 'Cannot delete supplier. It has ' . $product_count . ' product(s) assigned to it.';
                $messageType = 'danger';
            } else {
                $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ?");
                $stmt->execute([$id]);
                
                $message = 'Supplier deleted successfully!';
                $messageType = 'success';
            }
        } catch (PDOException $e) {
            $message = 'Error deleting supplier: ' . $e->getMessage();
            $messageType = 'danger';
        }
    }
}

// Get search parameter
$search = $_GET['search'] ?? '';

// Build query
$where_clause = '';
$params = [];

if (!empty($search)) {
    $where_clause = "WHERE s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ?";
    $params = ["%$search%", "%$search%", "%$search%"];
}

// Get suppliers with product count
$stmt = $pdo->prepare("SELECT s.*, COUNT(p.id) as product_count
                       FROM suppliers s
                       LEFT JOIN products p ON s.id = p.supplier_id AND p.status = 'active'
                       $where_clause
                       GROUP BY s.id, s.name, s.contact_person, s.email, s.phone, s.address, s.created_at
                       ORDER BY s.name");
$stmt->execute($params);
$suppliers = $stmt->fetchAll();

// Get supplier for editing
$edit_supplier = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
    $stmt->execute([$_GET['edit']]);
    $edit_supplier = $stmt->fetch();
}

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-truck-loading me-2"></i>Suppliers</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="exportTableToCSV('suppliersTable', 'suppliers')">
                <i class="fas fa-download me-1"></i>Export
            </button>
        </div>
        <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#supplierModal">
            <i class="fas fa-plus me-1"></i>Add Supplier
        </button>
    </div>
</div>

<?php if ($message): ?>
<div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
    <?php echo $message; ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
<?php endif; ?>

<!-- Search -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-3">
            <div class="col-md-10">
                <label for="search" class="form-label">Search Suppliers</label>
                <input type="text" class="form-control" id="search" name="search" value="<?php echo htmlspecialchars($search); ?>" placeholder="Search by name, contact person, or email...">
            </div>
            <div class="col-md-2">
                <label class="form-label">&nbsp;</label>
                <div class="d-grid">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search me-1"></i>Search
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Suppliers Table -->
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover" id="suppliersTable">
                <thead>
                    <tr>
                        <th>Supplier Name</th>
                        <th>Contact Person</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Products</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($suppliers as $supplier): ?>
                    <tr>
                        <td>
                            <strong><?php echo htmlspecialchars($supplier['name']); ?></strong>
                            <?php if ($supplier['address']): ?>
                            <br><small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i><?php echo htmlspecialchars($supplier['address']); ?></small>
                            <?php endif; ?>
                        </td>
                        <td><?php echo htmlspecialchars($supplier['contact_person'] ?: 'N/A'); ?></td>
                        <td>
                            <?php if ($supplier['email']): ?>
                            <a href="mailto:<?php echo htmlspecialchars($supplier['email']); ?>"><?php echo htmlspecialchars($supplier['email']); ?></a>
                            <?php else: ?>
                            N/A
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($supplier['phone']): ?>
                            <a href="tel:<?php echo htmlspecialchars($supplier['phone']); ?>"><?php echo htmlspecialchars($supplier['phone']); ?></a>
                            <?php else: ?>
                            N/A
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="badge bg-info"><?php echo $supplier['product_count']; ?> products</span>
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <a href="?edit=<?php echo $supplier['id']; ?>" class="btn btn-outline-primary" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <button type="button" class="btn btn-outline-danger" onclick="deleteSupplier(<?php echo $supplier['id']; ?>)" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <?php if (empty($suppliers)): ?>
            <div class="text-center py-4">
                <i class="fas fa-truck-loading fa-3x text-muted mb-3"></i>
                <p class="text-muted">No suppliers found.</p>
                <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#supplierModal">
                    <i class="fas fa-plus me-1"></i>Add Your First Supplier
                </button>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Supplier Modal -->
<div class="modal fade" id="supplierModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-truck-loading me-2"></i><?php echo $edit_supplier ? 'Edit Supplier' : 'Add New Supplier'; ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST">
                <div class="modal-body">
                    <input type="hidden" name="action" value="<?php echo $edit_supplier ? 'edit' : 'add'; ?>">
                    <?php if ($edit_supplier): ?>
                    <input type="hidden" name="id" value="<?php echo $edit_supplier['id']; ?>">
                    <?php endif; ?>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="name" class="form-label">Supplier Name *</label>
                                <input type="text" class="form-control" id="name" name="name" 
                                       value="<?php echo htmlspecialchars($edit_supplier['name'] ?? ''); ?>" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="contact_person" class="form-label">Contact Person</label>
                                <input type="text" class="form-control" id="contact_person" name="contact_person" 
                                       value="<?php echo htmlspecialchars($edit_supplier['contact_person'] ?? ''); ?>">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" name="email" 
                                       value="<?php echo htmlspecialchars($edit_supplier['email'] ?? ''); ?>">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone</label>
                                <input type="text" class="form-control" id="phone" name="phone" 
                                       value="<?php echo htmlspecialchars($edit_supplier['phone'] ?? ''); ?>">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="address" class="form-label">Address</label>
                        <textarea class="form-control" id="address" name="address" rows="3"><?php echo htmlspecialchars($edit_supplier['address'] ?? ''); ?></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save me-1"></i><?php echo $edit_supplier ? 'Update Supplier' : 'Add Supplier'; ?>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Delete Form -->
<form id="deleteForm" method="POST" style="display: none;">
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="id" id="deleteId">
</form>

<script>
function deleteSupplier(id) {
    if (confirmDelete('Are you sure you want to delete this supplier? This action cannot be undone.')) {
        document.getElementById('deleteId').value = id;
        document.getElementById('deleteForm').submit();
    }
}

<?php if ($edit_supplier): ?>
// Show modal for editing
document.addEventListener('DOMContentLoaded', function() {
    const modal = new bootstrap.Modal(document.getElementById('supplierModal'));
    modal.show();
});
<?php endif; ?>
</script>

<?php include 'includes/footer.php'; ?>
