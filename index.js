require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());

// mongodb URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s5vxe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const metaBlog = client.db("metaBlog");
    const blogCollection = metaBlog.collection("blogs");
    const wishlist = metaBlog.collection("wishlist");

    // POST A BLOG
    app.post("/post-blog", async (req, res) => {
      const post = req.body;
      const result = await blogCollection.insertOne(post);
      res.send(result);
    });

    // delete a blog
    app.delete("/delete-blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.deleteOne(query);
      res.send(result);
    });

    // get all blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });

    // find blogs with email
    app.get("/blogs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await blogCollection.find(query).toArray();
      res.send(result);
    });

    // find a single blog
    app.get("/single-blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    // update a blog
    app.patch("/update-blog/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...updatedData,
        },
      };
      const result = await blogCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // <-----------------------------CRUD operation for wishlist----------------------->

    // add a wihslist
    app.post("/add-wishlist", async (req, res) => {
      const data = req.body;
      const result = await wishlist.insertOne(data);
      res.send(result);
    });

    // get wishlist by email
    app.get("/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await wishlist.find(query).toArray();
    });

    // delete a single wishlist
    app.delete("/delete-watchList/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlist.deleteOne(query);
      res.send(result);
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.log(error);
  }
}
run().catch(console.dir);

// basic route
app.get("/", async (req, res) => {
  res.send("The MetaBlog server is running");
});

// server starting
app.listen(port, () => {
  console.log(`Server listening at PORT:---> ${port}`);
});
