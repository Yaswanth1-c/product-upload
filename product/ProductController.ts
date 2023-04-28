import express, { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { Product } from "./productsSchema";
import fs from "fs";
import jwt from "jsonwebtoken";

const router = Router();

// Configure multer middleware to store uploaded files in the uploads directory
const upload = multer({ dest: "uploads/" });

// const baseUrl = "http://localhost:3000"

// Define a middleware function to check for valid credentials
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the token
    const decoded = jwt.verify(token, "secret");
    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Pass the decoded user information to the next middleware function
    res.locals.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Create a new product
router.post(
  "/",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    // console.log("@@@@@@@@@@@@", req.file);

    // Read the contents of the uploaded file
    const buffer = fs.readFileSync(file.path);
    const filename = `${file.originalname}`;
    try {
      fs.writeFileSync(`uploads/${filename}`, buffer);

      // Create a new product object with the image data
      const newProduct = new Product({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        image: `${__dirname}/uploads/${filename}`,
      });
      // Save the product to MongoDB
      await newProduct.save();
      res.json({ message: "Product saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error saving product to MongoDB" });
    }
  }
);

// Retrieve all products
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving products from MongoDB" });
  }
});

// Retrieve a single product by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.json(product);
    }
  } catch (error) {
    res.status(500).json({ error: "Error retrieving product from MongoDB" });
  }
});
// Update a product by ID
router.put("/:id", authMiddleware, upload.single("file"), async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Update the product object
    product.name = req.body.name;
    product.description = req.body.description;
    product.price = req.body.price;

    // Check if there's a new image file
    if (req.file) {
      // Read the contents of the uploaded file
      const buffer = fs.readFileSync(req.file.path);
      const filename = `${req.file.originalname}`;
      fs.writeFileSync(`uploads/${filename}`, buffer);
      product.image = `${__dirname}/uploads/${filename}`;
    }

    // Save the updated product to MongoDB
    await product.save();

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating product in MongoDB" });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product from MongoDB" });
  }
});

export default router;
