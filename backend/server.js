const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 🔥 Helper: find column by keyword
function findColumn(row, keywords) {
    return Object.keys(row).find(key =>
        keywords.some(k => key.toLowerCase().includes(k))
    );
}

app.post("/upload", upload.single("file"), (req, res) => {
    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => {

            if (results.length === 0) {
                return res.json({});
            }

            const firstRow = results[0];
            console.log("Detected Columns:", Object.keys(firstRow));

            // 🔥 AUTO DETECT COLUMNS
            const amountCol = findColumn(firstRow, ["final_price", "price", "sales"]);
            const priceCol = findColumn(firstRow, ["unit_price", "price"]);
            const quantityCol = findColumn(firstRow, ["quantity", "qty"]);
            const productCol = findColumn(firstRow, ["product_id", "product"]);
            const categoryCol = findColumn(firstRow, ["category"]);
            const customerCol = findColumn(firstRow, ["user_id", "customer"]);
            const dateCol = findColumn(firstRow, ["purchase_date", "date"]);

            let totalSales = 0;
            let totalOrders = results.length;

            let productSales = {};
            let categorySales = {};
            let monthlySales = {};
            let dailySales = {};
            let customers = new Set();

            results.forEach(row => {

                // 🔥 Amount calculation
                let amount = 0;

                if (amountCol && row[amountCol]) {
                    amount = parseFloat(String(row[amountCol]).replace(/[^0-9.-]+/g, "")) || 0;
                } else if (quantityCol && priceCol) {
                    amount = (parseFloat(row[quantityCol]) || 0) *
                             (parseFloat(row[priceCol]) || 0);
                }

                const product = productCol ? row[productCol] : "Unknown";
                const category = categoryCol ? row[categoryCol] : "Other";
                const customer = customerCol ? row[customerCol] : "Guest";
                const date = dateCol ? row[dateCol] : "";

                totalSales += amount;
                customers.add(customer);

                productSales[product] = (productSales[product] || 0) + amount;
                categorySales[category] = (categorySales[category] || 0) + amount;

                if (date) {
                    const d = new Date(date);

                    if (!isNaN(d)) {
                        const day = d.toISOString().split("T")[0];
                        const month = day.substring(0, 7);

                        dailySales[day] = (dailySales[day] || 0) + amount;
                        monthlySales[month] = (monthlySales[month] || 0) + amount;
                    }
                }
            });

            const sortedProducts = Object.entries(productSales)
                .sort((a, b) => b[1] - a[1]);

            const topProducts = sortedProducts.slice(0, 5);
            const lowPerforming = sortedProducts.slice(-5);

            const avg = totalSales / (totalOrders || 1);
            const prediction = Math.round(avg * 30);

            res.json({
                totalSales,
                totalOrders,
                totalCustomers: customers.size,
                productSales,
                categorySales,
                monthlySales,
                dailySales,
                topProducts,
                lowPerforming,
                prediction
            });

            fs.unlinkSync(req.file.path);
        });
});

app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});
