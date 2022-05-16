
// https://github.com/Michigan-Tech-Courses/rate-my-professors/blob/master/src
const ratings = require('@mtucourses/rate-my-professors').default;

(async () => {
    const schools = await ratings.searchSchool('BYU');
  
    console.log(schools);
    /*
      [
        {
          city: 'Houghton',
          id: 'U2Nob29sLTYwMg==',
          name: 'Michigan Technological University',
          state: 'MI'
        }
      ]
    */
  
    const teachers = await ratings.searchTeacher('keith wilson', schools[0].id);
  
    console.log(teachers);
    /*
      [
        {
          firstName: 'Ching-Kuang',
          id: 'VGVhY2hlci0yMjkxNjI=',
          lastName: 'Shene',
          school: {
            id: 'U2Nob29sLTYwMg==',
            name: 'Michigan Technological University'
          }
        }
      ] 
    */
  
    const teacher = await ratings.getTeacher(teachers[0].id);
  
    console.log(teacher);
    /*
      {
        avgDifficulty: 4.4,
        avgRating: 3.3,
        numRatings: 28,
        department: 'Computer Science',
        firstName: 'Ching-Kuang',
        id: 'VGVhY2hlci0yMjkxNjI=',
        lastName: 'Shene',
        school: {
          city: 'Houghton',
          id: 'U2Nob29sLTYwMg==',
          name: 'Michigan Technological University',
          state: 'MI'
        }
      }
    */
  })();