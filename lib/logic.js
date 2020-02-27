/*** TRANSACTIONS FOR ALL PARTICIPANT ******/
/*
* create participant function
* @param {org.altiux.hrms.CreateParticipant} cp
* @transaction
*/

async function  CreateParticipant(cp)
{
  
    let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
    let DirectorRegistry = await getParticipantRegistry('org.altiux.hrms.Director');
  	//let WalletIdExistReceiver = await WalletRegistry.exists(cp.wallet.walletId);
    //let WalletIdExist = await WalletRegistry.exists(cp.director.wallet.walletId);
    //let DirectorIdExist = await DirectorRegistry.exists(cp.director.directorId);
    if(cp.wallet.isAssigned == true) {
       throw new Error("Wallet already assigned to participant")
    }
  
  if(cp.participantType != undefined) {
   let factory = getFactory();
   let participantRsc = factory.newResource('org.altiux.hrms',cp.participantType, cp.participantId);
    let wallet = factory.newRelationship('org.altiux.hrms','Wallet',cp.wallet.walletId);
   participantRsc.profile = cp.profile;
   if(participantRsc.hasOwnProperty('salary')) { 
   		participantRsc.salary = cp.salary;
   }
   participantRsc.wallet = wallet;
   
  participantRegistry = await getParticipantRegistry(`org.altiux.hrms.${cp.participantType}`);
   await participantRegistry.add(participantRsc)
    cp.wallet.isAssigned = true 
    return getAssetRegistry('org.altiux.hrms.Wallet')
        .then(function(assetregistry) {
      		
      		let createParticipantEvent = getFactory().newEvent('org.altiux.hrms', 'CreateParticipantEvent');
          createParticipantEvent.participantId = cp.participantId
          createParticipantEvent.participantType = cp.participantType
          createParticipantEvent.walletId = cp.wallet.walletId
      console.log('createParticipantEvent:',createParticipantEvent)
          emit(createParticipantEvent);
            
      return assetregistry.update(cp.wallet);
        })
  }
  
}

/*** TRANSACTIONS FOR DIRECTOR ******/
/*
* payment transfer by Director: transcation processor function
* @param {org.altiux.hrms.PaymentTransferByDirector} ptd
* @transaction
*/

async function  PaymentTransferByDirector(ptd)
{
 
    let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
    let DirectorRegistry = await getParticipantRegistry('org.altiux.hrms.Director');
  	let WalletIdExistReceiver = await WalletRegistry.exists(ptd.wallet.walletId);
    let WalletIdExist = await WalletRegistry.exists(ptd.director.wallet.walletId);
    let DirectorIdExist = await DirectorRegistry.exists(ptd.director.directorId);
    
  
    if(WalletIdExistReceiver && WalletIdExist && DirectorIdExist){
        if(ptd.director.wallet.balance > ptd.amount){
            ptd.wallet.balance += ptd.amount
            ptd.director.wallet.balance -=ptd.amount
            
            await WalletRegistry.update(ptd.director.wallet);  
            await WalletRegistry.update(ptd.wallet);
          
          let paymentTransferByDirectorEvent = getFactory().newEvent('org.altiux.hrms', 'PaymentTransferByDirectorEvent');
          paymentTransferByDirectorEvent.amount = ptd.amount
          paymentTransferByDirectorEvent.directorId = ptd.director.directorId
          paymentTransferByDirectorEvent.walletId = ptd.wallet.walletId
          emit(paymentTransferByDirectorEvent);
        }
        else{
        throw new Error("Insufficient balance in Director account")
        }
    }
    else{
        throw new Error('Either Wallet of Manager, Receiver Does not Exist');
    }   
}

/*** TRANSACTIONS FOR MANAGER ******/
/*
* fund add by Manager: transcation processor function
* @param {org.altiux.hrms.FundAddByManager} ft
* @transaction
*/
async function  FundAddByManager(ft)
{
    let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
    let ManagerRegistry = await getParticipantRegistry('org.altiux.hrms.Manager');
    let FundRegistry = await getAssetRegistry('org.altiux.hrms.Funds');
    let WalletIdExist = await WalletRegistry.exists(ft.manager.wallet.walletId);
    let ManagerIdExist = await ManagerRegistry.exists(ft.manager.managerId);
    if(WalletIdExist && ManagerIdExist){
        if(ft.manager.wallet.balance > ft.amount){
            ft.fund.balance += ft.amount
            ft.manager.wallet.balance -=ft.amount
            
            await WalletRegistry.update(ft.manager.wallet);  
            await FundRegistry.update(ft.fund);
          
            let fundAddByManagerEvent = getFactory().newEvent('org.altiux.hrms', 'FundAddByManagerEvent')
            fundAddByManagerEvent.amount = ft.amount
            fundAddByManagerEvent.fundId = ft.fund.fundId
            fundAddByManagerEvent.managerId = ft.manager.managerId
            emit(fundAddByManagerEvent);
        }
        else{
        throw new Error("Insufficient balance in managers account")
        }
    }
    else{
        throw new Error('Either Wallet Or Manager Doesnot Exist');
    }   
}

/*
* Fund transfer by manager:transcation processor function
* @param {org.altiux.hrms.FundTransferByManager} ftm
* @transaction
*/

async function FundTransferByManager(ftm)
{
  		let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
        let ManagerRegistry = await getParticipantRegistry('org.altiux.hrms.Manager');
        let FundRegistry = await getAssetRegistry('org.altiux.hrms.Funds');
        let WalletIdExist = await WalletRegistry.exists(ftm.manager.wallet.walletId);
        let ManagerIdExist = await ManagerRegistry.exists(ftm.manager.managerId);
        if(WalletIdExist && ManagerIdExist) {
  		if(ftm.fund.balance > ftm.amount)
        {
            let fundTransferByManagerEvent = getFactory().newEvent('org.altiux.hrms', 'FundTransferByManagerEvent')
            fundTransferByManagerEvent.amount = ftm.amount
            fundTransferByManagerEvent.fundId = ftm.fund.fundId
            fundTransferByManagerEvent.managerId = ftm.manager.managerId
            fundTransferByManagerEvent.employeeId = ftm.employee.employeeId
            emit(fundTransferByManagerEvent);
          
            ftm.fund.balance -= ftm.amount
            ftm.employee.wallet.balance += ftm.amount
            return getAssetRegistry('org.altiux.hrms.Funds')
            .then(function(accRegistry){
                return accRegistry.update(ftm.fund);
            }).then(function(){
                return getAssetRegistry('org.altiux.hrms.Wallet');
            }).then(function(accRegistry){
                return accRegistry.update(ftm.employee.wallet);
            }).then(function(){
                return getParticipantRegistry('org.altiux.hrms.Employee');
            });
        }
        else{
            throw new Error("Fund Balance insufficient")
        }
        } else {
          
        }
}

/*
* Employee Salary: transcation processor function
* @param {org.altiux.hrms.EmployeeSalary} es
* @transaction
*/

function EmployeeSalary(es)
{
  if(es.employee.salaryStatus != "APPROVED") {
    throw new Error("Employee not approved")
  }
  if(es.employee.salaryStatus == "UNPAID")
    {
        if(es.fund.balance > es.employee.salary)
        {
            let employeeSalaryEvent = getFactory().newEvent('org.altiux.hrms', 'EmployeeSalaryEvent')
            employeeSalaryEvent.salary = es.employee.salary
            employeeSalaryEvent.fundId = es.fund.fundId
            employeeSalaryEvent.managerId = es.manager.managerId
            employeeSalaryEvent.employeeId = es.employee.employeeId
            emit(employeeSalaryEvent);  
          
            es.fund.balance -= es.employee.salary
            es.employee.wallet.balance += es.employee.salary
            es.employee.salaryStatus = "PAID"
            return getAssetRegistry('org.altiux.hrms.Funds')
            .then(function(accRegistry){
                return accRegistry.update(es.fund);
            }).then(function(){
                return getAssetRegistry('org.altiux.hrms.Wallet');
            }).then(function(accRegistry){
                return accRegistry.update(es.employee.wallet);
            }).then(function(){
                return getParticipantRegistry('org.altiux.hrms.Employee');
            }).then(function(participantRegistry){
                return participantRegistry.update(es.employee);
            });
        }
        else{
            throw new Error("Fund Balance insufficient")
        }
        
    }
    else{
        throw new Error("You are already paid")
    }
}

/**
 * update employee(approve) : transaction
 * @param {org.altiux.hrms.UpdateEmployee} ue 
 * @transaction
 */
function UpdateEmployee(ue) {
	
    let currentParticipant = getCurrentParticipant();
  	//console.log('currentParticipant:',currentParticipant)
  	//console.log('getFullyQualifiedType:',currentParticipant.getFullyQualifiedType())
    // Check to see if the current participant is a driver.
    if (currentParticipant.getFullyQualifiedType() !== 'org.altiux.hrms.Manager' 
        && currentParticipant.getFullyQualifiedType() !== 'org.altiux.hrms.Admin'
        && currentParticipant.getFullyQualifiedType() !== 'org.hyperledger.composer.system.NetworkAdmin') {
      // Throw an error as the current participant is not a driver or Admin or System Admin.
      throw new Error('Current participant is not a Manager or Admin or System Admin');
    }
    
    //update values of the assets
    ue.employee.status = 'APPROVED';
    ue.employee.approver = currentParticipant.participantId ;
    return getParticipantRegistry('org.altiux.hrms.Employee')
        .then(function (participantRegistry) {
      	  let updateEmployeeEvent = getFactory().newEvent('org.altiux.hrms', 'UpdateEmployeeEvent')
          updateEmployeeEvent.managerId = currentParticipant.participantId
          updateEmployeeEvent.employeeId = ue.employee.employeeId
          emit(updateEmployeeEvent);
      
          return participantRegistry.update(ue.employee)
});
}

/*
* payment transfer to external resources(vendor,consultant): transcation processor function
* @param {org.altiux.hrms.PaymentTransferByManager} ptm
* @transaction
*/

async function  PaymentTransferByManager(ptm)
{
    let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
    let ManagerRegistry = await getParticipantRegistry('org.altiux.hrms.Manager');
  	let WalletIdExistReceiver = await WalletRegistry.exists(ptm.wallet.walletId);
    let WalletIdExist = await WalletRegistry.exists(ptm.manager.wallet.walletId);
    let ManagerIdExist = await ManagerRegistry.exists(ptm.manager.managerId);
    if(WalletIdExistReceiver && WalletIdExist && ManagerIdExist){
        if(ptm.manager.wallet.balance > ptm.amount){
            ptm.wallet.balance += ptm.amount
            ptm.manager.wallet.balance -=ptm.amount
            
            await WalletRegistry.update(ptm.manager.wallet);  
            await WalletRegistry.update(ptm.wallet);
          
            let paymentTransferByManagerEvent = getFactory().newEvent('org.altiux.hrms', 'PaymentTransferByManagerEvent');
            paymentTransferByManagerEvent.amount = ptm.amount
            paymentTransferByManagerEvent.managerId = ptm.manager.managerId
            paymentTransferByManagerEvent.walletId = ptm.wallet.walletId
            emit(paymentTransferByManagerEvent);
        }
        else{
        throw new Error("Insufficient balance in manager account")
        }
    }
    else{
        throw new Error('Either Wallet of Manager, Receiver Does not Exist');
    }   
}

/*** TRANSACTIONS FOR CUSTOMER ******/
/*
* payment transfer by customer: transcation processor function
* @param {org.altiux.hrms.PaymentTransferByCustomer} ftc
* @transaction
*/

async function  PaymentTransferByCustomer(ftc)
{
    let WalletRegistry = await getAssetRegistry('org.altiux.hrms.Wallet');
    let CustomerRegistry = await getParticipantRegistry('org.altiux.hrms.Customer');
  	let WalletIdExistReceiver = await WalletRegistry.exists(ftc.wallet.walletId);
    let WalletIdExist = await WalletRegistry.exists(ftc.customer.wallet.walletId);
    let CustomerIdExist = await CustomerRegistry.exists(ftc.customer.customerId);
    if(WalletIdExistReceiver && WalletIdExist && CustomerIdExist){
        if(ftc.customer.wallet.balance > ftc.amount){
            ftc.wallet.balance += ftc.amount
            ftc.customer.wallet.balance -=ftc.amount
            
            await WalletRegistry.update(ftc.customer.wallet);  
            await WalletRegistry.update(ftc.wallet);
          
          let paymentTransferByCustomerEvent = getFactory().newEvent('org.altiux.hrms', 'PaymentTransferByCustomerEvent');
          paymentTransferByCustomerEvent.amount = ftc.amount
          paymentTransferByCustomerEvent.customerId = ftc.customer.customerId
          paymentTransferByCustomerEvent.walletId = ftc.wallet.walletId
          emit(paymentTransferByCustomerEvent);
        }
        else{
        throw new Error("Insufficient balance in customers account")
        }
    }
    else{
        throw new Error('Either Wallet of Customer, Receiver Does not Exist');
    }   
}

/*** TRANSACTIONS FOR ADMIN ******/
/**
 * sample transaction
 * @param {org.altiux.hrms.UpdateDocument} ud 
 * @transaction
 */
function UpdateDocument(ud) {
	
    let currentParticipant = getCurrentParticipant();
  	//console.log('currentParticipant:',currentParticipant)
  	//console.log('getFullyQualifiedType:',currentParticipant.getFullyQualifiedType())
    // Check to see if the current participant is a driver.
    if (currentParticipant.getFullyQualifiedType() !== 'org.altiux.hrms.Manager' 
        && currentParticipant.getFullyQualifiedType() !== 'org.altiux.hrms.Admin'
        && currentParticipant.getFullyQualifiedType() !== 'org.hyperledger.composer.system.NetworkAdmin') {
      // Throw an error as the current participant is not a driver or Admin or System Admin.
      throw new Error('Current participant is not a Manager or Admin or System Admin');
    }
    //update values of the assets
    ud.document.status = 'APPROVED'
    ud.document.approver = currentParticipant.participantId
    return getAssetRegistry('org.altiux.hrms.Document')
        .then(function (assetRegistry) {
      	  let updateDocumentEvent = getFactory().newEvent('org.altiux.hrms', 'UpdateDocumentEvent')
          updateDocumentEvent.adminId = currentParticipant.participantId
          updateDocumentEvent.documentId = ud.document.documentId
          emit(updateDocumentEvent);
         return assetRegistry.update(ud.document)
});
}

/***** QUERY TRANSACTION IMPLEMENTATION *************/
/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.investmentByDirectorTx} dr
 * @returns {total} The concept.
 * @transaction
 */
async function investmentByDirectorTx(dr) {
 let results = await query('investmentByDirectorQry', { director: `resource:org.altiux.hrms.Director#${dr.director.directorId}` });
  console.log("results:",results)
  let total = 0
  
  
  var date = new Date();
   date.setDate(date.getDate() - dr.daysFrom);
  if(dr.daysFrom != undefined && dr.daysFrom != null) {
  results.forEach(async t => {
    console.log(t.timestamp,date)
    if(t.timestamp.getTime() > date.getTime()) {
    total += t.amount
    } 
  });
 } else {
   results.forEach(async t => {
    total += t.amount
  });
 }
  console.log('total:',total);
  /*const factory = getFactory();
  const responseTotal = factory.newConcept('org.altiux.hrms', 'ResponseTotal');
  responseTotal.message = 'Total Investment by all Directors!';
  return responseTotal;*/
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}


/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.investmentByAllDirectorTx} null
 * @returns {total} The concept.
 * @transaction
 */
async function investmentByAllDirectorTx() {
 let results = await query('investmentByAllDirectorQry')
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  /*const factory = getFactory();
  const responseTotal = factory.newConcept('org.altiux.hrms', 'ResponseTotal');
  responseTotal.message = 'Total Investment by director!';
  responseTotal.total = total;
  return responseTotal;*/
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}


/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.dividendFundToDirectorByManagerTx} mgr
 * @returns {total} The concept.
 * @transaction
 */
async function dividendFundToDirectorByManagerTx(mgr) {
  console.log('mgr:',mgr)
 let results = await query('dividendFundToDirectorByManagerQry', { manager: `resource:org.altiux.hrms.Manager#${mgr.manager.managerId}` })
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}

/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.dividendFundToDirectorByAllManagerTx} null
 * @returns {total} The concept.
 * @transaction
 */
async function dividendFundToDirectorByAllManagerTx() {
 let results = await query('dividendFundToDirectorByAllManagerQry')
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}


/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.revenueFundsByCustomerTx} rfc
 * @returns {total} The concept.
 * @transaction
 */
async function revenueFundsByCustomerTx(rfc) {
  console.log('rfc:',rfc)
 let results = await query('revenueFundsByCustomerQry', { customer: `resource:org.altiux.hrms.Customer#${rfc.customer.customerId}` })
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}

/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.revenueFundsByAllCustomerTx} null
 * @returns {total} The concept.
 * @transaction
 */
async function revenueFundsByAllCustomerTx() {
 let results = await query('revenueFundsByAllCustomerQry')
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}


/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.outsourceFundToVendorTx} ofv
 * @returns {total} The concept.
 * @transaction
 */
async function outsourceFundToVendorTx(ofv) {
  console.log('rfc:',ofv)
 let results = await query('outsourceFundToVendorQry', { vendor: `resource:org.altiux.hrms.Vendor#${ofv.vendor.vendorId}` })
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}

/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.outsourceFundToAllVendorTx} null
 * @returns {total} The concept.
 * @transaction
 */
async function outsourceFundToAllVendorTx() {
 let results = await query('outsourceFundToAllVendorQry')
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}


/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.fundToConsultantTx} ofc
 * @returns {total} The concept.
 * @transaction
 */
async function fundToConsultantTx(ofc) {
  console.log('rfc:',ofc)
 let results = await query('fundToConsultantQry', { consultant: `resource:org.altiux.hrms.Consultant#${ofc.consultant.consultantId}` })
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}

/**
 * Try access elements of an array of B assets
 * @param {org.altiux.hrms.fundToAllConsultantTx} null
 * @returns {total} The concept.
 * @transaction
 */
async function fundToAllConsultantTx() {
 let results = await query('fundToAllConsultantQry')
  console.log("results:",results)
  let total = 0
  results.forEach(async t => {
    total += t.amount
  });
  console.log('total:',total);
  let notificationQryTx = getFactory().newEvent('org.altiux.hrms', 'NotificationQryTx')
  notificationQryTx.total = total
  emit(notificationQryTx);
  return total;
}