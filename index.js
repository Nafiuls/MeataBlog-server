require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const corsOption = {
  origin: ["http://localhost:5173", "https://funny-douhua-018593.netlify.app"],
  credentials: true,
  optionalSuccessStatus: 200,
};
// middle ware
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

// mongodb URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s5vxe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.user = decoded;
  });
  next();
};
async function run() {
  try {
    const metaBlog = client.db("metaBlog");
    const blogCollection = metaBlog.collection("blogs");
    const wishlist = metaBlog.collection("wishlist");
    const comments = metaBlog.collection("comments");
    // logout
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // generate jwt
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // create token
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // POST A BLOG
    app.post("/post-blog/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.params.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
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
      const { search, category } = req.query;
      const query = {};
      if (category) {
        query.category = category.toLocaleLowerCase();
      }
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      console.log(query);
      try {
        const result = await blogCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ err: "failed to fetch blogs" });
      }
    });

    // recent blogs
    app.get("/recent-blogs", async (req, res) => {
      const result = await blogCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
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
    app.patch("/update-blog/:id/:email", verifyToken, async (req, res) => {
      const id = req.params.id;
      const email = req.params.email;
      const updatedData = req.body;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...updatedData,
        },
      };
      const result = await blogCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // top blogs
    app.get("/featured", async (req, res) => {
      const result = await blogCollection
        .aggregate([
          {
            $addFields: {
              descriptionLength: { $strLenCP: "$longDescription" },
            },
          },
          {
            $sort: { descriptionLength: -1 },
          },
          {
            $limit: 10,
          },
        ])
        .toArray();
      res.send(result);
    });

    // <-----------------------------CRUD operation for wishlist----------------------->

    // add a wihslist
    app.post("/add-wishlist", async (req, res) => {
      const data = req.body;
      const { id } = req.body;
      console.log(id);
      const query = { id: id };
      const isExist = await wishlist.findOne(query);
      if (isExist) {
        return res.statusCode(400).send({ message: "Already exist" });
      } else {
        const result = await wishlist.insertOne(data);
        return res.send(result);
      }
    });

    // get wishlist by email
    app.get("/wishlist/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.params.email;
      const query = { email };
      if (decodedEmail !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await wishlist.find(query).toArray();
      res.send(result);
    });

    // delete a single wishlist
    app.delete("/delete-wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlist.deleteOne(query);
      res.send(result);
    });

    // <-----------------------------comments------------------------------------------->
    // post a comment
    app.post("/post-comment", async (req, res) => {
      const comment = req.body;
      const result = await comments.insertOne(comment);
      res.send(result);
    });

    // get comment by blogID
    app.get("/comment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { blogId: id };
      const result = await comments.find(query).toArray();
      res.send(result);
    });
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
