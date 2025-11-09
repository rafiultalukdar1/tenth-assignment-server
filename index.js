const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();


// middle-ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.DB_PASS}@cluster0.w0v9pwr.mongodb.net/?appName=Cluster0`;


// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
    try{
        await client.connect();

        const db = client.db('tenth_assign_db');
        const eventsCollection = db.collection('events');

        // Add database related api
        app.post('/events', async (req, res) => {
            const newProduct = req.body;
            const result = await eventsCollection.insertOne(newProduct);
            res.send(result);
        });

        app.get('/events', async (req, res) => {
            const cursor = eventsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // single events details
        app.get('/events/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id : id };
            const result = await eventsCollection.findOne(query);
            res.send(result);
        });

        // Upcoming Events
        app.get('/upcoming-events', async (req, res) =>{
            const cursor = eventsCollection.find().sort({event_date: 1}).limit(9);
            const result = await cursor.toArray();
            res.send(result);
        });




        


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally{

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running!')
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});