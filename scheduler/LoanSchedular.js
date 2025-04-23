const schedular=require('node-cron')
const users=require('../models/userModel')
const bank=require('../models/bankModel')

let date=new Date().getDate()
let month=new Date().getMonth()
let year=new Date().getFullYear()

let currentDate = `${date}/${month < 10 ? '0' + month : month}/${year}`;

const EMIfunction=async()=>{
    try {
        const allUsers=await bank.findOne({})
        
        const todayLoan=allUsers.approvedloans.filter((a)=>a['EMIdate']==currentDate)
        if(todayLoan.length>0){

            for(let eachLoan of todayLoan){
                const isUserExists=await users.findOne({_id:eachLoan.userID})
                if(isUserExists.debitCard.cardBalance>=eachLoan.EMIAmount){


                    const EMIPaymentSuccessNotification = {
                        id: Date.now(),
                        message: `✅ EMI Paid Successfully! Your EMI of ₹${eachLoan.EMIAmount} has been successfully deducted from your account. Thank you for staying on track with your loan repayment.`
                      };

                      const AdminEMIPaymentSuccessNotification = {
                        id: Date.now(),
                        message: `✅ EMI Payment Received: An EMI of ₹${eachLoan.EMIAmount} has been successfully deducted from the account of user (User ID: ${eachLoan.userID}).`
                      };

                      let cDate=new Date().getDate()
                      let cMonths=new Date().getMonth()
                      let cYears=new Date().getFullYear()
  
                      let currentDate=`${cDate}/${cMonths}/${cYears}`

                      let debitTransaction={
                        from:'BANK AI',
                        date:currentDate,
                        amount:eachLoan.EMIAmount,
                        message:'EMI Paid Successfully! Your EMI of ₹${eachLoan.EMIAmount} has been successfully deducted from your account. Thank you for staying on track with your loan repayment',
                        card:'debit',
                        status:'success',
                        senderID:'BANK AI'
                    }


                    
                      let date=new Date().getDate()
                      let month=new Date().getMonth() + 1
                      let year=new Date().getFullYear()

                      let nextDateEmi=`${date}/${month < 10 ? '0' + month : month}/${year}`

                     await users.findOneAndUpdate({_id:eachLoan.userID,'loans.loanID':eachLoan.loanID},{$inc:{'debitCard.cardBalance':-eachLoan.EMIAmount,'loans.$.remainingloanamount':-eachLoan.EMIAmount},$set:{'loans.$.EMIdate':nextDateEmi},$push:{notfications:EMIPaymentSuccessNotification,transactions:debitTransaction,'debitCard.cardTransactions':debitTransaction}})

                     await bank.findOneAndUpdate({'approvedloans.loanID':eachLoan.loanID},{$inc:{'approvedloans.$.remainingloanamount':-eachLoan.EMIAmount,bankbalance:eachLoan.EMIAmount},$set:{'approvedloans.$.EMIdate':nextDateEmi},$push:{allnotifications:AdminEMIPaymentSuccessNotification,alltransactions:debitTransaction}})



                }else{
                    let penaltyAmount=500
                    
                    const InsufficientBalanceNotification = {
                        id: Date.now(),
                        message: `⚠️ EMI Payment Failed! ₹500 penalty has been applied. We couldn't deduct your EMI due to insufficient balance in your account. Please ensure your account has enough funds to avoid further penalties or impact on your credit history.`
                      };

                      const AdminNotification = {
                        id: Date.now(),
                        message: `⚠️ EMI Payment Alert: EMI deduction failed for user (User ID: ${eachLoan.userID}) due to insufficient balance. ₹500 penalty has been applied to the user's account.`
                      };

                      let date=new Date().getDate()
                      let month=new Date().getMonth() + 1
                      let year=new Date().getFullYear()

                      let RescheduledDate=`${date}/${month < 10 ? '0' + month : month}/${year}`
                      

                      await users.findOneAndUpdate({_id:eachLoan.userID},{$push:{notfications:InsufficientBalanceNotification}})
                      await users.findOneAndUpdate({_id:eachLoan.userID,'loans.loanID':eachLoan.loanID},{$set:{'loans.$.EMIdate':RescheduledDate},$inc:{'debitCard.penalty':penaltyAmount}})
                      await bank.findOneAndUpdate({'approvedloans.loanID':eachLoan.loanID},{$push:{allnotifications:AdminNotification}})


                }
            }


        }else{
            console.log("📭 No EMI today")
        }
        
    } catch (error) {

        console.log(error)
    }
}

schedular.schedule("0 0  * * *",EMIfunction)