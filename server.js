// INCLUDING MODULES
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const {
    exec
} = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const {
    GoogleGenerativeAI
} = require("@google/generative-ai");
const fs = require('fs');


require('dotenv').config();
// using  GEMINI API
const genAI = new GoogleGenerativeAI(process.env.API_KEY);


const app = express();
const port = 80;
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.set('views', 'views');
app.set("view engine", 'hbs')


ffmpeg.setFfmpegPath("./bin/ffmpeg.exe");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({
    storage: storage
});




// #########################################################################
// this part does the GET request routing
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/result', (req, res) => {
    return res.render('result')
});

// #########################################################################
// this part does the POST request routing
app.post('/', upload.single('file'), async (req, res) => {
    // ok so this function is pretty complex let me break it down
    // the form submission has a file upload for a picture or a video.
    try {
        // we save the path to a variable, and also make a relative path variable
        const location = req.file ? req.file.path : null;
        const relativePath = location ? location.replace(/\\/g, '/') : null;
        console.log(relativePath);

        // Execute detect.py script asynchronously
        // Because we have to wait for the file creations to be finished
        await new Promise((resolve, reject) => {
            // The command is:  python detect.py <image/video path>    
            exec(`python detect.py ${relativePath}`, async (error, stdout, stderr) => {
                console.log("Started detect.py")
                if (error) {
                    console.error('Error executing detect.py:', error);
                    reject(error);
                } else {
                    // CHECKING IF THE FILE IS A VIDEO OR AN IMAGE
                    if (isVideo(relativePath)) 
                    {
                        // Proceed with this code if it's a video
                        await webConvert(relativePath).then(() => {
                                resolve();
                                waitForFileToExist(relativePath);
                                var tank = require('./js/output');
                                askAI(tank);
                                return res.send(`<video src="outputs${changeFileExtension(relativePath,"mp4")}" width="640" height="480" controls autoplay></video>
                                            <br>  
                                             <p>${tank}</p> `);
                            }) // Resolve the promise if conversion is successful
                            .catch(reject); // Reject the promise if there's an error during conversion
                    } else {
                          // Proceed with this code if it's a Photo


                        resolve();
                        waitForFileToExist(relativePath);
                        var tank = require('./js/output');
                        await askAI(tank);
                        return res.send(`<img src="outputs${relativePath}"> 
                                        <br>  
                                         <p>${tank}</p> 
                                         <p>${askAI(tank)}</p> 
                                        `);
                    }
                }
            });
        });


    } catch (error) {
        console.error('Error processing image:', error);

    }

});


//miscellaneous functions

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

    const prompt = `Tell me about the weaknesses of the ${tank} tank`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
}

function waitForFileToExist(filePath) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(interval);
                resolve();
            }
        }, 1000); // Check every second
    });
}