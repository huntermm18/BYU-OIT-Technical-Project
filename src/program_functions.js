/**
 * @file Stores many of the main functions used throughout the program
 * @author Hunter Madsen
 * last modified: 5/17/2022
 */


const inquirer = require('inquirer');
const ratings = require('@mtucourses/rate-my-professors').default;
const api_calls = require('./api_calls')
const database_functions = require('./database_functions')
const UUID = require("uuid");
const { exec } = require("child_process");

// String used in selection menus
const restartText = 'Restart Search'

/**
 * Class to create objects that will store information on the class and its associated rate-my-professor data
 * @param none
 * @returns none
 */
class rmpCourse {
    constructor(className, classTitle, section, instructor, instructionMode, days, classtime,
                building, availableSeats, totalEnrolled, waitlisted) {
        this.UUID = UUID.v4()
        this.CLASS_NAME = className
        this.CLASS_TITLE = classTitle
        this.SECTION = section
        this.INSTRUCTOR = instructor
        this.INSTRUCTION_MODE = instructionMode
        this.DAYS = days
        this.CLASS_TIME = classtime
        this.BUILDING = building
        this.AVAILABLE_SEATS = availableSeats
        this.TOTAL_ENROLLED = totalEnrolled
        this.WAITLIST = waitlisted
        this.AVG_DIFFICULTY = null
        this.AVG_RATING = null
        this.NUM_RATINGS = null

        // Set DAYS, CLASS_TIME and BUILDING to 'N/A' for the case of an online class
        if (this.DAYS === null) {
            this.DAYS = 'N/A'
        }
        if (this.CLASS_TIME === null) {
            this.CLASS_TIME = 'N/A'
        }
        if (this.BUILDING === null) {
            this.BUILDING = 'N/A'
        }
    }
}


/**
 * Simple function to prompt the user with a message and get a response
 * @param message
 * @returns user response
 */
async function prompt(message) {
    const answer = await inquirer.prompt([{
        name: 'userInput',
        type: 'input',
        message: message,
    }])
    return answer.userInput
}


/**
 * Logs in the user
 * @param none
 * @returns byuID user's BYU-ID
 */
async function login() {
    console.clear()
    printWelcome()

    let byuID = ''
    let token = ''

    // Get BYU ID and WSO2
    while(!byuID) {
        byuID = await prompt('Enter your BYU-ID (ex. 123456789):')
    }
    while (!token) {
        token = await prompt('Enter your WSO2 token:')
    }

    // Test if user is subscribed to the proper APIs and get user's name
    const userFirstName = await api_calls.testAPIs(byuID, token)
    console.clear()
    console.log(`Welcome ${userFirstName}`)

    return byuID
}

/**
 * Prints the welcome message for the start of the program
 * @param none
 * @returns none
 */
function printWelcome() {
    console.log('Welcome to the BYU course searcher with Rate-My-Professor data')
}


/**
 * Takes parameters from the user and searches for relevant courses
 * @param none
 * @returns classes A list of relevant classes
 */
async function searchCourses() {
    // Format needed for API call
    let yearTerm = ''

    // prompt the user to select a year
    let year = await selectYear()
    if (!year) {
        return null
    }

    // prompt the user to select a term
    let term = await selectTerm()
    if (term === restartText) {
        return searchCourses()
    }

    yearTerm = year.toString() + term.toString()

    // prompt the user to select a teaching area
    let teachingArea = await selectTeachingArea()
    if (teachingArea === restartText) {
        return searchCourses()
    }

    // Generate a list of relevant course numbers for the selected teaching area and yearTerm
    let courseNumbers = await api_calls.getCourseNumbers(yearTerm, teachingArea)
    if (courseNumbers.size === 0) {
        console.log('No courses found under that teaching area. Restarting search.')
        return searchCourses()
    }
    courseNumbers = Array.from(courseNumbers)
    // add a restart search option to the course numbers
    courseNumbers.unshift(restartText)
    let answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 20,
        message: 'Select a course number',
        choices: courseNumbers
    }])
    let courseNumber = answer.response
    if (courseNumber === restartText) {
        return searchCourses()
    }

    // Uses api_calls function to get the relevant classes
    let classes = await api_calls.getClasses(yearTerm, teachingArea, courseNumber)

    if (!classes.length) {
        // Starts function over again if no classes are found
        console.log('No classes found. Check to make sure you entered a valid teaching area and course number')
        return searchCourses()
    }

    // return all classes found from the search
    return classes
}


/**
 * Takes the previously searched class list, adds rate-my-professor data to each class and converts them to rmpCourse objects
 * @param classes
 * @returns rmpClasses A list of rmpCourse objects
 */
async function addRMPDataToClasses(classes) {
    const byuRMPID = 'U2Nob29sLTEzNQ=='// Rate My Professor  university ID for BYU (As of 5/11/2022)
    let rmpClasses = []

    // Converts the classes returned from the API call to rmpCourse objects and then searches for rate-my-professor data
    for (let i = 0; i < classes.length; i++) {
        try{
            let c = classes[i]
            // use regex to pull out the important part of className
            let className = c.className.match(/\D*\d\d\d\S*/gm)
            let rmpClass = new rmpCourse(className[0], c.classTitle, c.link_cls10, c.instructor, c.instruction_mode,
                c.days, c.classtime, c.building, c.availableSeats, c.totalEnrolled, c.waitlisted)

            // take the first two words (omitting the middle name if there is one). This format is better for the search
            let instructorSearchName = c.instructor.split(' ').slice(0,2).join(' ')
            let teachers = await ratings.searchTeacher(instructorSearchName, byuRMPID);
            if (teachers[0]) {
                const teacher = await ratings.getTeacher(teachers[0].id);
                if (teacher.numRatings > 0) {
                    rmpClass.AVG_DIFFICULTY = teacher.avgDifficulty
                    rmpClass.AVG_RATING = teacher.avgRating
                    rmpClass.NUM_RATINGS = teacher.numRatings
                }
            }

            else {
                // No teachers were returned searching with first name so try again with the middle name
                if (c.instructor.split(' ').length >= 3) {
                    instructorSearchName = c.instructor.split(' ')[0] + ' ' + c.instructor.split(' ')[2]
                    teachers = await ratings.searchTeacher(instructorSearchName, byuRMPID);
                }
                if (teachers[0]) {
                    // second try using middle name
                    const teacher = await ratings.getTeacher(teachers[0].id);
                    rmpClass.AVG_DIFFICULTY = teacher.avgDifficulty
                    rmpClass.AVG_RATING = teacher.avgRating
                    rmpClass.NUM_RATINGS = teacher.numRatings
                }
            }

            // Push the created rmpCourse object to the list
            rmpClasses.push(rmpClass)

        } catch (e) {
            if (e.message.includes('EADDRINUSE')) {
                console.log('EADDRINUSE error caught. Running command \'taskkill /im node.exe /F\' to attempt to work around.')

                // command to hopefully fix the EADDRINUSE error
                exec("taskkill /im node.exe /F")

                // attempt to restart the function
                return addRMPDataToClasses(classes)
            }
        }
    }

    return rmpClasses
}


/**
 * Prompts the user to enter the indexes of the classes they would like to save into the database and then saves them
 * @param rmpClasses
 * @param userBYUID
 * @returns none
 */
async function saveClasses(rmpClasses, userBYUID) {
    const promptMessage = 'Enter the index of a class you would like to save or leave blank to return to the menu'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)
        if (!(index >= 0 && index < rmpClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }
        await database_functions.addRmpClassToDatabase(rmpClasses[index], userBYUID)
        index = await prompt(promptMessage)
    }
}


/**
 * Provides the user a chance to remove saved courses from their list of saved courses
 * @param userBYUID
 * @param savedClasses List of previously saved classes
 * @returns none
 */
async function removeSavedCourses(userBYUID, savedClasses) {
    console.clear()
    printClassesFull(savedClasses)
    const promptMessage = 'Enter the index of a class you would like to remove or leave blank to return to the menu'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)

        // Prompts user for a new index if not valid
        if (!(index >= 0 && index < savedClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }

        // Calls database_functions function to remove the class
        const removed = await database_functions.removeRmpClassFromDatabase(savedClasses[index].SAVED_ID)

        if (removed) {
            console.clear()
            console.log(`Removed class '${savedClasses[index].CLASS_TITLE}' from the database`)

            // print the new table and start the function over again
            const newSavedClasses = await database_functions.getSavedRmpClasses(userBYUID)
            return removeSavedCourses(userBYUID, newSavedClasses)
        }
        else {
            console.log(`error removing class from database`)
        }
        index = await prompt(promptMessage)
    }
}


/**
 * Provides sorting options and sorts the list of rmpCourses it is passed
 * @param rmpCourses
 * @return none
 */
async function sortCourses(rmpCourses) {
    console.clear()
    let answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 5,
        message: 'How would you like to sort?',
        choices: [
            '1) Sort by section number',
            '2) Sort RMP ratings (highest to lowest)',
            '3) Sort by RMP difficulty (lowest to highest)',
            '4) Sort by time (earliest to latest)']
    }])

    switch (answer.response) {
        case '1) Sort by section number':
            rmpCourses.sort((a, b) => {
                if (a.SECTION <= b.SECTION) {
                    return -1 // sort a before b
                }
                return 1
            })
            break
        case '2) Sort RMP ratings (highest to lowest)':
            rmpCourses.sort((a, b) => {
                if (a.AVG_RATING >= b.AVG_RATING) {
                    return -1 // sort a before b
                }
                return 1
            })
            break
        case '3) Sort by RMP difficulty (lowest to highest)':
            rmpCourses.sort((a, b) => {
                if (a.AVG_DIFFICULTY <= b.AVG_DIFFICULTY) {
                    return -1 // sort a before b
                }
                return 1
            })
            break
        case '4) Sort by time (earliest to latest)':
            rmpCourses.sort((a, b) => {
                const breaks = 0
                if (b.CLASS_TIME === 'N/A') {
                    return -1
                }
                else if (a.CLASS_TIME === 'N/A') {
                    return 1
                }
                if (a.CLASS_TIME.includes('a') && b.CLASS_TIME.includes('p')) {
                    return -1
                }
                else if (a.CLASS_TIME.includes('p') && b.CLASS_TIME.includes('a')) {
                    return 1
                }
                else {
                    let aTime = a.CLASS_TIME.split(':')
                    let bTime = b.CLASS_TIME.split(':')
                    if (parseInt(aTime[0]) < parseInt(bTime[0])) {
                        return -1
                    }
                    else if (parseInt(aTime[0]) > parseInt(bTime[0])) {
                        return 1
                    }
                    else {
                        // hours are equal so check min
                        if (parseInt(aTime[1].charAt(0)) <= parseInt(bTime[1].charAt(0))) {
                            return -1
                        }
                        return 1
                    }
                }
            })
            break
    }
}


/**
 * Prints a list of rmpClasses to a table without CLASS_NAME or CLASS_TITLE
 * @param rmpClasses
 * @returns none
 */
function printClasses(rmpClasses) {
    console.table(rmpClasses, [
        'SECTION',
        'INSTRUCTOR',
        'AVG_RATING',
        'AVG_DIFFICULTY',
        'NUM_RATINGS',
        'INSTRUCTION_MODE',
        'DAYS',
        'CLASS_TIME',
        'BUILDING',
        'AVAILABLE_SEATS',
        'TOTAL_ENROLLED',
        'WAITLIST'])
}


/**
 * Prints a list of rmpClasses to a table
 * @param rmpClasses
 * @returns none
 */
function printClassesFull(rmpClasses) {
    console.table(rmpClasses, [
        'CLASS_NAME',
        'CLASS_TITLE',
        'SECTION',
        'INSTRUCTOR',
        'AVG_RATING',
        'AVG_DIFFICULTY',
        'NUM_RATINGS',
        'INSTRUCTION_MODE',
        'DAYS',
        'CLASS_TIME',
        'BUILDING',
        'AVAILABLE_SEATS',
        'TOTAL_ENROLLED',
        'WAITLIST'])
}


/**
 * Prompt the user to select a year
 * @param none
 * @returns year or restartText
 */
async function selectYear() {
    const currYear = new Date().getFullYear()
    let answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 5,
        message: 'Select a year',
        choices: [currYear-1, currYear, currYear+1, 'Enter another year', 'Return to Main Menu']
    }])
    if (answer.response === 'Enter another year') {
        // User chooses to enter a year manually
        let year = await prompt('Enter a year:')
        if (year === '') {
            console.log('current year used')
            // Default value. Blank will throw an error
            return currYear
        }
        return year
    }
    else if (answer.response === 'Return to Main Menu') {
        return null
    }
    else {
        return answer.response
    }
}


/**
 * Prompt the user to select a term
 * @param none
 * @returns term or restartText
 */
async function selectTerm() {
    let answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 5,
        message: 'Select a semester',
        choices: ['Winter', 'Spring', 'Summer', 'Fall', restartText]
    }])
    // Use responses to set the yearTerm variable needed for the api call
    switch (answer.response) {
        case 'Winter':
            return '1'
        case 'Spring':
            return '3'
        case 'Summer':
            return '4'
        case 'Fall':
            return '5'
        default:
            return restartText
    }
}


/**
 * Prompt the user to select a teaching area
 * @param none
 * @returns teaching area or restartText
 */
async function selectTeachingArea() {
    const teachingAreasArr = [
        'Enter manually',
        restartText,
        'A HTG',
        'ACC',
        'AEROS',
        'AFRIK',
        'AM ST',
        'ANES',
        'ANTHR',
        'ARAB',
        'ARMEN',
        'ART',
        'ARTHC',
        'ASIAN',
        'ASL',
        'BIO',
        'BULGN',
        'C S',
        'CANT',
        'CCE',
        'CE',
        'CEBU',
        'CELL',
        'CFM',
        'CH EN',
        'CHEM',
        'CHIN',
        'CL CV',
        'CLSCS',
        'CMLIT',
        'CMPST',
        'COMD',
        'COMMS',
        'CPSE',
        'CREOL',
        'CROAT',
        'CSANM',
        'DANCE',
        'DANSH',
        'DES',
        'DESAN',
        'DESGD',
        'DESIL',
        'DESPH',
        'DIGHT',
        'DUTCH',
        'EC EN',
        'ECE',
        'ECON',
        'EDLF',
        'EIME',
        'EL ED',
        'ELING',
        'EMBA',
        'ENGL',
        'ENT',
        'ESL',
        'EUROP',
        'EXDM',
        'EXSC',
        'FHSS',
        'FIJI',
        'FIN',
        'FINN',
        'FLANG',
        'FNART',
        'FREN',
        'GEOG',
        'GEOL',
        'GERM',
        'GREEK',
        'GSCM',
        'GWS',
        'HAWAI',
        'HCOLL',
        'HEB',
        'HILIG',
        'HINDI',
        'HIST',
        'HLTH',
        'HMONG',
        'HONRS',
        'HRM',
        'IAS',
        'ICLND',
        'ICS',
        'IHUM',
        'INDES',
        'INDON',
        'IP&T',
        'IS',
        'IT&C',
        'ITAL',
        'JAPAN',
        'KHMER',
        'KICHE',
        'KOREA',
        'LATIN',
        'LATVI',
        'LAW',
        'LFSCI',
        'LING',
        'LT AM',
        'M COM',
        'MALAG',
        'MARCH',
        'MATH',
        'MBA',
        'MDT',
        'ME EN',
        'MESA',
        'MFGEN',
        'MFHD',
        'MFT',
        'MIL S',
        'MKTH',
        'MMBIO',
        'MPA',
        'MSB',
        'MTHED',
        'MUSIC',
        'NAVAJ',
        'NDFS',
        'NE LG',
        'NES',
        'NEURO',
        'NORWE',
        'NURS',
        'PERSI',
        'PETE',
        'PHIL',
        'PHSCS',
        'PHY S',
        'PLANG',
        'POLI',
        'POLSH',
        'PORT',
        'PHYCH',
        'PWD',
        'QUECH',
        'REL A',
        'REL C',
        'REL E',
        'ROM',
        'RUSS',
        'SAMOA',
        'SC ED',
        'SCAND',
        'SFL',
        'SLAT',
        'SLN',
        'SOC',
        'SOC W',
        'SPAN',
        'SRBIA',
        'STAC',
        'STAT',
        'STDEV',
        'STRAT',
        'SWAHI',
        'SWED',
        'SWELL',
        'T ED',
        'TAGAL',
        'TECH',
        'TEE',
        'TELL',
        'TES',
        'TEST',
        'THAI',
        'TMA',
        'TONGA',
        'TURK',
        'UKRAI',
        'VIET',
        'WELSH',
        'WRTG'
    ]

    let answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 20,
        message: 'Select a Teaching Area',
        choices: teachingAreasArr
    }])
    if (answer.response === 'Enter manually') {
        // User chooses to enter a teaching area manually
        let teachingArea = await prompt('Enter a teaching area: ')
        if (teachingArea === '') {
            console.log('C S used')
            teachingArea = 'C S'
        }
        return teachingArea.toUpperCase()
    }
    return answer.response
}



module.exports = {login, searchCourses, addRMPDataToClasses,
    saveClasses, removeSavedCourses, sortCourses, printClasses, printClassesFull}