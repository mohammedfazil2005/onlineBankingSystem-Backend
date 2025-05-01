const users = require('../models/userModel')
const bankdetails = require('../models/bankModel')
const jwt = require('jsonwebtoken')
const randomString = require('randomstring')
const sendOTP = require('../middlewares/emailMiddlware')

let objOTP = {}

let transactionObj={}

let loanObj={}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

exports.onRegister = async (req, res) => {
    const { firstname, lastname, DOB, role, phonenumber, state, pincode, email, password,salarysource } = req.body
    const imageurl = req.file.filename
    try {
        const isUserExists = await users.findOne({ email })
        const bank = await bankdetails.findOne()

        if (isUserExists) {
            res.status(409).json({message:"User already exisits in this email!"})
        } else {
            const newUser = new users({ firstname, lastname, DOB, role, phonenumber, state, pincode, email, password, imageurl,salarysource })
            await newUser.save()

            if (newUser.role == "accountholder") {
                let month = new Date().getMonth().toString()
                let year = (new Date().getFullYear() + 5).toString().slice(2, 4)

                let bankdetails = {
                    cardholderName: `${newUser.firstname} ${newUser.lastname}`,
                    accountNumber: `${randomString.generate({ length: 8, charset: 'numeric' })}0000`,
                    cvv: randomString.generate({ length: 3, charset: 'numeric' }),
                    cardType: "Debit",
                    cardBalance: 1000,
                    cardTransactions: [],
                    cardExpiryDate: `${month.length >= 2 ? month : `0${month}/${year}`}`,
                    status: "active",
                    penalty:0,
                    sent:0,
                    received:0,
                }

                newUser.debitCard = bankdetails

                bank.bankbalance = bank.bankbalance - 1000

                newUser.notfications.push({ id: Date.now(), message: "Account Created 🔐 Your account has been set up! Check your profile and update your details if needed." })
                newUser.notfications.push({ id: Date.now(), message: "₹1000 Added 🎉 A deposit of ₹1000 has been successfully credited to your account. Check your balance for details!" })
                bank.allnotifications.push({ id: newUser._id, message: `A new account has been created! ${firstname + lastname}  has successfully signed up. Check the admin panel for details. ✅` })
            } else if (newUser.role == "creditcardmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🎉 Congratulations on your new role as Credit Card Manager! You've been successfully appointed as a staff member. Explore your dashboard to get started!"
                });
                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📢 New Staff Appointed! ${firstname + " " + lastname} has been assigned the role of Credit Card Manager. Review their access and responsibilities in the admin panel.`
                });
            } else if (newUser.role == "loanofficer") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🏦 Welcome aboard! You've been appointed as a Loan Officer. Start managing and approving loan applications effectively!"
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📢 New Staff Assigned! ${firstname + " " + lastname} is now a Loan Officer. Track loan activities under their supervision in the admin panel.`
                });
            } else if (newUser.role == "acccountmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "💼 Welcome! You've been assigned as an Account Manager. Start handling user accounts, deposits, and withdrawals seamlessly!"
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📋 Staff Update: ${firstname + " " + lastname} is now serving as an Account Manager. Monitor their account-related operations via the admin panel.`
                });
            } else if (newUser.role == "operationmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🚀 Congrats on your new position as Operations Manager! You now have access to monitor and manage key system operations."
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `🔧 Operations Manager Added! ${firstname + " " + lastname} has taken charge as the new Operations Manager. Overview their activities from the admin panel.`
                });
            }






            const token = jwt.sign({ userID: newUser._id, role: newUser.role,name: newUser.firstname }, process.env.SECRETKEY)

            await bank.save()
            await newUser.save()
            res.status(201).json({ token: token,name: newUser.firstname,role: newUser.role })

        }
    } catch (error) {
        res.status(500).json("Error occured")
        console.log(error)
    }
}

exports.onLoginWithEmailAndPassword = async (req, res) => {
    const { email, password } = req.body
    try {
        const isUserExists = await users.findOne({ email, password })
        if (isUserExists) {
            const token = jwt.sign({ userID: isUserExists._id, role: isUserExists.role, name: isUserExists.firstname }, process.env.SECRETKEY)
            res.status(200).json({ name: isUserExists.firstname, token: token,role:isUserExists.role })
        } else {
            res.status(400).json("User not exist!")
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
}

exports.onLoginWithEmail=async(req,res)=>{
    const {email} =req.body
    try {
        const isUserExists=await users.findOne({email:email})
        if(isUserExists){
            const token = jwt.sign({ userID: isUserExists._id, role: isUserExists.role, name: isUserExists.firstname }, process.env.SECRETKEY)
            isUserExists.notfications.push({ id: Date.now(), message: "Welcome back! You’re now logged in. Explore your dashboard and manage your account seamlessly. 🚀" })
            res.status(200).json({ message: "Login success", token: token,role:isUserExists.role,name:isUserExists.firstname })
        }else{
            res.status(404).json("User not found!")
        }
        

    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
}

exports.onLogin = async (req, res) => {
    const { email } = req.body
    try {
        const isEmailExists = await users.findOne({ email })
        if (isEmailExists) {
            const OTP = randomString.generate({ length: 4, charset: 'numeric' })
            objOTP[email] = OTP

            const OTPresponce = await sendOTP(email, OTP)

            if (OTPresponce.status == 200) {
                res.status(201).json("OTP Sent succesfully")

                setTimeout(() => {
                    delete objOTP[email]
                
                }, 3 * 60 * 1000)

            } else {
                res.status(404).json("Error occured")
            }

        } else {
            res.status(401).json("user not found!")
        }
    } catch (error) {
        console.log(error)
    }
}


exports.onOTP = async (req, res) => {
    const { email, OTP } = req.body
    try {
        const userExists = await users.findOne({ email })
        if (!objOTP[email]) {
            res.status(400).json("OTP expired")
        } else {
            if (objOTP[email] == OTP) {
                const token = jwt.sign({ userID: userExists._id, role: userExists.role, name: userExists.firstname }, process.env.SECRETKEY)
                userExists.notfications.push({ id: Date.now(), message: "Welcome back! You’re now logged in. Explore your dashboard and manage your account seamlessly. 🚀" })
                await userExists.save()
                res.status(200).json({ message: "Login success", token: token,role:userExists.role,name:userExists.firstname })
                delete objOTP[email]
            } else {
                res.status(400).json("Incorrect OTP")
            }
        }
    } catch (error) {
        res.status(500).json("Error occured")
    }
}


exports.onCreditCardApplication = async (req, res) => {
    let userID = req.userID
    let userROLE = req.userROLE
    if (userROLE == "accountholder") {
        const { cardType } = req.body;

        try {
            const isUserExists = await users.findById(userID)
            if (isUserExists) {

                let bankdet = await bankdetails.findOne()

                let creditCardRequestAlreadyExists = bankdet.creditcardrequests.filter((a) => a['userID'] == userID).find((user) => user.cardType == cardType)

                let isCreditCardAlreadyExists = isUserExists.creditcards.find((a) => a['cardTier'] == cardType)

                if (creditCardRequestAlreadyExists) {
                    res.status(409).json("Already requested!")
                } else {

                    if (isCreditCardAlreadyExists) {
                        res.status(400).json(`You have already ${cardType} Credit Card!`)
                    } else {
                        const payload = {
                            profileimg:isUserExists.imageurl,
                            name: `${isUserExists.firstname} ${isUserExists.lastname}`,
                            email: `${isUserExists.email}`,
                            cardType: cardType,
                            status: "pending",
                            userID: isUserExists._id,
                            id: Date.now()
                        }

                        let notification = {
                            id: Date.now(),
                            message: `${isUserExists.firstname} has applied for a credit card.`
                        }

                        let userNotification = {
                            id: Date.now(),
                            message: `You have successfully applied for a credit card.`
                        };

                        const monthIndex = new Date().getMonth()

                        let currentMonth = monthNames[monthIndex]

                        const isMonthAlreadyExists = bankdet.allcreditcardrequestmonthly.find((a) => a.month == currentMonth)

                        if (isMonthAlreadyExists) {
                            if (cardType == "silver") {
                                await bankdetails.findOneAndUpdate({'allcreditcardrequestmonthly.month':currentMonth},{$inc:{'allcreditcardrequestmonthly.$.silver':1}})
                             
                            } else if (cardType == "gold") {
                                await bankdetails.findOneAndUpdate({'allcreditcardrequestmonthly.month':currentMonth},{$inc:{'allcreditcardrequestmonthly.$.gold':1}})
                            }
                        } else {
                            const newMonth = {
                                month: currentMonth,
                                silver: cardType == "silver" ? 1 : 0,
                                gold: cardType == "gold" ? 1 : 0,
                            }
                            bankdet.allcreditcardrequestmonthly.push(newMonth)
                        }

                       

                        isUserExists.notfications.push(userNotification)
                        bankdet.creditcardrequests.push(payload);
                        bankdet.allnotifications.push(notification);

                        await bankdet.save()
                        await isUserExists.save()

                        res.status(200).json({ message: "Request success!", bank: bankdet })
                    }


                }



            } else {
                res.status(404).json("User not found!")
            }

        } catch (error) {
            console.log(error)
            res.status(500).json("Error occured")
        }
    } else {
        res.status(401).json("Not authorized!")
    }



}




exports.onTransaction = async (req, res) => {
    const userROLE = req.userROLE
    const userID = req.userID

    const {recipentAccountNumber,cardType,amount,message}=req.body

    if(userROLE=="accountholder"){

        try {
        const isUserExists=await users.findById(userID)
        const isRecipentExists=await users.findOne({'debitCard.accountNumber':recipentAccountNumber})

        if(isUserExists){
            if(isRecipentExists){
                
              let cardDetails=isUserExists.debitCard

                if(cardDetails.cardBalance>=amount){

                    if(cardDetails.status=="active"){
                        let date=new Date().getDate()
                        let month=new Date().getMonth()
                        let year=new Date().getFullYear()
    
                        let currentDate=`${date}/${month}/${year}`
    
                        transactionObj={
                            profileimage:isUserExists.imageurl,
                            from:isUserExists.firstname,
                            to:isRecipentExists.firstname,
                            date:currentDate,
                            amount:Number(amount),
                            message:message?message:'',
                            card:cardType,
                            senderID:isUserExists._id,
                            receiverID:isRecipentExists._id,
                            email:isUserExists.email
                            
                        }
    
                        let OTP=randomString.generate({charset:'numeric',length:4})
                     
                        await sendOTP(isUserExists.email,OTP)
    
                        objOTP={
                            [isUserExists.email]:OTP
                        }
    
                        res.status(200).json("Please Enter your OTP to confirm Transaction!")
                    }else{
                        res.status(403).json("Card is freezed")
                    }


                }else{
                    res.status(400).json("Insuffient Balance!")
                }
                

             

            }else{
                res.status(404).json("Oops! Account not found!")
            }
        }else{
            res.status(400).json("Please login again!")
        }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized!")
    }
    
}

exports.onTransactionOTP=async(req,res)=>{
    const userID=req.userID
    const userRole=req.userROLE

    const OTP=req.params.otp

    if(userRole=="accountholder"){

        if(objOTP[transactionObj.email]==OTP){

            try {
                const isRecipentExists=await users.findOne({_id:transactionObj.receiverID})
            const isSenderExists=await users.findOne({_id:userID})
            const bank=await bankdetails.findOne()

            let cardDetails=isSenderExists.debitCard

            if(cardDetails){

                let debitTransaction={
                    profileimage:transactionObj.profileimage,
                    to:isRecipentExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    card:'Debit',
                    message:transactionObj.message,
                    status:'success',
                    recipentID:isRecipentExists._id,
                    transactionType:"Debited",
                    transactionID:Date.now()
                }

                let creditTransaction={
                    profileimage:transactionObj.profileimage,
                    from:isSenderExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    message:transactionObj.message,
                    card:'Debit',
                    status:'success',
                    senderID:isRecipentExists._id,
                    transactionType:"Credited",
                    transactionID:Date.now()
                }

                let bankTransaction={
                    profileimage:transactionObj.profileimage,
                    from:isSenderExists.firstname,
                    to:isRecipentExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    card:transactionObj.card,
                    status:'success',
                    senderID:isRecipentExists._id,
                    recipentID:isRecipentExists._id,
                    transactionID:Date.now()
                }
                

                let debitNotification={
                   id:Date.now(),
                   message: `₹${transactionObj.amount} has been successfully debited from your account. Check your transaction history for more details. `
                }

                let creditNotification={
                   id:Date.now(),
                   message: `You've received ₹${transactionObj.amount} from John Doe. The amount has been credited to your account `
                }

                let bankNotification={
                     id: Date.now(),
                     message: `${transactionObj.amount} has been transferred by ${isSenderExists.firstname} to ${isRecipentExists.firstname}.`
                }

                let thisMonth=new Date().getMonth()

                let currentMonth=monthNames[thisMonth]

                let isMonthAlreadyExists=bank.alltransactionsmonthly.find((a)=>a['month']==currentMonth)

              

                if(isMonthAlreadyExists){
                    await bankdetails.findOneAndUpdate({'alltransactionsmonthly.month':currentMonth},{$inc:{'alltransactionsmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.alltransactionsmonthly.push(newMonth)
                }

                let isMonthAlreadyExistsInUserTransaction=isSenderExists.transactionchart.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInUserTransaction){
                    await users.findOneAndUpdate({_id:userID,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})

                    await users.findOneAndUpdate({_id:isRecipentExists._id,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    isSenderExists.transactionchart.push(newMonth)
                    isRecipentExists.transactionchart.push(newMonth)
                }

                await users.findOneAndUpdate({_id:isRecipentExists._id},{$inc:{'debitCard.cardBalance':transactionObj.amount,'debitCard.received':transactionObj.amount},$push:{'debitCard.cardTransactions':creditTransaction,notfications:creditNotification,transactions:creditTransaction}})

                await users.findOneAndUpdate({_id:isSenderExists._id},{$inc:{'debitCard.cardBalance':-transactionObj.amount,'debitCard.sent':transactionObj.amount},$push:{'debitCard.cardTransactions':debitTransaction,notfications:debitNotification,transactions:debitTransaction}})

                await bankdetails.findOneAndUpdate({},{$push:{alltransactions:bankTransaction,allnotifications:bankNotification}})

                await isSenderExists.save()
                await isRecipentExists.save()
                await bank.save()

                res.status(200).json("Transaction successfully completed!")
                



                
            }else{
                res.status(404).json("Error occured!")
            }
            } catch (error) {
                console.log(error)
                res.status(500).json(error)
            }



            
        }else{
            res.status(400).json("Invalid OTP")
        }
        
    }else{
        res.status(401).json("Not authorized")
    }


}

exports.onFetchUserTransactions=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json(isUserExists.transactions.reverse())
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }



}

exports.onFetchUserCards=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json({debitCard:isUserExists.debitCard,creditcards:isUserExists.creditcards?isUserExists.creditcards:[]})
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }
}

exports.onFetchUserNotifications=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"||userROLE=="accountmanager"||userROLE=="creditcardmanager"||userROLE=="operationmanager"||userROLE=="loanofficer"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json(isUserExists.notfications.reverse())
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized")
    }
}


exports.onFetchUserProfile=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                let userdata={
                    email:isUserExists.email,
                    firstname:isUserExists.firstname,
                    lastname:isUserExists.lastname,
                    DOB:isUserExists.DOB,
                    phonenumber:isUserExists.phonenumber,
                    state:isUserExists.state,
                    pincode:isUserExists.pincode,
                    imageurl:isUserExists.imageurl,
                }
                res.status(200).json(userdata)
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }
}

exports.onLoanApplicatiion=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    const {loanType,loanAmount,loanDuration,interestRate}=req.body

    if(userROLE=="accountholder"){
        try {

            const isUserExists=await users.findById(userID)
            const bank=await bankdetails.findOne({})
            
            if(isUserExists.loans.length>=2){
                res.status(400).json("You currently have two active loans. Please settle them before proceeding with a new loan request.")
            }else{
               if(isUserExists.requestedloans.length>=2){
                res.status(409).json("You have already requested two loans. You cannot request more at this time")
               }else{
                const payload={
                    fullname:`${isUserExists.firstname} ${isUserExists.lastname}`,
                    loanType:loanType,
                    loanDuration:loanDuration,
                    requestedAmount:loanAmount,
                    interestRate:interestRate,
                    status:"pending",
                    userID:isUserExists._id,
                    id:Date.now(),
                }

                const getMonth=new Date().getMonth()

                let currentMonth=monthNames[getMonth]

                let isMonthAlreadyExistsInLoanRequest=bank.allloanrequestmonthly.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInLoanRequest){
                    await bankdetails.findOneAndUpdate({'allloanrequestmonthly.month':currentMonth},{$inc:{'allloanrequestmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.allloanrequestmonthly.push(newMonth)
                
                }


             

                
                
                let userMessage = {
                    id: Date.now(),
                    message: `Your loan application of ₹${loanAmount} has been submitted successfully. Please wait while we review your request. You’ll be notified once a decision is made.`
                }

                let adminMessage = {
                    id: Date.now(),
                    message: `Loan application received from ${isUserExists.firstname}: ₹${loanAmount} for a ${loanDuration}-year ${loanType} loan. Pending approval.`
                };
                
                await bankdetails.findOneAndUpdate({},{$inc:{'allloanstatusmonthly.0.pending':1}})


                await users.findOneAndUpdate({_id:userID},{$push:{requestedloans:payload,notfications:userMessage}})
                bank.loanrequest.push(payload)
                bank.allnotifications.push(adminMessage)

                await bank.save()

                res.status(200).json("Loan application submitted successfully. Please wait for approval from the bank. ")
               }



            }

            
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not Authorized!")
    }


}

exports.onFetchLoans=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){

        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json({loans:isUserExists.loans?isUserExists.loans:[],requestedLoans:isUserExists.requestedloans?isUserExists.requestedloans:[]})
            }else{
                res.status(404).json("Account not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized")
    }

}


exports.onUpdateUserProfile=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID

    if(userROLE=="accountholder"){
        const {firstname,lastname,email,DOB,phonenumber,state,pincode,imageurl}=req.body

        const image=req.file?req.file.filename:imageurl;

        try {
            await users.findOneAndUpdate({_id:userID},{firstname,lastname,email,DOB,phonenumber,state,pincode,imageurl:image},{new:true})
            res.status(200).json("Updated succesfully")
            
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
        
        

    }else{
        res.status(401).json("Not authorized")
    }


}

exports.onCancelLoanRequests=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE
    const loanId=Number(req.params.id)
  
    if(userROLE=="accountholder"){
           const userNotification = {
            id: Date.now(),
            message: "The loan request has been cancelled successfully. You can apply again anytime."
          };

          const adminNotification = {
            id: Date.now(),
            message: "A user has successfully cancelled their loan request."
          };


        await users.findOneAndUpdate({_id:userID},{$pull:{requestedloans:{id:loanId}},$push:{notfications:userNotification}})
        await users.updateMany({role:"loanofficer"},{$push:{notfications:adminNotification}})
        await bankdetails.updateOne({},{$pull:{loanrequest:{id:loanId}},$push:{allnotifications:adminNotification}})
        res.status(200).json("Loan request cancelled!")
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onFetchLoanAmount=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID
    const loanID=req.params.id

    if(userROLE=="accountholder"){
        const isUser=await users.findOne({_id:userID})
        // console.log(isUser)
        const findLoan=isUser.loans.find((a)=>a['loanID']==Number(loanID))
        if(findLoan){
            res.status(200).json(findLoan)
        }else{
            res.status(404).json("Loan not found")
        }
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onFetchUserDashboardDetails=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID
    if(userROLE=="accountholder"){
        const isUser=await users.findOne({_id:userID})
        const recentTransaction=isUser.transactions.slice(-5).reverse()
        const payload={
            name:`${isUser.firstname} ${isUser.lastname}`,
            debitcardBalance:isUser.debitCard.cardBalance,
            transactions:recentTransaction,
            transactionchart:isUser.transactionchart,
            creditcards:isUser.creditcards
        }
        res.status(200).json(payload)
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onPayFullLoanAmount=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID
    const {accountNumber,cvv,loanID}=req.body

    console.log(accountNumber)
    console.log(cvv)
    console.log(loanID)
  
    if(userROLE=="accountholder"){
     try {
        const isUser=await users.findOne({'debitCard.accountNumber':accountNumber,'debitCard.cvv':cvv})
        const isLoanExists=await users.findOne({'loans.loanID':loanID})
        const loan=isLoanExists.loans.find((a)=>a['loanID']==loanID)
        if(isUser){
            if(isUser.debitCard.cardBalance>=Number(loan.loanamount)){
                const OTP=randomString.generate({charset:"numeric",length:4})
               loanObj={
                amount:Number(loan.loanamount),
                loanid:loanID,
                accountNumber:accountNumber,
                userID:userID,
                cvv:cvv,
                otp:OTP
               }
               sendOTP(isUser.email,OTP)
               res.status(200).json("OTP sent successfully!")
    
    
            }else{
                res.status(400).json("Insufficent Balance")
            }
        }else{
            res.status(404).json("Account not found")
        }
       
     } catch (error) {
        console.log(error)
        res.status(500).json(error)
     }
       
    }else{
        res.status(401).json("Not authorized")
    }
}


exports.onPayFullLoanAmountOTP=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID
    const OTP=req.params.id
  
    if(userROLE=="accountholder"){
      if(loanObj['otp']==OTP){
       try {
        let userMessage = {
            id: Date.now(),
            message: "✅ Your loan has been successfully closed. Thank you for your timely repayment!"
          };
          let adminMessage = {
            id: Date.now(),
            message: "🗂️ A user's loan has been successfully closed and marked as complete in the system."
          };

          let debitNotification={
            id:Date.now(),
            message: `₹${loanObj.amount} has been successfully debited from your account. Check your transaction history for more details. `
         }

         let creditNotification={
            id:Date.now(),
            message: `💰 A user has fully repaid their loan. The recovered amount has been successfully added back to the bank's account. `
         }

          let cDate=new Date().getDate()
          let cMonths=new Date().getMonth()
          let cYears=new Date().getFullYear()
        
          let currentDate=`${cDate}/${cMonths}/${cYears}`

          let debitTransaction={
            to:'BankAI',
            date:currentDate,
            amount:loanObj.amount,
            card:'Debit',
            message:'CLOSED LOAN',
            status:'success',
            recipentID:'BANK AI',
            transactionType:"Debited",
            transactionID:Date.now()
        }

        const isSenderExists=await users.findOne({'debitCard.accountNumber':loanObj.accountNumber})

        let thisMonth=new Date().getMonth()

        let currentMonth=monthNames[thisMonth]

        let isMonthAlreadyExistsInUserTransaction=isSenderExists.transactionchart.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInUserTransaction){
                    await users.findOneAndUpdate({'debitCard.accountNumber':loanObj.accountNumber,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    isSenderExists.transactionchart.push(newMonth)
                }

        

        await bankdetails.findOneAndUpdate({},{$inc:{bankbalance:loanObj.amount},$pull:{approvedloans:{loanID:loanObj.loanid}},$push:{allnotifications:{$each:[adminMessage,creditNotification]},alltransactions:debitTransaction,}})

        await users.updateMany({role:'accountmanager'},{$push:{notfications:adminMessage}})
        await users.findOneAndUpdate({_id:userID},{$pull:{loans:{loanID:loanObj.loanid}},$push:{notfications:userMessage}})

        await users.findOneAndUpdate({'debitCard.accountNumber':loanObj.accountNumber},{$push:{transactions:debitTransaction,notfications:debitNotification},$inc:{'debitCard.cardBalance':-loanObj.amount}})
        isSenderExists.save()
        res.status(200).json("Loan closed!!")
       } catch (error) {
        console.log(error)
        res.status(500).json(error)
       }

      }else{
        res.status(402).json("Incorrect OTP")
      }
       
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onDeletNotification=async(req,res)=>{
    const userID=req.userID
    const id =req.params.id
    try {
       
        await users.findOneAndUpdate({_id:userID},{$pull:{notfications:{id:Number(id)}}})
        res.status(200).json("Notification Deleted")
    } catch (error) {
        console.log(error)
    }


}

exports.onFetchUserDebitCardDetails=async(req,res)=>{
    const userID=req.userID
    try {
       const isUser=await users.findOne({_id:userID})
        let debitCardDetails={
            accno:isUser.debitCard.accountNumber,
            cvv:isUser.debitCard.cvv
        }
        console.log(debitCardDetails)
        res.status(200).json(debitCardDetails)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }

}