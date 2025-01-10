const express = require("express");
const router = express.Router();
const promisePool = require("../dbConfig");
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'plants',  // Cloudinary folder
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => Date.now() + '-' + file.originalname
  }
});

const upload = multer({ storage });


router.post("/addPlant",  async (req, res) => {
  try {
    // Check if image was uploaded
    // if (!req.file) {
    //   return res.status(400).json({ message: 'Image is required.' });
    // }

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
      scientificName
    } = req.body;
    // Validate required fields
    if (!name || !category || !price) {
      return res.status(400).json({ message: "Name, category, and price are required." });
    }

    // Get Image URL from Cloudinary
    // const imageUrl = "image Url"

    // SQL Query
    const query = `
      INSERT INTO plants 
      (name, category, price, stock, description, image_url, sunlight_requirements, watering_frequency, is_featured,scientificName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;

    const values = [
      name,
      category,
      price,
      stock || 0,  // Default stock to 0
      description || '',  // Empty description by default
      image_url||"",  // Cloudinary URL
      sunlight_requirements || null,
      watering_frequency || null,
      is_featured || 0  ,// Not featured by default,
      scientificName
    ];
    
    const [record] = await promisePool.execute(query, values);

    res.status(201).json({
      message: 'Plant added successfully',
      plantId: record.insertId
    });

  } catch (err) {
    console.error('Error adding plant:', err);
    res.status(500).json({ err:err,message: "Error adding plant. Please try again." });
  }
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
                is_featured = ?
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
