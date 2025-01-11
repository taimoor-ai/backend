const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
const multer = require('multer');
const cloudinary = require('../cloudinaryConfig'); // Cloudinary configuration file

require('dotenv').config();  // Load environment variables

// Configure multer to use in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { files: 3 },  // Limit to 3 files
}).array('images', 3);  // Accept up to 3 files (field name is 'images')

// Route to add a plant with image upload
router.post("/addPlant",async (req, res) => {
  // try {
    // Check if image was uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Image is required.' });
    }
    return res.send(req.files);
    res.send("hello");
//     const {
//       name,
//       category,
//       price,
//       stock,
//       description,
//       sunlight_requirements,
//       watering_frequency,
//       is_featured,
//       scientificName
//     } = req.body;

//     // Validate required fields
//     if (!name || !category || !price) {
//       return res.status(400).json({ message: "Name, category, and price are required." });
//     }

//     // Upload images to Cloudinary and get URLs
//     const imageUrls = [];
//     const uploadPromises = req.files.map(file => {
//       return new Promise((resolve, reject) => {
//         cloudinary.uploader.upload_stream(
//           {
//             resource_type: 'auto',  // auto detects the file type (image, video, etc.)
//           },
//           (error, result) => {
//             if (error) {
//               reject(error);  // Reject the promise if upload fails
//             } else {
//               imageUrls.push(result.secure_url);  // Push image URL to array
//               resolve(result.secure_url);  // Resolve promise with the image URL
//             }
//           }
//         ).end(file.buffer);  // Pass the image buffer to Cloudinary for uploading
//       });
//     });

//     // Wait for all images to upload using Promise.all
//     await Promise.all(uploadPromises);

//     // SQL Query to insert plant details along with image URLs
//     const query = `
//       INSERT INTO plants 
//       (name, category, price, stock, description, image_url, sunlight_requirements, watering_frequency, is_featured, scientificName)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const values = [
//       name,
//       category,
//       price,
//       stock || 0,  // Default stock to 0
//       description || '',  // Empty description by default
//       imageUrls.join(','),  // Join image URLs into a comma-separated string
//       sunlight_requirements || null,
//       watering_frequency || null,
//       is_featured || 0,  // Not featured by default
//       scientificName
//     ];

//     // Execute SQL query to insert the plant data into the database
//     const [record] = await promisePool.execute(query, values);

//     res.status(201).json({
//       message: 'Plant added successfully',
//       plantId: record.insertId
//     });

//   } catch (err) {
//     console.error('Error adding plant:', err);
//     res.status(500).json({ err: err.message, message: "Error adding plant. Please try again." });
//   }
});



router.get("/allplants",async (req, res) => {
    try{
       
        const query="SELECT *FROM plants ";
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
            scientificName
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
                is_featured = ?,
                scientificName = ?
            WHERE id = ?
        `;

        const values=[
            name,
            category,
            price,
            stock || 0,  // Default stock to 0 if not provided
            description || '',  // Default empty description if not provided
            imageUrl||"  ",
            sunlight_requirements || null,
            watering_frequency || null,
            is_featured || 0,
            scientificName,
            id
        ]
        // return res.json({values});
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






// Route to Add Plant (Single Image Upload)

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
       res.status(500).send(err,"Error deleting plant");
    }
 });
 

// POST Example
router.post("/data", (req, res) => {
    const { name } = req.body;
    res.json({ message: `Received data for ${name}` });
});


module.exports = router;
