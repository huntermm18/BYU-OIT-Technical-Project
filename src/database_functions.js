const oracle = require('oracledb')
const UUID = require('uuid')
const program_functions = require("./program_functions");


//Oracle DB Parameters
oracle.outFormat = oracle.OBJECT
oracle.autoCommit = true
const oracleParams = {
    connectString: 'cman1-dev.byu.edu:31200/cescpy1.byu.edu',
    user: 'oit#mhm62', // fixme
    password: '$Hunter717byuoit', // fixme
}

// AWS Parameters todo
//let saveID = 1 // to be incremented with each add to database // todo delete me
async function addRmpClassToDatabase(rmpClass, userBYUID) {
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute('INSERT INTO OIT#MHM62.SAVED_RMP_CLASSES (SAVED_ID, ASSOSIATED_USER_BYUID, INSTRUCTOR,' +
            ' INSTRUCTION_MODE, DAYS, CLASSTIME, BUILDING, AVAILABLE_SEATS, TOTAL_ENROLLED, WAITLIST, AVG_DIFFICULTY, AVG_RATING, NUM_RATINGS)' +
            'VALUES (:savedID, :assosiatedUserBYUID, :instructor, :instructionMode, :days, :classtime,' +
            ' :building, :availableSeats, :totalEnrolled, :waitlist, :avgDifficulty, :avgRating, :numRatings)',
            [UUID.v4(), userBYUID, rmpClass.instructor, rmpClass.instruction_mode, rmpClass.days, rmpClass.classtime,
            rmpClass.building, rmpClass.availableSeats, rmpClass.totalEnrolled, rmpClass.waitList,
            rmpClass.avgDifficulty, rmpClass.avgRating, rmpClass.numRatings])

        await conn.close()
        //saveID++ // increment the save index
        console.log('success')
    } catch (e) {
        console.log(e)
        return false
    }
    return true
}

async function getSavedRmpClasses(userBYUID) {
    try {
        const conn = await oracle.getConnection(oracleParams)
        const executeStatement = `SELECT * FROM OIT#MHM62.SAVED_RMP_CLASSES WHERE ASSOSIATED_USER_BYUID = '${userBYUID}'`
        let result = await conn.execute(executeStatement)
        await conn.close()
        return result
    } catch (e) {
        console.log(e)
    }
}

async function clearDatabase() {
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute('drop table saved_rmp_classes')
        await conn.close()
        console.log('Database cleared SAVED_RMP_CLASSES')
    } catch (e) {
        console.log(e)
    }
}


module.exports = {addRmpClassToDatabase, clearDatabase, getSavedRmpClasses}