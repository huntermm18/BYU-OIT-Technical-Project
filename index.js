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
            let rmpClasses = await pf.addRMPDataToClasses(classes)
            console.clear()
            console.table(rmpClasses, ['CLASS_NAME', 'CLASS_TITLE', 'INSTRUCTOR', 'AVG_RATING', 'AVG_DIFFICULTY',
                'INSTRUCTION_MODE', 'DAYS', 'CLASS_TIME', 'BUILDING', 'AVAILABLE_SEATS',
                'TOTAL_ENROLLED', 'WAITLIST', 'NUM_RATINGS'])
            await pf.saveClasses(rmpClasses, userBYUID)
        }
        else if (choice === 2) {
            // View saved courses option
            const savedClasses = await pf.viewSavedCourses(userBYUID)
            await pf.removeSavedCourses(userBYUID, savedClasses)
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
