const express = require('express');
const apiRoutes = require('./routes/api.js');
const authRoutes=require('./routes/auth.js')
const dotenv=require("dotenv")
const app = express();
const orderRoute=require("./routes/orders.js")
const cartRoute=require("./routes/cart.js")
const reviews=require("./routes/reviews.js")
const cors = require('cors');
const path=require('path')
const PORT = process.env.PORT ||5000;

app.use(express.json());
app.use(cors());




app.use(cors({
  origin: 'http://192.168.15.103:5173',  // Replace with your frontend's IP address
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  // Allow cookies and credentials
}));
app.use(cors({
  origin: 'http://localhost:5174',  // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  // Allow cookies and credentials
}));
app.use(cors({
  origin: 'http://localhost:5173',  // Allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  // Allow cookies and credentials
}));
app.use('/images', express.static(path.join(__dirname, 'imagesFolder')));
// Routes
app.use('/api', apiRoutes);
app.use('/auth',authRoutes);
app.use('/ord',orderRoute);
app.use('/crt',cartRoute);
app.use('/rev',reviews);
app.get("/",(req,res)=>{
  res.send("hello")
})
dotenv.config();

// Start Server
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
