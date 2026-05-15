<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireLogin();
$pageTitle = 'Categories';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle form submissions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'add') {
        $name = trim($_POST['name']);
        $description = trim($_POST['description']);
        
        if (empty($name)) {
            $message = 'Category name is required.';
            $messageType = 'danger';
        } else {
            try {
                $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
                $stmt->execute([$name, $description]);
                
                $message = 'Category added successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error adding category: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'edit') {
        $id = intval($_POST['id']);
        $name = trim($_POST['name']);
        $description = trim($_POST['description']);
        
        if (empty($name)) {
            $message = 'Category name is required.';
            $messageType = 'danger';
        } else {
            try {
                $stmt = $pdo->prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?");
                $stmt->execute([$name, $description, $id]);
                
                $message = 'Category updated successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error updating category: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'delete') {
        $id = intval($_POST['id']);
        
        try {
            // Check if category has products
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
            $stmt->execute([$id]);
            $product_count = $stmt->fetchColumn();
            
            if ($product_count > 0) {
                $message = 'Cannot delete category. It has ' . $product_count . ' product(s) assigned to it.';
                $messageType = 'danger';
            } else {
                $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
                $stmt->execute([$id]);
                
                $message = 'Category deleted successfully!';
                $messageType = 'success';
            }
        } catch (PDOException $e) {
            $message = 'Error deleting category: ' . $e->getMessage();
            $messageType = 'danger';
        }
    }
}

// Get categories with product count
$stmt = $pdo->query("SELECT c.*, COUNT(p.id) as product_count
                     FROM categories c
                     LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
                     GROUP BY c.id, c.name, c.description, c.created_at
                     ORDER BY c.name");
$categories = $stmt->fetchAll();

// Get category for editing
$edit_category = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
    $stmt->execute([$_GET['edit']]);
    $edit_category = $stmt->fetch();
}

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-tags me-2"></i>Categories</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#categoryModal">
            <i class="fas fa-plus me-1"></i>Add Category
        </button>
    </div>
</div>

<?php if ($message): ?>
<div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
    <?php echo $message; ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
<?php endif; ?>

<!-- Categories Grid -->
<div class="row">
    <?php foreach ($categories as $category): ?>
    <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0"><?php echo htmlspecialchars($category['name']); ?></h5>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="?edit=<?php echo $category['id']; ?>">
                                <i class="fas fa-edit me-2"></i>Edit
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteCategory(<?php echo $category['id']; ?>)">
                                <i class="fas fa-trash me-2"></i>Delete
                            </a></li>
                        </ul>
                    </div>
                </div>
                
                <?php if ($category['description']): ?>
                <p class="card-text text-muted"><?php echo htmlspecialchars($category['description']); ?></p>
                <?php endif; ?>
                
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-primary"><?php echo $category['product_count']; ?> Products</span>
                    <small class="text-muted">Created: <?php echo date('M d, Y', strtotime($category['created_at'])); ?></small>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
    
    <?php if (empty($categories)): ?>
    <div class="col-12">
        <div class="text-center py-5">
            <i class="fas fa-tags fa-3x text-muted mb-3"></i>
            <h4 class="text-muted">No Categories Found</h4>
            <p class="text-muted">Start organizing your products by creating categories.</p>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#categoryModal">
                <i class="fas fa-plus me-1"></i>Create Your First Category
            </button>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Category Modal -->
<div class="modal fade" id="categoryModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-tags me-2"></i><?php echo $edit_category ? 'Edit Category' : 'Add New Category'; ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST">
                <div class="modal-body">
                    <input type="hidden" name="action" value="<?php echo $edit_category ? 'edit' : 'add'; ?>">
                    <?php if ($edit_category): ?>
                    <input type="hidden" name="id" value="<?php echo $edit_category['id']; ?>">
                    <?php endif; ?>
                    
                    <div class="mb-3">
                        <label for="name" class="form-label">Category Name *</label>
                        <input type="text" class="form-control" id="name" name="name" 
                               value="<?php echo htmlspecialchars($edit_category['name'] ?? ''); ?>" required>
                    </div>
                    
                    <div class="mb-3">
                        <label for="description" class="form-label">Description</label>
                        <textarea class="form-control" id="description" name="description" rows="3"><?php echo htmlspecialchars($edit_category['description'] ?? ''); ?></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save me-1"></i><?php echo $edit_category ? 'Update Category' : 'Add Category'; ?>
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
function deleteCategory(id) {
    if (confirmDelete('Are you sure you want to delete this category? This action cannot be undone.')) {
        document.getElementById('deleteId').value = id;
        document.getElementById('deleteForm').submit();
    }
}

<?php if ($edit_category): ?>
// Show modal for editing
document.addEventListener('DOMContentLoaded', function() {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
});
<?php endif; ?>
</script>

<?php include 'includes/footer.php'; ?>
