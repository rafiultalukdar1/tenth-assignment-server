const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const joinedEventsCollection = db.collection('joinedEvents');

        // Add database related api
        // app.post('/events', async (req, res) => {
        //     const newEvents = req.body;
        //     const result = await eventsCollection.insertOne(newEvents);
        //     res.send(result);
        // });

        app.post('/events', async (req, res) => {
            const {
                thumbnail,
                event_type,
                title,
                description,
                event_details,
                event_date,
                location,
                organizer_photo,
                organizer_name,
                organizer_email,
                status,
                created_at
            } = req.body;
            if (!title || !event_date) {
                return res.status(400).json({ message: 'Title and event date are required' });
            }
            const newEvent = {
                thumbnail,
                event_type,
                title,
                description,
                event_details,
                event_date: new Date(event_date).toISOString(),
                location,
                organizer_photo,
                organizer_name,
                organizer_email,
                status,
                created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString()
            };
            const result = await eventsCollection.insertOne(newEvent);
            res.status(201).json({
                message: 'Event created successfully!',
                acknowledged: result.acknowledged,
                insertedId: result.insertedId
            });
        });

        app.get('/events', async (req, res) => {
            const cursor = eventsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // single events details
        app.get('/events/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid event ID' });
            }
            const query = { _id: new ObjectId(id) };
            const result = await eventsCollection.findOne(query);
            if (!result) return res.status(404).json({ message: 'Event not found' });
            res.json(result);
        });

        

        // Upcoming Events
        // app.get('/upcoming-events', async (req, res) =>{
        //     const cursor = eventsCollection.find().sort({event_date: 1}).limit(9);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // });

        // Upcoming Events
        app.get('/upcoming-events', async (req, res) => {
            const currentDate = new Date();
            const cursor = eventsCollection
                .find({ event_date: { $gte: currentDate.toISOString() } })
                .sort({ event_date: 1 })
            const result = await cursor.toArray();
            res.send(result);
        });





        // Joint event post api
        app.post('/join-event', async (req, res) => {
            const { eventId, userEmail } = req.body;
            if (!ObjectId.isValid(eventId)) {
                return res.status(400).json({ message: 'Invalid event ID' });
            }
            const alreadyJoined = await joinedEventsCollection.findOne({ eventId: new ObjectId(eventId), userEmail });
            if (alreadyJoined) {
                return res.status(400).json({ message: 'Already joined this event' });
            }
            const joinData = { eventId: new ObjectId(eventId), userEmail, joinedAt: new Date() };
            const result = await joinedEventsCollection.insertOne(joinData);
            res.status(200).json({ message: 'Event joined successfully', result });
        });


        // Joint event get api
        app.get('/joined-events', async (req, res) => {
            const userEmail = req.query.email;
            if (!userEmail) return res.status(400).json({ message: 'Email is required' });
            const joinedEvents = await joinedEventsCollection.aggregate([
                { $match: { userEmail } },
                { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'eventDetails' } },
                { $unwind: '$eventDetails' },
                {
                $project: {
                    joinedId: '$_id',
                    eventId: '$eventDetails._id',
                    title: '$eventDetails.title',
                    description: '$eventDetails.description',
                    event_type: '$eventDetails.event_type',
                    thumbnail: '$eventDetails.thumbnail',
                    location: '$eventDetails.location',
                    event_date: '$eventDetails.event_date',
                    event_details: '$eventDetails.event_details',
                    organizer_name: '$eventDetails.organizer_name',
                    organizer_email: '$eventDetails.organizer_email',
                    organizer_photo: '$eventDetails.organizer_photo',
                }
                }
            ]).toArray();
            res.json(joinedEvents);
        });

        // DELETE Joined Event
        app.delete('/joined-events/:id', async (req, res) => {
            const joinedId = req.params.id;
            if (!ObjectId.isValid(joinedId)) {
                return res.status(400).json({ message: 'Invalid joinedId' });
            }
            const result = await joinedEventsCollection.deleteOne({ _id: new ObjectId(joinedId) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Event not found or already removed' });
            }
            res.json({ message: 'Successfully removed from event' });
        });

        // GET My Events
        app.get('/my-events', async (req, res) => {
            const userEmail = req.query.email;
            if (!userEmail) return res.status(400).json({ message: 'Email is required' });
            const myEvents = await eventsCollection.find({ organizer_email: userEmail }).sort({ event_date: 1 }).toArray();
            res.json(myEvents);
        });

        // Update Event
        app.patch('/events/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid event ID' });
            }
            const updatedEvent = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: {
                    title: updatedEvent.title,
                    description: updatedEvent.description,
                    event_details: updatedEvent.event_details,
                    thumbnail: updatedEvent.thumbnail,
                    event_type: updatedEvent.event_type,
                    location: updatedEvent.location,
                    event_date: new Date(updatedEvent.event_date).toISOString(),
                    organizer_name: updatedEvent.organizer_name,
                    organizer_email: updatedEvent.organizer_email,
                    organizer_photo: updatedEvent.organizer_photo,
                    status: updatedEvent.status || 'upcoming'
                }
            };
            const result = await eventsCollection.updateOne(query, update);
            res.send(result);
        });

        // Delete Event
        app.delete('/events/:id', async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid event ID' });
            }
            const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Event not found or already deleted' });
            }
            await joinedEventsCollection.deleteMany({ eventId: new ObjectId(id) });
            res.json({ message: 'Event deleted successfully', deletedCount: result.deletedCount });
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