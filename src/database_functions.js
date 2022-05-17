/**
 * @file Handles the database functions
 * @author Hunter Madsen
 * last modified: 5/16/2022
 */


const oracle = require('oracledb')
const AWS = require('aws-sdk')


/**
 * Oracle DB Parameters
 * @type {{password: string, connectString: string, user: string}}
 */
oracle.outFormat = oracle.OBJECT
oracle.autoCommit = true
const oracleParameters = {
    connectString: 'cman1-dev.byu.edu:31200/cescpy1.byu.edu',
    user: '',
    password: '',
}


/**
 * AWS Parameters
 * @type {{Names: string[], WithDecryption: boolean}}
 */
let awsParameters = {
    Names: [`/hunter-madsen-technical-challenge/dev/ORACLEUSER`, `/hunter-madsen-technical-challenge/dev/ORACLEPASS`],
    WithDecryption: true
}


/**
 * Checks if user is connected to AWS and sets Oracle parameters
 * @param count A count to help this function only run a set number of times
 * @return none
 */
const getOracleCredentials = async function (count) {
    //AWS Configuration
    AWS.config.update({ region: `us-west-2`})
    const ssm = new AWS.SSM()

    console.clear()
    //console.log(`Testing AWS CLI connection -- please wait`)
    try {
        const returnedParameters = await ssm.getParameters(awsParameters).promise()
        oracleParameters.user = returnedParameters.Parameters[1].Value
        oracleParameters.password = returnedParameters.Parameters[0].Value
    } catch (error) {
        if (count < 2){
            await getOracleCredentials(++count)
        }
        else {
            console.log(`It appears you are not connected to AWS CLI. PLease connect and try again`)
            process.exit()
        }
    }
}


/**
 * Checks if user is connected to the proper VPN and exits with an error message if not
 * @param none
 * @returns none
 */
async function testOracleConnectivity() {
    try {
        //console.log(`Checking that your VPN is on -- please wait`)
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute(`SELECT * FROM DUAL`)
        await conn.close()
    } catch(error) {
        //12170 is the error the database returns when not connected to VPN
        if (error.errorNum  === 12170){
            console.error('It appears you are not connected to your VPN')
            console.error('Please connect to your VPN and try again')
            process.exit()
        }
        else {
            console.log('The following error just occurred: ', error.message, error.stack)
            process.exit()
        }
    }
}

/**
 * Adds an rmpCourse to the database along with an associated BYU-ID
 * @param rmpCourse
 * @param userBYUID
 * @returns none
 */
async function addRmpClassToDatabase(rmpCourse, userBYUID) {
    try {
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute('INSERT INTO OIT#MHM62.SAVED_RMP_CLASSES (' +
            'SAVED_ID' +
            ', CLASS_NAME' +
            ', CLASS_TITLE' +
            ', ASSOSIATED_USER_BYUID' +
            ', SECTION' +
            ', INSTRUCTOR' +
            ', INSTRUCTION_MODE' +
            ', DAYS, CLASS_TIME' +
            ', BUILDING' +
            ', AVAILABLE_SEATS' +
            ', TOTAL_ENROLLED' +
            ', WAITLIST' +
            ', AVG_DIFFICULTY' +
            ', AVG_RATING' +
            ', NUM_RATINGS' +
            ')' +
            'VALUES (:' +
            'savedID' +
            ', :className' +
            ', :classTitle' +
            ', :assosiatedUserBYUID' +
            ', :section' +
            ', :instructor' +
            ', :instructionMode' +
            ', :days' +
            ', :classtime' +
            ', :building' +
            ', :availableSeats' +
            ', :totalEnrolled' +
            ', :waitlist' +
            ', :avgDifficulty' +
            ', :avgRating' +
            ', :numRatings' +
            ')',
            [rmpCourse.UUID
                , rmpCourse.CLASS_NAME
                , rmpCourse.CLASS_TITLE
                , userBYUID
                , rmpCourse.SECTION
                , rmpCourse.INSTRUCTOR
                , rmpCourse.INSTRUCTION_MODE
                , rmpCourse.DAYS
                , rmpCourse.CLASS_TIME
                , rmpCourse.BUILDING
                , rmpCourse.AVAILABLE_SEATS
                , rmpCourse.TOTAL_ENROLLED
                , rmpCourse.WAITLIST
                , rmpCourse.AVG_DIFFICULTY
                , rmpCourse.AVG_RATING
                , rmpCourse.NUM_RATINGS])

        await conn.close()
        console.log(`Added '${rmpCourse.CLASS_TITLE}' to the database`)
    } catch (e) {
        // Catch the error of added a duplicate course
        if (e.message.includes('unique')) {
            console.log('Class already added')
        }
        else if (e.message.includes('table or view does not exist')) {
            // Rebuilds the table if it has been destroyed
            await createTableInDatabase()
            return addRmpClassToDatabase(rmpCourse, userBYUID)
        }
        else {
            console.log(e.stack)
        }
    }
}

/**
 * Pulls saved courses from the database for a given user
 * @param userBYUID
 * @returns result of the database query
 */
async function getSavedRmpClasses(userBYUID) {
    try {
        const conn = await oracle.getConnection(oracleParameters)
        let result = await conn.execute(`SELECT * FROM OIT#MHM62.SAVED_RMP_CLASSES WHERE ASSOSIATED_USER_BYUID = :userBYUID`, [userBYUID])
        await conn.close()
        return result
    } catch (e) {
        if (e.message.includes('table or view does not exist')) {
            // Rebuilds the table if it has been destroyed
            await createTableInDatabase()
            return getSavedRmpClasses(userBYUID)
        }
        await testOracleConnectivity()
        console.log(e)
    }
}

/**
 * Removes a saved course from the database by uuid
 * @param uuid
 * @returns success boolean
 */
async function removeRmpClassFromDatabase(uuid) {
    try {
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute(`DELETE FROM OIT#MHM62.SAVED_RMP_CLASSES WHERE SAVED_ID = :uuid`, [uuid])
        await conn.close()
    } catch (e) {
        await testOracleConnectivity()
        console.log(e)
        return false
    }
    return true
}


/**
 * Removes all saved courses for a specified user
 * @param byuID
 * @returns boolean
 */
async function removeAllClassesForUser(byuID) {
    try {
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute(`DELETE FROM OIT#MHM62.SAVED_RMP_CLASSES WHERE ASSOSIATED_USER_BYUID = :byuID`, [byuID])
        await conn.close()
    } catch (e) {
        await testOracleConnectivity()
        console.log(e.stack)
        return false
    }
    return true
}


/**
 * Clears and rebuilds the table in the database (for dev use)
 * @param none
 * @returns none
 */
async function clearAndRebuildDatabase() {
    // Development use only
    try {
        await getOracleCredentials(1)
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute('DROP TABLE SAVED_RMP_CLASSES')
        await conn.close()
        await createTableInDatabase()
        console.log('Database cleared SAVED_RMP_CLASSES')
    } catch (e) {
        await testOracleConnectivity()
        console.log(e)
    }
}

/**
 * Creates the program table for the database
 * @param none
 * @returns none
 */
async function createTableInDatabase() {
    try {
        const conn = await oracle.getConnection(oracleParameters)
        await conn.execute('CREATE TABLE OIT#MHM62.SAVED_RMP_CLASSES' +
            '(' +
            '    SAVED_ID VARCHAR2(40) NOT NULL PRIMARY KEY,' +
            '    CLASS_NAME VARCHAR2(30),' +
            '    CLASS_TITLE VARCHAR2(35),' +
            '    ASSOSIATED_USER_BYUID VARCHAR2(10) NOT NULL,' +
            '    SECTION VARCHAR2(5),' +
            '    INSTRUCTOR VARCHAR2(30) NOT NULL,' +
            '    INSTRUCTION_MODE VARCHAR2(30),' +
            '    DAYS VARCHAR2(15),' +
            '    CLASS_TIME VARCHAR(15),' +
            '    BUILDING VARCHAR2(15),' +
            '    AVAILABLE_SEATS INTEGER,' +
            '    TOTAL_ENROLLED INTEGER,' +
            '    WAITLIST INTEGER,' +
            '    AVG_DIFFICULTY NUMBER(1),' +
            '    AVG_RATING NUMBER(1),' +
            '    NUM_RATINGS INTEGER' +
            ')')
        await conn.close()
        console.log('Table added to database')
    } catch (e) {
        console.log(e)
        await testOracleConnectivity()
    }
}


module.exports = {addRmpClassToDatabase, getSavedRmpClasses, removeRmpClassFromDatabase,
    clearAndRebuildDatabase, getOracleCredentials, testOracleConnectivity, removeAllClassesForUser}