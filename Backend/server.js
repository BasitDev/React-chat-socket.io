import express from "express";
import dotenv from "dotenv";
import morgan from 'morgan';
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import expressFileUpload from "express-fileupload";
dotenv.config();


//App Configuration
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://localhost:5174"
        ],
        methods: ["GET", "POST"],
    }
});

// JSON Format
app.use(express.json());

//Cookie Parser For JWT
app.use(cookieParser());

// API Request Response Logger
app.use(morgan("tiny"));

// Image / File Upload Path 
app.use("/uploads", express.static("./uploads"))

// cors 
app.use(
    cors({
        origin:
            [
                "http://localhost:5173",
                "http://localhost:5174",
            ],
        credentials: true
    })
);

// file
app.use(expressFileUpload());

//Error Handler
app.use((err, req, res, next) => {
    const errorStatus = err.status || 500;
    const errorMessage = err.message || "Something went wrong!";
    return res.status(errorStatus).send(errorMessage);
});


// total users list
let users = {};

io.on('connection', (socket) => {
    // console.log('New user connected', socket.id);

    socket.on('user-joined', (username) => {
        users[socket.id] = {
            name: username,
            status: 'active',
        };
        io.emit('user-list', users);
    });

    socket.on('send-message', (data) => {
        console.log(data);
        io.emit('receive-message', data);
    });

    socket.on('user-inactive', () => {
        if (users[socket.id]) {
            users[socket.id].status = 'inactive';
            io.emit('user-list', users);
        }
    });

    socket.on('user-active', () => {
        if (users[socket.id]) {
            users[socket.id].status = 'active';
            io.emit('user-list', users);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        delete users[socket.id];
        io.emit('user-list', users);
    });
});

app.post('/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let uploadedImage = req.files.uploadedImage;

    // Use the mv() method to place the file on the server
    uploadedImage.mv('./uploads/' + uploadedImage.name, (err) => {
        if (err)
            return res.status(500).send(err);

        res.send('/uploads/' + uploadedImage.name);
    });
});

//Port and Connection
const port = 8800;
server.listen(port, () => {
    console.log(`Backend server is running on ${port}`);
});