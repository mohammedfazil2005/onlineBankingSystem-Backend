const express = require('express')
const adminRouter = new express.Router()

const tokenAuthentication=require('../middlewares/jwtMiddleware')
const adminController=require('../controllers/adminController')
const multerMiddleware=require('../middlewares/multerMiddleware')


adminRouter.get('/getcreditcard/requests',tokenAuthentication,adminController.getCreditCardRequests)
adminRouter.patch('/approvecreditcard/request',tokenAuthentication,adminController.approveCreditCardRequests)
adminRouter.post('/addstaff',tokenAuthentication,multerMiddleware.single('imageurl'),adminController.addStaff)
adminRouter.get('/getloan/requests',tokenAuthentication,adminController.getAllLoanRequests)
adminRouter.patch('/approveloan',tokenAuthentication,adminController.approveLoan)
adminRouter.get('/getStaffs',tokenAuthentication,adminController.getAllStaff)
adminRouter.get('/getcreditcards/approved',tokenAuthentication,adminController.getAllApprovedCreditCards)
adminRouter.post('/withdraw/:accno',tokenAuthentication,adminController.onWithdrawel)
adminRouter.post('/withdrawOTP/:OTP',tokenAuthentication,adminController.onWithdrawelOTP)

adminRouter.get('/getaccountholders',tokenAuthentication,adminController.getAllAccountHolders)
adminRouter.get('/getalltransaction',tokenAuthentication,adminController.getAllTransactions)
adminRouter.get('/getallnotifications',tokenAuthentication,adminController.getAllNotifications)

adminRouter.get('/getdashboard/details',tokenAuthentication,adminController.getDashboardDetailsAdmin)
adminRouter.post('/sendnotifications',tokenAuthentication,adminController.sendNotificationToAllUsers)

adminRouter.patch('/sendnotification/user/:userid',tokenAuthentication,adminController.sendNotificationToUser)
adminRouter.get('/fetchuserdetails/:id',tokenAuthentication,adminController.fetchUserDetails)
adminRouter.patch('/rejectcreditcard/requests/:id',tokenAuthentication,adminController.onRejectCreditCardRequest)
adminRouter.delete('/rejectloan/requests',tokenAuthentication,adminController.onRejectLoanRequests)

module.exports=adminRouter