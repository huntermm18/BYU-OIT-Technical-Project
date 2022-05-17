/**
 * @file Controls the flow of the program
 * @author Hunter Madsen
 * last modified: 5/16/2022
 */

const inquirer = require("inquirer");
const pf = require('./src/program_functions')
const df = require('./src/database_functions')


main().catch((e) => {
    console.log(e.stack)
})

/**
 *  Controls the start and flow of the program
 *  @param none
 *  @returns none
 */
async function main() {
    // Test AWS connection and use to set Oracle credentials
    await df.getOracleCredentials(0)

    // Tests to make sure connected to database
    await df.testOracleConnectivity()

    // Login and save user's BYU-ID
    const userBYUID = await pf.login()

    // Open menu and loop until user exits
    let choice = await promptMenu()
    while (choice !== 3) {
        if (choice === 1) {
            // Search courses option
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
            console.table(rmpClasses, [
                'SECTION',
                'INSTRUCTOR',
                'AVG_RATING',
                'AVG_DIFFICULTY',
                'NUM_RATINGS',
                'INSTRUCTION_MODE',
                'DAYS', 'CLASS_TIME',
                'BUILDING',
                'AVAILABLE_SEATS',
                'TOTAL_ENROLLED',
                'WAITLIST'])
            await pf.saveClasses(rmpClasses, userBYUID)
        }
        else if (choice === 2) {
            // View saved courses option
            const savedClasses = await pf.viewSavedCourses(userBYUID)
            const response = await promptSaveClassesMenu()
            if (response === 1) {
                // Return to Main Manu
                choice = await promptMenu()
                continue
            }
            else if (response === 2) {
                // Select Courses to Remove
                await pf.removeSavedCourses(userBYUID, savedClasses)
            }
            else if (response === 3) {
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
            return 2
        case '3) Exit Program':
            console.clear()
            console.log('Thanks for using')
            process.exit()
    }
}


async function promptSaveClassesMenu() {
    const answer = await inquirer.prompt([{
        name: 'response',
        type: 'list',
        pageSize: 3,
        message: 'What would you like to do?',
        choices: ['1) Return to Main Menu', '2) Select Courses to Remove', '3) Remove All']
    }])

    switch (answer.response) {
        case '1) Return to Main Menu':
            return 1
        case '2) Select Courses to Remove':
            return 2
        case '3) Remove All':
            return 3
    }
}
