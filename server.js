const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Підключення бази даних
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Хостинг статичних файлів
app.use(express.static('public'));

// --- ТЕСТОВИЙ МАРШРУТ ---
app.get("/api/message", (req, res) => {
    res.json({ message: "Hello from the backend!" });
});

// --- ЗАВДАННЯ 10: МАРШРУТИ ДЛЯ СПИСКУ БАЖАНЬ ---
app.get("/api/wishlist/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const docRef = db.collection("wishlists").doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            res.json(docSnap.data().items || []);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/wishlist", async (req, res) => {
    try {
        const { userId, product } = req.body;
        if (!userId || !product) {
            return res.status(400).json({ message: "Дані відсутні" });
        }
        const docRef = db.collection("wishlists").doc(userId);
        const docSnap = await docRef.get();
        let items = [];
        if (docSnap.exists) {
            items = docSnap.data().items || [];
        }
        
        // Перевірка на дублікати
        const isDuplicate = items.some(item => item.id === product.id);
        if (isDuplicate) {
            return res.status(400).json({ message: "Товар вже є у вашому списку бажань!" });
        }
        
        await docRef.set({
            items: admin.firestore.FieldValue.arrayUnion(product)
        }, { merge: true });
        res.status(201).json({ message: "Товар успішно додано до списку!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ЗАВДАННЯ 3: ЗАХИЩЕНИЙ МАРШРУТ ---
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

app.get("/api/protected", verifyToken, (req, res) => {
    res.json({ message: "You have accessed a protected route!", user: req.user });
});

// --- ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});