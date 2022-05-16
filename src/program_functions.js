const inquirer = require('inquirer');
const ratings = require('@mtucourses/rate-my-professors').default;
const api_calls = require('./api_calls')
const database_functions = require('./database_functions')
const UUID = require("uuid");
const { exec } = require("child_process");


class rmpCourse {
    constructor(className, classTitle, instructor, instructionMode, days, classtime, building, availableSeats, totalEnrolled, waitlisted) {
        this.UUID = UUID.v4()
        this.CLASS_NAME = className
        this.CLASS_TITLE = classTitle
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


async function prompt(message) {
    // Prompts the user with 'message' and returns their response
    const answer = await inquirer.prompt([{
        name: 'userInput',
        type: 'input',
        message: message,
    }])
    return answer.userInput
}

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

    // Test if user is subscribed to the proper APIs
    await api_calls.testAPIs(byuID, token)

    return byuID
}

function printWelcome() {
    console.log('Welcome to the BYU course searcher with Rate-My-Professor data')
}


async function searchCourses() {
    let yearTerm = '' // Format needed for API call
    let year = await prompt('Enter a year:')
    if (year === '') {
        year = 2022 // todo for testing. Blank will throw an error
    }
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 4,
        message: 'Select a semester',
        choices: ['Winter', 'Spring', 'Summer', 'Fall']
    }])
    // Use responses to set the yearTerm variable needed for the api call
    switch (answer.response) {
        case 'Winter':
            yearTerm = year + '1'
            break
        case 'Spring':
            yearTerm = year + '3'
            break
        case 'Summer':
            yearTerm = year + '4'
            break
        case 'Fall':
            yearTerm = year + '5'
            break
    }

    let teachingArea = await prompt('Enter a teaching area (ex. C S, HIST, etc.) Don\'t forget a space if it is needed:')
    teachingArea = teachingArea.toUpperCase() // set the user input to upper case
    if (teachingArea === 'CS') {
        teachingArea = 'C S' // in case the space was forgotten in C S
    }
    else if (teachingArea === '') {
        teachingArea = 'C S' // todo for testing. Blank will throw an error
    }

    let courseNumber = await prompt('Enter a course number (ex. 252, 101, etc.):')
    if (courseNumber === '') {
        courseNumber = '235' // todo for testing. Blank will throw an error
    }

    let classes = await api_calls.getClasses(yearTerm, teachingArea, courseNumber)
    if (!classes.length) {
        console.log('No classes found. Check to make sure you entered a valid teaching area and course number')
        return searchCourses()
    }

    // return all classes found from the search
    return classes
}

async function addRMPDataToClasses(classes) {
    const byuRMPID = 'U2Nob29sLTEzNQ=='// Rate My Professor  university ID for BYU (As of 5/11/2022)
    let rmpClasses = []

    for (let i = 0; i < classes.length; i++) {
        try{
            let c = classes[i]
            let rmpClass = new rmpCourse(c.className, c.classTitle, c.instructor, c.instruction_mode,
                c.days, c.classtime, c.building, c.availableSeats, c.totalEnrolled, c.waitlisted)

            // take the first two words (omitting the middle name if there is one). This format is better for the search
            let instructorSearchName = c.instructor.split(' ').slice(0,2).join(' ')
            let teachers = await ratings.searchTeacher(instructorSearchName, byuRMPID);
            if (teachers[0]) {
                const teacher = await ratings.getTeacher(teachers[0].id);
                rmpClass.AVG_DIFFICULTY = teacher.avgDifficulty
                rmpClass.AVG_RATING = teacher.avgRating
                rmpClass.NUM_RATINGS = teacher.numRatings
            }

            else {
                // No teachers were returned searching that name so try again with the middle name
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
            rmpClasses.push(rmpClass)
        } catch (e) {
            if (e.message.includes('EADDRINUSE')) {
                console.log('EADDRINUSE error caught. Running command \'taskkill /im node.exe /F\' to attempt to work around.')
                exec("taskkill /im node.exe /F") // command to hopefully fix the EADDRINUSE error
                return addRMPDataToClasses(classes) // attempt to restart the function
            }
        }
    }
    return rmpClasses
}


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


async function viewSavedCourses(userBYUID) {
    const savedClasses = await database_functions.getSavedRmpClasses(userBYUID)
    console.table(savedClasses.rows, ['CLASS_NAME', 'CLASS_TITLE', 'INSTRUCTOR', 'AVG_RATING',
        'AVG_DIFFICULTY', 'INSTRUCTION_MODE', 'DAYS', 'CLASS_TIME', 'BUILDING', 'AVAILABLE_SEATS',
        'TOTAL_ENROLLED', 'WAITLIST', 'NUM_RATINGS'])
    return savedClasses.rows

}


async function removeSavedCourses(userBYUID, savedClasses) {
    const promptMessage = 'Enter the index of a class you would like to remove or leave blank to return to the menu'
    let index = await prompt(promptMessage)
    while (index === 0 || index) {
        index = parseInt(index)
        if (!(index >= 0 && index < savedClasses.length)) {
            console.log('Not a valid index')
            index = await prompt(promptMessage)
            continue
        }
        const removed = await database_functions.removeRmpClassFromDatabase(savedClasses[index].SAVED_ID)
        if (removed) {
            console.clear()
            console.log(`Removed class '${savedClasses[index].CLASS_TITLE}' from the database`)

            // print the new table and start the function over again
            const newSavedClasses = await viewSavedCourses(userBYUID)
            return removeSavedCourses(userBYUID, newSavedClasses)
        }
        else {
            console.log(`error removing class from database`)
        }
        index = await prompt(promptMessage)
    }
}


module.exports = {login, searchCourses, viewSavedCourses, addRMPDataToClasses, saveClasses, removeSavedCourses}