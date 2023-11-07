const {google}=require("googleapis");
const {OAuth2}=google.auth;
const Room = require("../../models/room.model");
const {v4:uuidV4}= require("uuid");
const nodemailer = require("nodemailer");

const serviceMail = process.env.EMAIL;
const pass = process.env.PASS;

const sendInvite = async (req,res)=>{
    console.log(req.body);

    let newRoom ={
        name: "Meetup at "+ new Date(req.body.eventStart).toLocaleString(),
        roomID:uuidV4(),
    };

    try{
        newRoom=await Room.create(newRoom);
    } catch(error){
        return console.error(error);
    }

    const OAuth2Client = new OAuth2(
        process.env.GAPI_CLIENT_ID,
        process.env.GAPI_CLIENT_SECRET
    );

    OAuth2Client.setCredentials({
        refresh_token:process.env.GAPI_REFRESH_TOKEN,
    });

    const calendar = google.calendar({
        version:"v3",
        auth:OAuth2Client
    });

    const eventStartTime=new Date(req.body.eventStart);
    const eventEndTime = new Date(req.body.eventEnd);
   
    console.log("Start Time : "+ eventStartTime);
    console.log("End Time : "+ eventEndTime);
    const event = {
        summary: req.body.summary,
        location:`/${newRoom.roomID}`,
        description:`Meetin date & time: ${eventStartTime.toLocaleString()} Meeting chat URL: /chat/${
            newRoom.roomID
        }`,
        creator:{
            email: req.body.organiser,
        },
        organizer:{
            email:req.body.organiser,
            self:true,
        },
        start:{
            dateTime:eventStartTime,
            timeZone:"Asia/Kolkata",
        },
        attendees: req.body.emails,
        colorId:1,
    };

    calendar.freebusy.query(
        {
            resource:{
                timeMin:eventStartTime,
                timeMax:eventEndTime,
                timeZone:"Asia/Kolkata",
                items:[{id:"primary"}],
            },
        },
        (err,result)=>{
            if(err){
                console.error("Free bust query error",err);
                return res.json({
                    success:false,
                    message:"Free bust query error",
                    data:"Query error",
                    error:err,
                }).status(500);
            }

            const eventsArr=result.data.calendars.primary.bust;

            if(!eventsArr.length){
                return calendar.events.insert(
                    {
                        calendarId:"primary",
                        resource:event,
                        sendUpdates:"all",
                    },
                    (err)=>{
                        if(err){
                            console.error("Calendar event creation error: ",err);
                            return res.json({
                                success:false,
                                message:"Calender event creation error",
                                data:"Calendar event creation error",
                                error:err,
                            }).status(500);
                        }
                        console.log("Calender Event Created");
                        return res.json({
                            success:true,
                            message:"Calender Event Created",
                            room:newRoom
                        }).status(201);
                    }
                );
            }
            console.log(eventsArr);
            console.log("Sorry there's another meeting at that time and date");
            return res.json({
                success:false,
                message:"Sorry there's another meeting at that time and date",
                data:"Another meeting exists at that date and time",
            }).status(500);
        }
    );


};

const mail = async (recipient,content)=>{
    console.log({serviceMail,pass});
    const transporter=nodemailer.createTransport({
        service:"gmail",
        auth:{
            user:serviceMail,
            pass:pass,
        },
    });

    const mailOptions={
        from: process.env.email,// sender address
        to:recipient, // list of receivers
        subject:"Unite App Feedback", // Subject line
        html:`<p>${content}</p>`,// plain text body
    };
    const trptRes=await transporter.sendMail(mailOptions);
    return trptRes;
};

const mailFeedback=async(req,res)=>{
    const {name,email,message}=req.body;
    console.log({name,email,message});
    const content=`Unite App Feedback<br><br>
    Name:<b>${name || " no name"}</b><br>
    Email:<b>${email}</b><br>
    Message:<i>${message || "empty message"}</i><br>`;

    try{
        await mail(serviceMail,content);
        await mail(email,content);
        res.json({
            success:true,
            message:"Feedback recorded successfully"
        }).status(200);
    } catch(err){
        console.error(err);
        res.json({
            success:false,
            message:"Failed to record feedback"
        }).status(200);
    }
};

module.exports={
    sendInvite,
    mailFeedback,
};