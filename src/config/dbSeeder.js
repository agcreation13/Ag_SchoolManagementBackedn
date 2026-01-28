const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
require('dotenv').config();

const connectDB = require('./database');

// Seed data
const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - be careful in production!)
    // await User.deleteMany({});
    // await Class.deleteMany({});
    // await Assignment.deleteMany({});
    // await Grade.deleteMany({});
    // await Attendance.deleteMany({});

    // Create Admin User
    let admin = await User.findOne({ email: 'admin@school.com' });
    if (!admin) {
      admin = await User.create({
        username: 'admin',
        email: 'admin@school.com',
        password: 'Admin1234',
        firstName: 'School',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      });
      console.log('✅ Admin user created:', admin.email);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create Teacher Users
    const teachersData = [
      {
        username: 'teacher1',
        email: 'teacher@school.com',
        password: 'Teacher1234',
        firstName: 'John',
        lastName: 'Teacher',
        role: 'teacher'
      },
      {
        username: 'teacher2',
        email: 'teacher2@school.com',
        password: 'Teacher1234',
        firstName: 'Sarah',
        lastName: 'Smith',
        role: 'teacher'
      }
    ];

    const teachers = [];
    for (const teacherData of teachersData) {
      let teacher = await User.findOne({ email: teacherData.email });
      if (!teacher) {
        teacher = await User.create({
          ...teacherData,
          isActive: true,
          isEmailVerified: true
        });
        console.log('✅ Teacher created:', teacher.email);
      } else {
        console.log('ℹ️  Teacher already exists:', teacher.email);
      }
      teachers.push(teacher);
    }

    // Create Student Users
    const studentsData = [
      {
        username: 'student1',
        email: 'student@school.com',
        password: 'Student1234',
        firstName: 'Jane',
        lastName: 'Student',
        role: 'student'
      },
      {
        username: 'student2',
        email: 'student2@school.com',
        password: 'Student1234',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'student'
      },
      {
        username: 'student3',
        email: 'student3@school.com',
        password: 'Student1234',
        firstName: 'Emily',
        lastName: 'Davis',
        role: 'student'
      },
      {
        username: 'student4',
        email: 'student4@school.com',
        password: 'Student1234',
        firstName: 'David',
        lastName: 'Wilson',
        role: 'student'
      }
    ];

    const students = [];
    for (const studentData of studentsData) {
      let student = await User.findOne({ email: studentData.email });
      if (!student) {
        student = await User.create({
          ...studentData,
          isActive: true,
          isEmailVerified: true
        });
        console.log('✅ Student created:', student.email);
      } else {
        console.log('ℹ️  Student already exists:', student.email);
      }
      students.push(student);
    }

    // Create Parent Users
    const parentsData = [
      {
        username: 'parent1',
        email: 'parent@school.com',
        password: 'Parent1234',
        firstName: 'Robert',
        lastName: 'Parent',
        role: 'parent'
      }
    ];

    for (const parentData of parentsData) {
      let parent = await User.findOne({ email: parentData.email });
      if (!parent) {
        parent = await User.create({
          ...parentData,
          isActive: true,
          isEmailVerified: true
        });
        console.log('✅ Parent created:', parent.email);
      } else {
        console.log('ℹ️  Parent already exists:', parent.email);
      }
    }

    // Create Classes
    const currentYear = new Date().getFullYear().toString();
    const classesData = [
      {
        name: 'Mathematics 101',
        code: 'MATH101',
        description: 'Introduction to Mathematics',
        teacher: teachers[0]._id,
        subject: 'Mathematics',
        gradeLevel: 'Grade 10',
        academicYear: currentYear,
        semester: 'Fall',
        maxStudents: 30,
        schedule: {
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:30',
          room: 'Room 101'
        }
      },
      {
        name: 'English Literature',
        code: 'ENG101',
        description: 'Introduction to English Literature',
        teacher: teachers[1]._id,
        subject: 'English',
        gradeLevel: 'Grade 10',
        academicYear: currentYear,
        semester: 'Fall',
        maxStudents: 25,
        schedule: {
          day: 'Tuesday',
          startTime: '10:00',
          endTime: '11:30',
          room: 'Room 102'
        }
      },
      {
        name: 'Science Lab',
        code: 'SCI101',
        description: 'General Science Laboratory',
        teacher: teachers[0]._id,
        subject: 'Science',
        gradeLevel: 'Grade 11',
        academicYear: currentYear,
        semester: 'Fall',
        maxStudents: 20,
        schedule: {
          day: 'Wednesday',
          startTime: '14:00',
          endTime: '15:30',
          room: 'Lab 201'
        }
      }
    ];

    const createdClasses = [];
    for (const classData of classesData) {
      let classItem = await Class.findOne({ code: classData.code });
      if (!classItem) {
        // Add students to class
        classData.students = students.map(s => s._id);
        classItem = await Class.create(classData);
        console.log('✅ Class created:', classItem.name);
      } else {
        // Update students if class exists
        if (classItem.students.length === 0) {
          classItem.students = students.map(s => s._id);
          await classItem.save();
        }
        console.log('ℹ️  Class already exists:', classItem.name);
      }
      createdClasses.push(classItem);
    }

    // Create Assignments
    const assignmentsData = [
      {
        title: 'Algebra Homework 1',
        description: 'Complete exercises 1-10 from chapter 3. Show all your work.',
        class: createdClasses[0]._id,
        teacher: teachers[0]._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxScore: 100,
        instructions: 'Submit your work in PDF format. Late submissions will be penalized.',
        status: 'published',
        allowLateSubmission: true,
        latePenalty: 10
      },
      {
        title: 'Essay: Modern Literature',
        description: 'Write a 1000-word essay on modern literature themes.',
        class: createdClasses[1]._id,
        teacher: teachers[1]._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxScore: 100,
        instructions: 'Use MLA format. Include citations.',
        status: 'published',
        allowLateSubmission: false
      },
      {
        title: 'Lab Report: Chemical Reactions',
        description: 'Complete lab report on chemical reactions experiment.',
        class: createdClasses[2]._id,
        teacher: teachers[0]._id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        maxScore: 50,
        instructions: 'Include hypothesis, procedure, results, and conclusion.',
        status: 'published',
        allowLateSubmission: true,
        latePenalty: 5
      }
    ];

    const createdAssignments = [];
    for (const assignmentData of assignmentsData) {
      let assignment = await Assignment.findOne({ 
        title: assignmentData.title,
        class: assignmentData.class 
      });
      if (!assignment) {
        assignment = await Assignment.create(assignmentData);
        console.log('✅ Assignment created:', assignment.title);
      } else {
        console.log('ℹ️  Assignment already exists:', assignment.title);
      }
      createdAssignments.push(assignment);
    }

    // Create Grades
    const gradesData = [];
    for (let i = 0; i < students.length; i++) {
      for (let j = 0; j < createdAssignments.length; j++) {
        // Create grades for some assignments
        if (j < 2) { // Only for first 2 assignments
          const score = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
          const maxScore = createdAssignments[j].maxScore;
          const percentage = (score / maxScore) * 100;
          
          // Calculate letter grade
          let letterGrade = 'F';
          if (percentage >= 97) letterGrade = 'A+';
          else if (percentage >= 93) letterGrade = 'A';
          else if (percentage >= 90) letterGrade = 'A-';
          else if (percentage >= 87) letterGrade = 'B+';
          else if (percentage >= 83) letterGrade = 'B';
          else if (percentage >= 80) letterGrade = 'B-';
          else if (percentage >= 77) letterGrade = 'C+';
          else if (percentage >= 73) letterGrade = 'C';
          else if (percentage >= 70) letterGrade = 'C-';
          else if (percentage >= 67) letterGrade = 'D+';
          else if (percentage >= 63) letterGrade = 'D';
          else if (percentage >= 60) letterGrade = 'D-';
          
          gradesData.push({
            student: students[i]._id,
            class: createdAssignments[j].class,
            assignment: createdAssignments[j]._id,
            gradeType: 'assignment',
            score: score,
            maxScore: maxScore,
            percentage: percentage,
            letterGrade: letterGrade,
            teacher: createdAssignments[j].teacher,
            academicYear: currentYear,
            semester: 'Fall',
            feedback: `Good work! Keep it up.`
          });
        }
      }
    }

    let gradeCount = 0;
    for (const gradeData of gradesData) {
      const existing = await Grade.findOne({
        student: gradeData.student,
        assignment: gradeData.assignment
      });
      if (!existing) {
        await Grade.create(gradeData);
        gradeCount++;
      }
    }
    console.log(`✅ Created ${gradeCount} grades`);

    // Create Attendance Records
    const attendanceData = [];
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Create attendance for last 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(lastWeek);
      date.setDate(date.getDate() + day);
      date.setHours(0, 0, 0, 0);

      for (let i = 0; i < students.length; i++) {
        for (let j = 0; j < createdClasses.length; j++) {
          const statuses = ['present', 'present', 'present', 'late', 'absent']; // Mostly present
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          attendanceData.push({
            student: students[i]._id,
            class: createdClasses[j]._id,
            date: date,
            status: status,
            markedBy: createdClasses[j].teacher,
            academicYear: currentYear,
            semester: 'Fall'
          });
        }
      }
    }

    let attendanceCount = 0;
    for (const attendanceRecord of attendanceData) {
      const existing = await Attendance.findOne({
        student: attendanceRecord.student,
        class: attendanceRecord.class,
        date: attendanceRecord.date
      });
      if (!existing) {
        await Attendance.create(attendanceRecord);
        attendanceCount++;
      }
    }
    console.log(`✅ Created ${attendanceCount} attendance records`);

    console.log('\n✅ Database seeding completed!');
    console.log('\n📝 Login Credentials:');
    console.log('Admin: admin@school.com / Admin1234');
    console.log('Teacher: teacher@school.com / Teacher1234');
    console.log('Student: student@school.com / Student1234');
    console.log('Parent: parent@school.com / Parent1234');
    console.log('\n📊 Seeded Data:');
    console.log(`   - ${teachers.length} Teachers`);
    console.log(`   - ${students.length} Students`);
    console.log(`   - ${createdClasses.length} Classes`);
    console.log(`   - ${createdAssignments.length} Assignments`);
    console.log(`   - ${gradesData.length} Grades`);
    console.log(`   - ${attendanceCount} Attendance Records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedData();
}

module.exports = seedData;
