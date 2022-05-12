const oracle = require('oracledb')
const UUID = require('uuid')
//const program_functions = require("./program_functions");


//Oracle DB Parameters
oracle.outFormat = oracle.OBJECT
oracle.autoCommit = true
const oracleParams = {
    connectString: 'cman1-dev.byu.edu:31200/cescpy1.byu.edu',
    user: 'oit#mhm62', // fixme
    password: '', // fixme
}

// AWS Parameters todo

async function addRmpClassToDatabase(rmpClass, userBYUID) {
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute('INSERT INTO OIT#MHM62.SAVED_RMP_CLASSES (SAVED_ID, CLASS_NAME, CLASS_TITLE, ASSOSIATED_USER_BYUID, INSTRUCTOR,' +
            ' INSTRUCTION_MODE, DAYS, CLASSTIME, BUILDING, AVAILABLE_SEATS, TOTAL_ENROLLED, WAITLIST, AVG_DIFFICULTY, AVG_RATING, NUM_RATINGS)' +
            'VALUES (:savedID, :className, :classTitle, :assosiatedUserBYUID, :instructor, :instructionMode, :days, :classtime,' +
            ' :building, :availableSeats, :totalEnrolled, :waitlist, :avgDifficulty, :avgRating, :numRatings)',
            [rmpClass.uuid, rmpClass.className, rmpClass.classTitle, userBYUID, rmpClass.instructor, rmpClass.instruction_mode, rmpClass.days, rmpClass.classtime,
            rmpClass.building, rmpClass.availableSeats, rmpClass.totalEnrolled, rmpClass.waitList,
            rmpClass.avgDifficulty, rmpClass.avgRating, rmpClass.numRatings])

        await conn.close()
        console.log(`Added class to the database`)
    } catch (e) {
        if (e.message.includes('unique')) {
            console.log('Class already added')
        }
        else if (e.message.includes('table or view does not exist')) {
            await creatTableInDatabase()
            return addRmpClassToDatabase(rmpClass, userBYUID)
        }
        else {
            console.log(e)
        }
    }
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

async function removeRmpClassFromDatabase(uuid) {
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute(`DELETE FROM OIT#MHM62.SAVED_RMP_CLASSES WHERE SAVED_ID = :uuid`, [uuid])

        await conn.close()
    } catch (e) {
        console.log(e)
        return false
    }
    return true
}


async function clearAndRebuildDatabase() {
    // Development use only
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute('DROP TABLE SAVED_RMP_CLASSES')
        await conn.close()
        await creatTableInDatabase()
        console.log('Database cleared SAVED_RMP_CLASSES')
    } catch (e) {
        console.log(e)
    }
}

async function creatTableInDatabase() {
    try {
        const conn = await oracle.getConnection(oracleParams)
        await conn.execute('CREATE TABLE OIT#MHM62.SAVED_RMP_CLASSES' +
            '(' +
            '    SAVED_ID VARCHAR2(40) NOT NULL PRIMARY KEY,' +
            '    CLASS_NAME VARCHAR2(30),' +
            '    CLASS_TITLE VARCHAR2(35),' +
            '    ASSOSIATED_USER_BYUID VARCHAR2(10) NOT NULL,' +
            '    INSTRUCTOR VARCHAR2(30) NOT NULL,' +
            '    INSTRUCTION_MODE VARCHAR2(30),' +
            '    DAYS VARCHAR2(15),' +
            '    CLASSTIME VARCHAR(15),' +
            '    BUILDING VARCHAR2(15),' +
            '    AVAILABLE_SEATS INTEGER,' +
            '    TOTAL_ENROLLED INTEGER,' +
            '    WAITLIST INTEGER,' +
            '    AVG_DIFFICULTY NUMBER,' +
            '    AVG_RATING NUMBER,' +
            '    NUM_RATINGS INTEGER' +
            ')')
        await conn.close()
        console.log('Table added to database')
    } catch (e) {
        console.log(e)
    }
}


module.exports = {addRmpClassToDatabase, getSavedRmpClasses, removeRmpClassFromDatabase, clearAndRebuildDatabase, creatTableInDatabase}