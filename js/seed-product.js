import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

async function seedProducts() {
  try {
    for (const product of LOCAL_PRODUCTS) {
      const productRef = doc(db, "products", product.id);

      await setDoc(productRef, {
        name: product.name,
        price: product.price,
        category: product.category,
        imageURL: product.imageURL
      });

      console.log(`Added: ${product.name}`);
    }

    console.log("All products added successfully.");
  } catch (error) {
    console.error("Error seeding products:", error);
  }
}

seedProducts();