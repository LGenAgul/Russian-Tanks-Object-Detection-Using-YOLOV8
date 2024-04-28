//ბიბლიოთეკები
const cors = require('cors');
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const multer = require('multer');
const  { translate } = require('@vitalets/google-translate-api');
const {exec} = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const {GoogleGenerativeAI} = require("@google/generative-ai");
const fs = require('fs');
const io = require('socket.io')(server);
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const resultSchema = require('./js/resultSchema');
var MongoClient = require('mongodb').MongoClient;

//ვიყენებთ http პორტს
const port = 80;
// ip მისამართის გაწერა
const corsOptions = {
    origin: 'http://127.0.0.1', 
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

require('dotenv').config();
// using  GEMINI API
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

//ამით ვიღებთ სტრიმის მონაცემებს
io.on('connection', (socket) => {
    console.log('A client connected');
    sendData(socket)
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
//ვუკავშირდებით მონაცემთა ბაზას
const uri = 'mongodb://localhost:27017/tankdb';
mongoose.connect(uri);
     const db = mongoose.connection;
     // Bind connection to error event (to get notification of connection errors)
     db.on('error', console.error.bind(console, 'MongoDB connection error:'));
     db.once('open', () => {
         console.log('Connected to MongoDB database');
         // You can start defining your schemas and models here
     });
     const collection = db.collection("results");
     
// სტატიკური საქაღალდეს გაწერა და აპლიკაციის პარამეტრების გაწერა
app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cors(corsOptions));
app.engine('hbs', exphbs.engine({
    extname: 'hbs', 
    layoutsDir: path.join(__dirname, 'views', 'layouts'), 
    partialsDir: path.join(__dirname, 'views', 'partials'), 
    defaultLayout: 'main',
}));
app.set('views', 'views');
app.set("view engine", 'hbs');

// ffmpeg ფოტოების ენკოდირების აპლიკაციას ვიყენებთ რომ ვიდეოებმა იმუშაონ
ffmpeg.setFfmpegPath("./bin/ffmpeg.exe");

// ფაილების ასატვირთად
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({storage: storage});
// // #########################################################################
// // get რექვესთები
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/detect', (req, res) => {
    res.render('detect',{title:"აღმოჩენა სტრიმიდან"});
});

app.get('/result', async (req, res) => {
    const cursor = collection.find();

    // Convert cursor to array of documents
    const documents = await cursor.toArray();
    if (documents.length==0)
    {
        return res.send('No documents to show :(');
    }
    // Print or process the documents
    const imageUrls = documents.map(doc => `/outputs/${doc.filename}`);
    imageUrls.title = "შედეგების გალერეა"
     return res.render('results', { imageUrls });
});
app.get('/video', async (req, res) => {
    try {
      // Execute stream.py asynchronously
      res.sendFile(path.join(__dirname, '/views/stream.html'));
      await executeStream();
  
      // Send the stream.html file after successful execution
    } catch (error) {
      console.error('Error starting stream:', error);
      // Handle errors appropriately (e.g., send an error response to the client)
      res.status(500).send('Error starting video stream');
    }
  }); 
// ვიღებთ სტრიმის თითო frame-ს 
app.get('/analysis', (req, res) => {
    res.render('analysis');
});
// // #########################################################################
// // POST რექვესთები
app.post('/detect', upload.single('file'), async (req, res) => {
    try {
        const location = req.file ? req.file.path : null;
        const relativePath = location ? location.replace(/\\/g, '/') : null;
       
        var type;
        var params;
        console.log(relativePath);

        // Execute detect.py script asynchronously
        await executeDetection(relativePath);

        let resultData;
        // Check if the file is a video or an image
        if (isVideo(relativePath)) {
            resultData = await processVideo(relativePath, res);
            type = 'video';
            params = '  width="640" height="480" controls autoplay'
        } else {
            resultData = await processImage(relativePath, res);
            type = 'img';
            params = ' width="640" height="480"'
        }

        // ვინახავთ მონაცემთა ბაზაში
        const result = new resultSchema({
            filename: req.file.filename,
            path: location,
            tank: resultData.tank, 
            text: resultData.text, 
            filePath: resultData.filePath 
        });
        await result.save();
        const element = `<div class="imageContainer">
                         <${type} src="outputs${resultData.filePath}" ${params}></${type}>  
                         </div>
                         <div class="infoContainer">
                         <p>${resultData.text}</p>
                         </div>`;
        return  res.render('detect', { element: element, errorHeader: ''});
    } catch (error) {
        const errorHeader = "<h3>გთხოვთ აირჩიეთ ფოტოსურათი ან ვიდეო </h3>"
        console.error('Error processing image:', error);
        return res.render('detect', { element: "",errorHeader: errorHeader });
    }
});
// #########################################################################
async function executeDetection(relativePath) {
    return new Promise((resolve, reject) => {
        exec(`python python/detect.py ${relativePath}`, (error, stdout, stderr) => {
            console.log("Started detect.py");
            if (error) {
                console.error('Error executing detect.py:', error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}
async function executeStream() {
    const {spawn} = require('child_process');
    try {
      console.log("Starting stream.py");
      const pythonProcess = spawn('python', ['python/stream.py']);
  
   
      pythonProcess.stdout.on('data', (data) => {
       
      });
  
      pythonProcess.stderr.on('data', (data) => {
        console.error(`python/stream.py error: ${data}`);
      });
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(); 
          } else {
            reject(new Error(`python/stream.py exited with code ${code}`)); 
          }
        });
      });
  
      console.log("stream.py completed successfully");
  
    } catch (error) {
      console.error('Error executing stream.py:', error);
      throw error; 
    }
  }
function sendData(socket)
{
    socket.on('data', (data) => {
        io.emit('imageData',data);
      });
}
async function processVideo(relativePath, res) {
    await webConvert(relativePath);
    waitForFileToExist(relativePath);
    delete require.cache[require.resolve('./js/output')]; // Delete cache entry
    const tank = require('./js/output');
    const text = await askAI(tank);
    return {
        tank: tank,
        text: text,
        filePath: changeFileExtension(relativePath, "mp4")
    };
}
async function processImage(relativePath, res) {
    waitForFileToExist(relativePath);
    delete require.cache[require.resolve('./js/output')]; // Delete cache entry
    const tank = require('./js/output');
    const text = await askAI(tank);
    return {
        tank: tank,
        text: text,
        filePath: relativePath
    };
}
function changeFileExtension(filePath, newExtension) {
    const extension = path.extname(filePath);
    const basename = path.basename(filePath, extension);
    return path.join(path.dirname(filePath), `${basename}.${newExtension}`);
}
function webConvert(relativePath) {
    return new Promise((resolve, reject) => {
        ffmpeg(`outputs${relativePath}`)
            .videoCodec('libx264')
            .output(changeFileExtension(`outputs${relativePath}`, 'mp4'))
            .on('end', () => {
                console.log('Conversion to MP4 complete');
                resolve(); // Resolve the promise when conversion is complete
            })
            .on('error', (err) => {
                console.error('Error converting to MP4:', err);
                reject(err); // Reject the promise if there's an error during conversion
            })
            .on('progress', (progress) => {
                console.log(`Conversion progress: ${progress.percent}%`);
            })
            .on('start', (commandLine) => {
                console.log('ffmpeg command:', commandLine);
            })
            .run();
    });
}
function isVideo(relativePath) {
    const videos = ["mp4", "webm", "avi", "wvm"]
    const photos = ["png", "jpg", "jpeg"]
    const extension = path.extname(relativePath).slice(1);

    if (videos.includes(extension)) {

        return true;
    } else if (photos.includes(extension)) {

        return false;
    }
}
async function askAI(tank) {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({
        model: "gemini-pro"
    });

    const prompt = `list the vulnerabilites of  ${tank} tank  give me a numbered list and before every number add an html break tag`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    var text = response.text();
    const translationResult = await translate(text, { to: 'ka' });
    const translatedText = translationResult.text;
    return translatedText;
}
function waitForFileToExist(filePath) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(interval);
                resolve();
            }
        }, 100); // Check every second
    });
}
server.listen(port, () =>
{
    console.log(`app listening on port ${port}!`);
}) //me vgijdebi mariamze 