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
2. Install the BYU AWS login by running ``pip3 install byu-awslogin``
3. Visit [BYU's AWS Login page](https://byulogin.awsapps.com/start#/)
4. After login, you should find the byu-org-trn app. Click on it and then click on command line or programmtic access
5. Navigate to the "Powershell" tab and copy environmental variables
6. Paste Powershell Environmental Variables into Powershell terminal

### Connect to VPN

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
1. Enter the year of the semester for which you would to search courses (ex. 2022, 2020, etc.)
2. Select a semester or term from the list
3. Enter a teaching area such as 'C S' or 'MATH'
4. Enter a course number such as '101' or '142'
5. A table with the available classes will be displayed and will include information from rate-my-professor
6. From here you can enter the table indexes (one at a time) of any courses you would like to save, or just press enter to return to the menu


### View Saved Courses
1. This option will present a table with all the courses you have previously saved from the 'Search Courses' section
2. You can enter the table indexes (one at a time) of any course you would like to remove from the list, or just press enter to return to the menu


