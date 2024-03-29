const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 80;
const server = app.listen(port, () =>
{
    console.log(`Server running on port ${port}`);
});

app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.urlencoded({ extended: false }));

app.set('views','views');
app.set("view engine",'hbs')
app.get('/', (req, res) => {
    res.render('home');
});

ffmpeg.setFfmpegPath("./bin/ffmpeg.exe");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// we need to determine if the file is an image or a video
const videos = ["mp4", "webm", "avi"]
const photos = ["png","jpg","jpeg"]


// this handles the case when a photo/video is uploaded
// to do the AI detection

app.post('/', upload.single('file'), async (req, res) => {
    try {
        const location = req.file ? req.file.path : null;
        const relativePath = location ? location.replace(/\\/g, '/') : null;
        
        // Execute detect.py script asynchronously
        await new Promise((resolve, reject) => {
            exec(`python detect.py ${relativePath}`, (error, stdout, stderr) => {
                console.log("Started detect.py")
                if (error) {
                    console.error('Error executing detect.py:', error);
                    reject(error);
                } else {
                    // CHECKING IF THE FILE IS A VIDEO OR AN IMAGE
                   
                    if (isVideo(relativePath)) {
                        // Convert video to MP4
                        webConvert(relativePath).then(() => {
                            resolve();
                            return res.send(`<video src="outputs${changeFileExtension(relativePath,"mp4")}" width="640" height="480" controls autoplay></video>`);
                        }) // Resolve the promise if conversion is successful
                            .catch(reject); // Reject the promise if there's an error during conversion
                    } else {
                        resolve();
                        return res.send(`<img src="outputs${relativePath}">`); 
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



function isVideo(relativePath)
{
    const videos = ["mp4", "webm", "avi","wvm"]
    const photos = ["png","jpg","jpeg"]
    const extension = path.extname(relativePath).slice(1);
  
    if (videos.includes(extension)) {
      
        return true; 
    }
    else if (photos.includes(extension)) 
        {
           
            return false;
        }

    
}