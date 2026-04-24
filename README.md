# 🧥 Urban Threads

Urban Threads is a modern, streetwear-inspired e-commerce web application built using HTML, CSS, JavaScript, and Firebase. The platform allows users to browse products, create accounts, and manage a shopping cart in a dynamic and responsive interface.

---

## 🚀 Features

- 🔐 User Authentication (Sign Up, Login, Logout) using Firebase Authentication  
- 🛍️ Dynamic product listing from Firebase Firestore  
- 🛒 Add to Cart / Remove from Cart functionality  
- 💰 Cart summary with real-time total price calculation  
- 📱 Fully responsive design using CSS Flexbox and Grid  
- 👤 Displays logged-in user information in the navigation bar  

---

## 🛠️ Tech Stack

- HTML5  
- CSS3 (Flexbox & Grid)  
- JavaScript (ES6 Modules)  
- Firebase  
  - Firestore Database  
  - Authentication  

---

## 📁 Project Structure

```
UrbanThreads/
│
├── index.html          # Landing page
├── shop.html           # Product listing page
├── login.html          # Login & signup page
├── cart.html           # Shopping cart page
│
├── css/
│   └── styles.css      # Main stylesheet
│
├── js/
│   ├── firebase.js     # Firebase configuration & initialization
│   ├── auth.js         # Authentication logic (login, signup, logout)
│   ├── products.js     # Fetching and displaying products
│   ├── cart.js         # Cart functionality (add/remove/update)
│   └── ui.js           # UI updates and helpers
│
└── assets/
    └── images/         # Product and UI images
```

---

## 🔧 Setup & Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account with Firestore enabled

### 1. Clone the Repository
```bash
git clone https://github.com/Shaquan-Legae/Urban-Threads.git
cd Urban-Threads
```

### 2. Firebase Configuration
The Firebase configuration is already set in `js/firebase.js`. The project uses:
- **Project ID**: `urban-threads-8c33c`
- **Database**: Firestore (Cloud Firestore)
- **Authentication**: Firebase Authentication (Email/Password, Google, Facebook)

### 3. Set Up Firestore Collections
Create the following collections in your Firebase Firestore:

#### **Collection: `products`**
Each document should have:
```json
{
  "id": "product-1",
  "name": "Product Name",
  "category": "T-Shirts",
  "price": 49.99,
  "image": "https://example.com/image.jpg",
  "description": "Product description",
  "sizes": ["XS", "S", "M", "L", "XL", "XXL"]
}
```

#### **Collection: `users/{uid}/cart`**
Each document (by product ID) should have:
```json
{
  "id": "product-1",
  "name": "Product Name",
  "category": "T-Shirts",
  "price": 49.99,
  "image": "https://example.com/image.jpg",
  "quantity": 1
}
```

### 4. Set Up Authentication
In Firebase Console:
- Enable Email/Password authentication
- Enable Google Sign-In
- Enable Facebook Sign-In (optional)
- Update Facebook App ID if using Facebook auth

### 5. Firestore Security Rules
Use these basic security rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access to products
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'admin@gmail.com';
    }
    
    // User cart - only user can access their own cart
    match /users/{uid}/cart/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### 6. Run the Application
Simply open `index.html` in your web browser or use a local server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

Then visit: `http://localhost:8000`

---

## 📖 API Reference

### Authentication (auth.js)
- `signInWithEmailAndPassword()` - Login with email and password
- `createUserWithEmailAndPassword()` - Create new account
- `signInWithPopup()` - Google/Facebook Sign-In
- `signOut()` - Logout user
- `onAuthStateChanged()` - Listen for auth state changes

### Products (products.js)
- `fetchProducts()` - Fetch all products from Firestore
- `filterByCategory()` - Filter products by category
- `filterBySearch()` - Search products by name/description
- `renderProducts()` - Render filtered products to DOM

### Cart (cart.js)
- `addToCart(product)` - Add product to cart
- `removeFromCart(productId)` - Remove product from cart
- `updateQuantity(productId, quantity)` - Update product quantity
- `getCartItems()` - Get all cart items
- `loadCartFromFirestore()` - Fetch cart from Firestore

### UI Utilities (ui.js)
- `createProductCard(product)` - Generate product card HTML
- `createCartItem(product, quantity)` - Generate cart item HTML
- `updateCartTotal(total)` - Update total price display
- `updateCartCount(count)` - Update cart item count
- `initAuthUI()` - Initialize auth state UI updates

---

## 🎯 Features Implemented

✅ User Authentication (Email/Password, Google, Facebook)
✅ Product Listing with Real-time Firestore Sync
✅ Category & Search Filtering
✅ Add to Cart / Remove from Cart
✅ Real-time Cart Updates
✅ Order Summary & Checkout
✅ Mock Payment Processing
✅ Responsive Design
✅ Session Persistence

---

## 🚀 Future Enhancements

- [ ] Order history & tracking
- [ ] Wishlist functionality
- [ ] Product reviews & ratings
- [ ] Admin dashboard for product management
- [ ] Email notifications
- [ ] Real payment integration (Stripe/PayPal)
- [ ] Multi-language support
- [ ] Dark mode theme

---

## 📄 License

This project is open source and available under the MIT License.

---

## 📞 Support

For issues or questions, please create an issue on GitHub.

---

**Built with ❤️ using Firebase & Modern Web Technologies**

---

## 🔥 Firebase Setup

1. Create a Firebase project named **UrbanThreadsStore**  
2. Enable the following services:
   - Firestore Database  
   - Authentication (Email/Password or Google Sign-In)  
3. Add your Firebase configuration to `firebase.js`  

---

## ▶️ How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Shaquan-Legae/urban-threads.git
   ```

2. Navigate into the project directory:
   ```bash
   cd urban-threads
   ```

3. Open `index.html` in your browser  
   (or use Live Server in VS Code)

---

## 🌐 Live Demo

👉 https://shaquan-urbanthreads.netlify.app/

---

## 📌 Notes

- Products are fetched dynamically from Firebase Firestore  
- Cart data is stored per user (Firestore or localStorage)  
- Only authenticated users can access cart and checkout  
- The application follows a modular JavaScript structure for maintainability  

---

## 💡 Future Improvements

- 🔍 Product search and filtering  
- 🛠️ Admin dashboard for product management  
- ❤️ Wishlist functionality  
- 💳 Simulated checkout and order tracking  
