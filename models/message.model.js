const {model,Schema}=require("mongoose");

// Message has a 1 to N relationship with User
// Message also has 1 to N relationship with Room
// So we store the refs along-with the message content

const messageSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref:"User",
        },
        content:{
            type: String,
        },
        room:{
            type: Schema.Types.ObjectId,
            ref:"Room",
        },
    },
    {
        timestamp:true,
    }
);

module.exports=model("Message",messageSchema);