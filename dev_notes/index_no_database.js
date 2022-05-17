/**
 * @file Controls the flow of the program
 * @author Hunter Madsen
 * last modified: 5/17/2022
 */

const inquirer = require("inquirer");
// const pf = require('./src/program_functions')
// const df = require('./src/database_functions')
const pf = require('../src/program_functions')
const df = require('../src/database_functions')


main().catch((e) => {
    console.log(e.stack)
})

/**
 *  Version of 'index.js' that does not connect to the database
 *  @param none
 *  @returns none
 */
async function main() {
    // Test AWS connection and use to set Oracle credentials
    //await df.getOracleCredentials(0)

    // Tests to make sure connected to database
    //await df.testOracleConnectivity()

    // Login and save user's BYU-ID
    const userBYUID = await pf.login()

    // Open menu and loop until user exits
    let choice = await promptMenu()
    let recentlySorted = false
    while (choice !== 3) {


        if (choice === 1) {
            // ------------ Search courses option -----------------------
            let classes = await pf.searchCourses()
            if (!classes) {
                // User opted to return to the main menu
                console.clear()
                choice = await promptMenu()
                continue
            }
            let rmpClasses = await pf.addRMPDataToClasses(classes)
            console.clear()
            if (rmpClasses.length > 0) {
                console.log(rmpClasses[0].CLASS_NAME + ' ' + rmpClasses[0].CLASS_TITLE)
            }
            pf.printClasses(rmpClasses)

            // Search Menu
            let response = await promptSearchMenu()
            while (response !== 1) {
                if (response === 2) {
                    // Sort Results
                    await pf.sortCourses(rmpClasses)
                    pf.printClasses(rmpClasses)
                }
                else if (response === 3) {
                    // Select Courses to Save
                    await pf.saveClasses(rmpClasses, userBYUID)
                }
                response = await promptSearchMenu()
            }



        }
        else if (choice === 2) {
            // ------------ View saved courses option -----------------------
            let savedRMPCourses = await df.getSavedRmpClasses(userBYUID)
            if (!recentlySorted) {
                // Print the courses unless just viewed as sorted
                pf.printClassesFull(savedRMPCourses)
            }
            recentlySorted = false

            // Saved Classes Menu
            const response = await promptSavedClassesMenu()
            if (response === 1) {
                // Return to Main Manu
                console.clear()
                choice = await promptMenu()
                continue
            }
            else if (response === 2) {
                // View Sorted
                console.clear()
                await pf.sortCourses(savedRMPCourses)
                pf.printClasses(savedRMPCourses)
                recentlySorted = true
                continue
            }
            else if (response === 3) {
                // Select Courses to Remove
                pf.printClassesFull(savedRMPCourses)
                await pf.removeSavedCourses(userBYUID, savedRMPCourses)
            }
            else if (response === 4) {
                // Remove All
                df.removeAllClassesForUser(userBYUID)
            }
        }



        console.clear()
        choice = await promptMenu()
    }
}


/**
 * Pulls up the main menu for the program
 * @param none
 * @returns An int corresponding to the user choice
 */
async function promptMenu() {
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 3,
        message: 'What would you like to do?',
        choices: ['1) Search Courses', '2) View Saved Courses', '3) Exit Program']
    }])

    switch (answer.response) {
        case '1) Search Courses':
            return 1
        case '2) View Saved Courses':
            //return 2
            console.log('Not available in this mode')
            return await promptMenu()
        case '3) Exit Program':
            console.clear()
            console.log('Thanks for using')
            process.exit()
    }
}


/**
 * Pulls up a Saved Classes Menu
 * @param none
 * @return number
 */
async function promptSavedClassesMenu() {
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 5,
        message: 'What would you like to do?',
        choices: ['1) Return to Main Menu', '2) View Sorted', '3) Select Courses to Remove', '4) Remove All']
    }])

    switch (answer.response) {
        case '1) Return to Main Menu':
            return 1
        case '2) View Sorted':
            return 2
        case '3) Select Courses to Remove':
            return 3
        case '4) Remove All':
            return 4
    }
}


/**
 * Pulls up a Save Classes Menu
 * @param none
 * @return number
 */
async function promptSearchMenu() {
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 3,
        message: 'What would you like to do?',
        choices: ['1) Return to Main Menu', '2) Sort Results', '3) Select Courses to Save']
    }])

    switch (answer.response) {
        case '1) Return to Main Menu':
            return 1
        case '2) Sort Results':
            return 2
        case '3) Select Courses to Save':
            //return 3
            console.log('Not available in this mode')
            return promptSearchMenu()
    }
}