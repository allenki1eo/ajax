            </main>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JavaScript -->
    <script>
        // Auto-hide alerts after 5 seconds
        document.addEventListener('DOMContentLoaded', function() {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(function(alert) {
                setTimeout(function() {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }, 5000);
            });
        });

        // Confirm delete actions
        function confirmDelete(message = 'Are you sure you want to delete this item?') {
            return confirm(message);
        }

        // Format currency
        function formatCurrency(amount) {
            return 'TZS ' + new Intl.NumberFormat('en-TZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        }

        // Calculate profit margin
        function calculateProfitMargin(costPrice, sellingPrice) {
            if (costPrice <= 0) return 0;
            return ((sellingPrice - costPrice) / costPrice * 100).toFixed(2);
        }

        // Update profit margin display
        function updateProfitMargin() {
            const costPrice = parseFloat(document.getElementById('cost_price')?.value) || 0;
            const sellingPrice = parseFloat(document.getElementById('selling_price')?.value) || 0;
            const profitMarginElement = document.getElementById('profit_margin');
            
            if (profitMarginElement) {
                const margin = calculateProfitMargin(costPrice, sellingPrice);
                profitMarginElement.textContent = margin + '%';
                
                // Color coding
                if (margin < 0) {
                    profitMarginElement.className = 'text-danger fw-bold';
                } else if (margin < 20) {
                    profitMarginElement.className = 'text-warning fw-bold';
                } else {
                    profitMarginElement.className = 'text-success fw-bold';
                }
            }
        }

        // Add event listeners for profit margin calculation
        document.addEventListener('DOMContentLoaded', function() {
            const costPriceInput = document.getElementById('cost_price');
            const sellingPriceInput = document.getElementById('selling_price');
            
            if (costPriceInput && sellingPriceInput) {
                costPriceInput.addEventListener('input', updateProfitMargin);
                sellingPriceInput.addEventListener('input', updateProfitMargin);
                updateProfitMargin(); // Initial calculation
            }
        });

        // Print functionality
        function printReport() {
            window.print();
        }

        // Export to CSV
        function exportTableToCSV(tableId, filename) {
            const table = document.getElementById(tableId);
            if (!table) return;
            
            let csv = [];
            const rows = table.querySelectorAll('tr');
            
            for (let i = 0; i < rows.length; i++) {
                const row = [];
                const cols = rows[i].querySelectorAll('td, th');
                
                for (let j = 0; j < cols.length; j++) {
                    row.push(cols[j].innerText);
                }
                csv.push(row.join(','));
            }
            
            const csvContent = csv.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', filename + '.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Search functionality
        function searchTable(inputId, tableId) {
            const input = document.getElementById(inputId);
            const table = document.getElementById(tableId);
            
            if (!input || !table) return;
            
            input.addEventListener('keyup', function() {
                const filter = input.value.toUpperCase();
                const rows = table.getElementsByTagName('tr');
                
                for (let i = 1; i < rows.length; i++) {
                    let txtValue = rows[i].textContent || rows[i].innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        rows[i].style.display = '';
                    } else {
                        rows[i].style.display = 'none';
                    }
                }
            });
        }

        // Mobile sidebar toggle functionality
        document.addEventListener('DOMContentLoaded', function() {
            const sidebarToggle = document.querySelector('[data-bs-target="#sidebarMenu"]');
            const sidebar = document.getElementById('sidebarMenu');
            const mainContent = document.querySelector('.main-content');
            
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('show');
                });
                
                // Close sidebar when clicking on main content (mobile only)
                if (mainContent) {
                    mainContent.addEventListener('click', function() {
                        if (window.innerWidth < 768 && sidebar.classList.contains('show')) {
                            sidebar.classList.remove('show');
                        }
                    });
                }
                
                // Close sidebar when clicking on a nav link (mobile only)
                const navLinks = sidebar.querySelectorAll('.nav-link');
                navLinks.forEach(function(link) {
                    link.addEventListener('click', function() {
                        if (window.innerWidth < 768) {
                            sidebar.classList.remove('show');
                        }
                    });
                });
            }
        });
    </script>

    <?php if (isset($customJS)): ?>
        <script><?php echo $customJS; ?></script>
    <?php endif; ?>
</body>
</html>
