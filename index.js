import express from "express";
import cors from "cors";
import multer from "multer";
import {v4 as uuidv4} from "uuid";
import path from "path";
import fs from "fs";
import {exec} from "child_process";

const app = express();

//multer middleware

const storage = multer.diskStorage({
    destination: function(req,res,cb){
        cb(null, './uploads')
    },
    filename: function(req,file,cb){
        cb(null, file.fieldname + "-" + uuidv4() +  path.extname(file.originalname))
    }
});

//multer configuration
const upload = multer({storage:storage});

app.use(
    cors({
        origin:["http://localhost:5173"],
        credentials: true
    })
);

app.use((req,res,next)=>{
    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );
    next();
});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use("/uploads", express.static("uploads"));

app.get('/',(req, res)=>{
    res.json({message:"Hello"})
});

app.post('/upload',upload.single('file'), (req,res)=>{
    const lessonId = uuidv4();
    const videoPath = req.file.path;
    const outputPath = `./uploads/courses/${lessonId}`;
    const hlsPath = `${outputPath}/index.m3u8`; // .m3u8 is a UTF-8 encoded playlist file. These are plain text files that can be used to store URL paths of streaming audio or video and information about the media tracks.
    console.log("hlsPath : ", hlsPath);

    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath, {recursive:true})
    }

    // ffmpeg

    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d .ts" -start_number 0 ${hlsPath}`;

    // no queue as of not beacuse of POC, not to be used in production.
    exec(ffmpegCommand, (error, stdout, stderr)=>{
        if(error){
            console.log(`exec error: ${error}`);
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        const videoURL = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`;
        res.json({
            message: "Video converted to HLS format",
            videoURL: videoURL,
            lessonId: lessonId
        });
    })
});

app.listen(8000, ()=>{
    console.log("App is listing at port 3000...");
})