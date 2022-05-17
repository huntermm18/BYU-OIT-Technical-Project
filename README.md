# BYU COURSE SEARCHER WITH RATE-MY-PROFESSOR DATA

A program to use as a BYU class registration tool. It will allow you to search for classes just like in the 'Register
For Classes' tool on the mybyu website, except this will print out the results paired with data from
https://www.ratemyprofessors.com/

## Setup

### Subscribe to the Following APIs

1. Persons - v3
   [Link to Persons API page](https://api.byu.edu/store/apis/info?name=Persons&version=v3&provider=BYU%2Fjohnrb2)
2. AcademicClassScheduleClassSchedule - v1
   [Link to AcademicClassScheduleClassSchedule API page](https://api.byu.edu/store/apis/info?name=AcademicClassScheduleClassSchedule&version=v1&provider=BYU%2Fdkeele5)


### Connect to AWS

In order to use this program you must connect to BYU's AWS. To do so:

1. Go to this link and download the AWS CLI version that corresponds to your computer: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
2. Visit [BYU's AWS Login page](https://byulogin.awsapps.com/start#/)
3. After login, you should find the byu-org-trn app. Click on it and then click on command line or programmatic access
4. Navigate to the "Powershell" tab (or whichever tab corresponds to the environment you are using) and copy environmental variables
5. Paste the Environmental Variables into your terminal or commandline

### Connect to VPN (No longer needed)

1. Download the [GlobalProtect App](https://vpn.byu.edu/global-protect/getsoftwarepage.esp)
2. Open the GlobalProtect app
3. When prompted for VPN Portal Address, enter ``gp-dc.byu.edu``
4. Click "Connect" 

### Run
* If the above is all set up then download the files, install the npm modules and run the program with node

## Using the Program

### Login
1. Your AWS connection will be tested and used to set the Oracle credentials
2. Connection to the Oracle database will be tested
3. You will be prompted to enter your WSO2 token and BYU-ID

### Menu
1. Search Courses  -- Will allow you to search available BYU courses and pair the results with rate-my-professor data
2. View Saved Courses  -- Will allow you to view courses that you have previously saved
3. Exit Program

### Search Courses
1. Select from the list a year for which you would to search courses or select 'Enter another year'
2. Select a semester or term from the list
3. Select a teaching area from the list or choose 'Enter manually'
4. Select a course number from the list
5. A table with the available classes will be displayed and will include information from rate-my-professor
6. From here you can return to the main menu, sort the results, or select courses to save for viewing later


### View Saved Courses
1. This option will present a table with all the courses you have previously saved from the 'Search Courses' section
2. From here you can return to the main menu, see your saved courses in a sorted view, remove courses from your saved list, or clear all your saved courses
* Note: Sorting your saved courses only provides a temporary view, and the original order will be restored when you exit