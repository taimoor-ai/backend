const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
// Sample GET API


const multer = require('multer');
const fs = require('fs');
const path=require('path')

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = path.join(__dirname, 'PlantsImages');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath); // Create folder if it doesn't exist
    }
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + path.extname(file.originalname);
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// Endpoint to handle file upload
// app.post('/upload-images', upload.array('images', 5), (req, res) => {
//   if (req.files) {
//     res.status(200).send('Files uploaded successfully');
//   } else {
//     res.status(400).send('No files uploaded');
//   }
// });
router.get("/allplants",async (req, res) => {
    try{
        const query="SELECT *FROM users ";
        const [plants]=await promisePool.execute(query);
        res.status(200).json(plants);
    }catch(err){
        console.log(err);
        res.status(401).send("error fething plants");
    }
});
router.get("/plant/:id", async (req, res) => {
    try {
        const { id } = req.params;  // Destructuring for better readability
        
        // Using parameterized queries to avoid SQL injection
        const query = `SELECT * FROM plants WHERE id = ?`;
        const [plant] = await promisePool.execute(query, [id]);
        
        // Check if the plant was found
        if (plant.length === 0) {
            return res.status(404).send("Plant not found");
        }
        res.status(200).json(plant[0]);  // Assuming you're only fetching one plant

    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching plant details");
    }
});
router.put("/plant/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            price,
            stock,
            description,
            image_url,
            sunlight_requirements,
            watering_frequency,
            is_featured,
        } = req.body;
 // If image_url is not provided, set it to NULL
        const imageUrl = image_url || null;
        const query = `
            UPDATE plants
            SET 
                name = ?, 
                category = ?, 
                price = ?, 
                stock = ?, 
                description = ?, 
                image_url = ?, 
                sunlight_requirements = ?, 
                watering_frequency = ?, 
                is_featured = ?
            WHERE id = ?
        `;
        const values=[
            name,
            category,
            price,
            stock || 0,  // Default stock to 0 if not provided
            description || '',  // Default empty description if not provided
            imageUrl,
            sunlight_requirements || null,
            watering_frequency || null,
            is_featured || 0,
            id
        ];
        const [result] = await promisePool.execute(query,values);
        if (result.affectedRows === 0) {
            return res.status(404).send("Plant not found");
        }

        res.status(200).send("Plant updated successfully");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error updating plant details");
    }
});


router.post("/addPlant", upload.array('images', 5),async (req, res) => {
    console.log("i am here");
    console.log(req.files);
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('Images are required.');
    }
   
    try {
        const {
            name,
            category,
            price,
            stock,
            description,
            sunlight_requirements,
            watering_frequency,
            is_featured,
            image_url,
        } = req.body;

        // Check if required fields are provided
        if (!name || !category || !price) {
            return res.status(400).json({ message: "Name, category, and price are required." });
        }

        // If image_url is not provided, set it to NULL
        const imageUrl = image_url || null;

        const query = `
            INSERT INTO plants 
            (name, category, price, stock, description, image_url, sunlight_requirements, watering_frequency, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name,
            category,
            price,
            stock || 0,  // Default stock to 0 if not provided
            description || '',  // Default empty description if not provided
            imageUrl,
            sunlight_requirements || null,
            watering_frequency || null,
            is_featured || 0,
        ];
       
        const [record] = await promisePool.execute(query, values);

        res.status(201).json({
            message: 'Plant added successfully',
            plantId: record.insertId,  // Return the inserted plant's ID
        });
        
    } catch (err) {
        console.error('Error adding plant:', err);
        res.status(500).json({ message: "Error adding plant. Please try again." });
    }
});
router.delete('/plants/:id', async (req, res) => {
    try {
       const { id } = req.params;
       const query = `
             DELETE FROM plants
             WHERE id = ?
         `;
       
       const [data] = await promisePool.execute(query, [id]);
 
       // Check if a row was affected (deleted)
       if (data.affectedRows === 0) {
          return res.status(404).send("Plant not found");
       }
 
       // Send a success response (you can use 204 for no content)
       res.status(200).json({ message: "Plant deleted successfully" });
       
    } catch (err) {
       console.log(err);
       res.status(500).send("Error deleting plant");
    }
 });
 

// POST Example
router.post("/data", (req, res) => {
    const { name } = req.body;
    res.json({ message: `Received data for ${name}` });
});


module.exports = router;
