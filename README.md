# Business Manager - PHP Business Management System

A comprehensive business management web application built with plain PHP, MySQL, and Bootstrap. This system helps businesses manage their products, track sales, monitor inventory, generate reports, and calculate profit/loss margins.

## Features

### 🔐 Authentication & User Management
- Secure login system with MD5 password hashing
- Role-based access control (Admin, Manager, User)
- User profile management
- Session management

### 📦 Product Management
- Add, edit, and manage products
- Product categorization
- SKU tracking
- Cost price and selling price management
- Automatic profit margin calculation
- Product status management (Active/Inactive)

### 🛒 Sales Management
- Record sales transactions
- Customer information tracking
- Multiple payment methods support
- Sales item management
- Automatic stock deduction
- Sales history and tracking

### 📋 Inventory Management
- Real-time stock tracking
- Low stock alerts
- Stock adjustments
- Stock movement history
- Inventory valuation
- Overstocked item identification

### 🚚 Purchase Management
- Record purchase orders
- Supplier management
- Purchase item tracking
- Automatic stock updates
- Purchase status management
- Cost price updates

### 📊 Reporting & Analytics
- Sales reports with date filtering
- Product performance analysis
- Profit/Loss reports
- Monthly sales trends
- Top customers analysis
- Low stock reports
- Export functionality (CSV)

### 🏢 Business Intelligence
- Dashboard with key metrics
- Visual charts and graphs
- Real-time statistics
- Profit margin analysis
- Stock value calculations

## Installation

### Prerequisites
- XAMPP/WAMP/LAMP server
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Web browser

### Setup Instructions

1. **Clone or Download**
   - Place the project files in your web server directory (e.g., `c:\wamp\www\store\`)

2. **Database Setup**
   - Start your MySQL server
   - Import the database schema:
     ```sql
     mysql -u root -p < database.sql
     ```
   - Or manually run the SQL commands in `database.sql`

3. **Configuration**
   - Update database credentials in `config/database.php` if needed:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'business_manager');
     define('DB_USER', 'root');
     define('DB_PASS', '');
     ```

4. **Access the Application**
   - Open your web browser
   - Navigate to `http://localhost/store/`
   - Login with default credentials:
     - **Username:** admin
     - **Password:** admin123

## File Structure

```
store/
├── config/
│   └── database.php          # Database configuration
├── includes/
│   ├── auth.php             # Authentication class
│   ├── header.php           # Common header
│   └── footer.php           # Common footer
├── ajax/
│   ├── sale_details.php     # Sale details AJAX
│   └── purchase_details.php # Purchase details AJAX
├── dashboard.php            # Main dashboard
├── login.php               # Login page
├── logout.php              # Logout handler
├── products.php            # Product management
├── sales.php               # Sales management
├── purchases.php           # Purchase management
├── inventory.php           # Inventory management
├── reports.php             # Reports and analytics
├── categories.php          # Category management
├── suppliers.php           # Supplier management
├── users.php               # User management (Admin only)
├── index.php               # Main entry point
├── database.sql            # Database schema
└── README.md               # This file
```

## Default User Accounts

| Username | Password | Role  | Description |
|----------|----------|-------|-------------|
| admin    | admin123 | Admin | Full system access |

## Key Features Explained

### Profit/Loss Calculation
- Automatic calculation based on cost price vs selling price
- Real-time profit margin display
- Color-coded indicators (Red: Loss, Yellow: Low margin, Green: Good margin)

### Inventory Management
- Automatic stock updates on sales and purchases
- Low stock alerts when quantity reaches minimum level
- Stock movement tracking for audit purposes
- Inventory valuation based on cost prices

### Reporting System
- **Sales Reports:** Daily, monthly, and custom date range analysis
- **Product Reports:** Performance metrics and stock status
- **Profit Reports:** Revenue, cost, and profit analysis with margins
- **Export Options:** CSV export for external analysis

### Security Features
- MD5 password hashing (as requested)
- Session-based authentication
- Role-based access control
- SQL injection prevention using prepared statements
- XSS protection with input sanitization

## Usage Guide

### Getting Started
1. Login with admin credentials
2. Set up categories for your products
3. Add suppliers (optional)
4. Add your products with cost and selling prices
5. Start recording sales and purchases

### Managing Products
- Navigate to Products section
- Click "Add Product" to create new items
- Set cost price, selling price, and stock levels
- Monitor profit margins in real-time

### Recording Sales
- Go to Sales section
- Click "New Sale" 
- Add products to the sale
- Enter customer information (optional)
- Select payment method
- Stock is automatically deducted

### Viewing Reports
- Access Reports section
- Select report type (Sales, Products, Profit/Loss)
- Set date ranges for analysis
- Export data as CSV for further analysis

## Customization

### Adding New Features
- Follow the existing code structure
- Use the authentication system for access control
- Maintain consistent UI with Bootstrap classes
- Add database changes to the schema file

### Styling
- Custom CSS is included in the header
- Bootstrap 5 is used for responsive design
- Font Awesome icons for visual elements
- Color scheme can be modified in CSS variables

## Troubleshooting

### Common Issues
1. **Database Connection Error**
   - Check MySQL server is running
   - Verify database credentials in config/database.php
   - Ensure database exists

2. **Login Issues**
   - Verify default admin user exists in database
   - Check session configuration
   - Clear browser cookies/cache

3. **Permission Errors**
   - Ensure web server has read/write permissions
   - Check file ownership and permissions

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify your server configuration
3. Review error logs in your web server

## License

This project is open source and available under the MIT License.

---

**Business Manager v1.0.0** - A complete business management solution for small to medium businesses.
