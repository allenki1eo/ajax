<?php
require_once 'config/database.php';
require_once 'includes/auth.php';

$auth->requireAdmin(); // Only admins can manage users
$pageTitle = 'User Management';

$pdo = getDBConnection();
$message = '';
$messageType = '';

// Handle form submissions
if ($_POST) {
    $action = $_POST['action'] ?? '';
    
    if ($action == 'add') {
        $username = trim($_POST['username']);
        $email = trim($_POST['email']);
        $password = $_POST['password'];
        $full_name = trim($_POST['full_name']);
        $role = $_POST['role'];
        
        if (empty($username) || empty($email) || empty($password) || empty($full_name)) {
            $message = 'All fields are required.';
            $messageType = 'danger';
        } else {
            if ($auth->register($username, $email, $password, $full_name, $role)) {
                $message = 'User added successfully!';
                $messageType = 'success';
            } else {
                $message = 'Error adding user. Username or email may already exist.';
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'edit') {
        $id = intval($_POST['id']);
        $username = trim($_POST['username']);
        $email = trim($_POST['email']);
        $full_name = trim($_POST['full_name']);
        $role = $_POST['role'];
        $password = $_POST['password'];
        
        if (empty($username) || empty($email) || empty($full_name)) {
            $message = 'Username, email, and full name are required.';
            $messageType = 'danger';
        } else {
            try {
                if (!empty($password)) {
                    // Update with new password
                    $hashedPassword = md5($password);
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, password = ? WHERE id = ?");
                    $stmt->execute([$username, $email, $full_name, $role, $hashedPassword, $id]);
                } else {
                    // Update without changing password
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, full_name = ?, role = ? WHERE id = ?");
                    $stmt->execute([$username, $email, $full_name, $role, $id]);
                }
                
                $message = 'User updated successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error updating user: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    } elseif ($action == 'delete') {
        $id = intval($_POST['id']);
        
        if ($id == $_SESSION['user_id']) {
            $message = 'You cannot delete your own account.';
            $messageType = 'danger';
        } else {
            try {
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$id]);
                
                $message = 'User deleted successfully!';
                $messageType = 'success';
            } catch (PDOException $e) {
                $message = 'Error deleting user: ' . $e->getMessage();
                $messageType = 'danger';
            }
        }
    }
}

// Get users
$stmt = $pdo->query("SELECT *, DATE_FORMAT(created_at, '%M %d, %Y') as formatted_date FROM users ORDER BY full_name");
$users = $stmt->fetchAll();

// Get user for editing
$edit_user = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_GET['edit']]);
    $edit_user = $stmt->fetch();
}

include 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-users me-2"></i>User Management</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#userModal">
            <i class="fas fa-plus me-1"></i>Add User
        </button>
    </div>
</div>

<?php if ($message): ?>
<div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
    <?php echo $message; ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
<?php endif; ?>

<!-- Users Table -->
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="avatar-circle me-3">
                                    <?php echo strtoupper(substr($user['full_name'], 0, 2)); ?>
                                </div>
                                <div>
                                    <strong><?php echo htmlspecialchars($user['full_name']); ?></strong>
                                    <?php if ($user['id'] == $_SESSION['user_id']): ?>
                                    <span class="badge bg-info ms-2">You</span>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </td>
                        <td><?php echo htmlspecialchars($user['username']); ?></td>
                        <td><?php echo htmlspecialchars($user['email']); ?></td>
                        <td>
                            <span class="badge bg-<?php echo $user['role'] == 'admin' ? 'danger' : ($user['role'] == 'manager' ? 'warning' : 'secondary'); ?>">
                                <?php echo ucfirst($user['role']); ?>
                            </span>
                        </td>
                        <td><?php echo $user['formatted_date']; ?></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <a href="?edit=<?php echo $user['id']; ?>" class="btn btn-outline-primary" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <?php if ($user['id'] != $_SESSION['user_id']): ?>
                                <button type="button" class="btn btn-outline-danger" onclick="deleteUser(<?php echo $user['id']; ?>)" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- User Modal -->
<div class="modal fade" id="userModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-user me-2"></i><?php echo $edit_user ? 'Edit User' : 'Add New User'; ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="POST">
                <div class="modal-body">
                    <input type="hidden" name="action" value="<?php echo $edit_user ? 'edit' : 'add'; ?>">
                    <?php if ($edit_user): ?>
                    <input type="hidden" name="id" value="<?php echo $edit_user['id']; ?>">
                    <?php endif; ?>
                    
                    <div class="mb-3">
                        <label for="full_name" class="form-label">Full Name *</label>
                        <input type="text" class="form-control" id="full_name" name="full_name" 
                               value="<?php echo htmlspecialchars($edit_user['full_name'] ?? ''); ?>" required>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username *</label>
                                <input type="text" class="form-control" id="username" name="username" 
                                       value="<?php echo htmlspecialchars($edit_user['username'] ?? ''); ?>" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="email" class="form-label">Email *</label>
                                <input type="email" class="form-control" id="email" name="email" 
                                       value="<?php echo htmlspecialchars($edit_user['email'] ?? ''); ?>" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="password" class="form-label">Password <?php echo $edit_user ? '(leave blank to keep current)' : '*'; ?></label>
                                <input type="password" class="form-control" id="password" name="password" <?php echo !$edit_user ? 'required' : ''; ?>>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="role" class="form-label">Role *</label>
                                <select class="form-select" id="role" name="role" required>
                                    <option value="user" <?php echo ($edit_user['role'] ?? 'user') == 'user' ? 'selected' : ''; ?>>User</option>
                                    <option value="manager" <?php echo ($edit_user['role'] ?? '') == 'manager' ? 'selected' : ''; ?>>Manager</option>
                                    <option value="admin" <?php echo ($edit_user['role'] ?? '') == 'admin' ? 'selected' : ''; ?>>Admin</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save me-1"></i><?php echo $edit_user ? 'Update User' : 'Add User'; ?>
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

<style>
.avatar-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--dark-color));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
}
</style>

<script>
function deleteUser(id) {
    if (confirmDelete('Are you sure you want to delete this user? This action cannot be undone.')) {
        document.getElementById('deleteId').value = id;
        document.getElementById('deleteForm').submit();
    }
}

<?php if ($edit_user): ?>
// Show modal for editing
document.addEventListener('DOMContentLoaded', function() {
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
});
<?php endif; ?>
</script>

<?php include 'includes/footer.php'; ?>
