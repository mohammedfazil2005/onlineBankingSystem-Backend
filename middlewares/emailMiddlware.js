const nodemailer=require('nodemailer')

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.GOOGLEEMAIL,
        pass:process.env.GOOGLEPASSWORD
    },
})

const sendOTP=async(email,OTPnumber)=>{
    
    const mailOptions={
        from:process.env.GOOGLEEMAIL,
        to:email,
        subject:"Bank AI OTP",
        text:`Your OTP code is: ${OTPnumber}. It will expire in 5 minutes.`
    }

    try {
     await transporter.sendMail(mailOptions)
     return { status: 200, message: "OTP sent successfully" };
    } catch (error) {
        return { success: 404, message: "Error occurred!", error: error.message };
    }

}



module.exports=sendOTP