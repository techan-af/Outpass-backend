const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.post("/students/register", async (req, res) => {
    const { name, rollNumber, registrationNumber, year } = req.body;
  
    try {
      const student = await prisma.student.create({
        data: {
          name,
          rollNumber,
          registrationNumber,
          year,
        },
      });
      res.status(201).json({ message: "Student registered successfully", student });
    } catch (error) {
      res.status(500).json({ error: "Error registering student", details: error.message });
    }
  });
  app.get("/students/:rollNumber", async (req, res) => {
    const { rollNumber } = req.params;
  
    try {
      const student = await prisma.student.findUnique({
        where: { rollNumber },
        include: { counselor: true }, // Include counselor details
      });
  
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
  
      res.status(200).json(student);
    } catch (error) {
      res.status(500).json({ error: "Error fetching student", details: error.message });
    }
  });
  app.put("/students/:rollNumber/assign-counselor", async (req, res) => {
    const { rollNumber } = req.params;
    const { counselorId } = req.body;
  
    try {
      // Validate that the counselorId exists and has the role 'counselor'
      const counselor = await prisma.user.findUnique({
        where: { id: counselorId },
      });
  
      if (!counselor || counselor.role !== "counselor") {
        return res.status(400).json({
          error: "Invalid counselor ID",
          message: "Counselor does not exist or is not a valid counselor",
        });
      }
  
      // Update the student with the valid counselorId
      const student = await prisma.student.update({
        where: { rollNumber },
        data: { counselorId },
      });
  
      res.status(200).json({
        message: "Counselor assigned successfully",
        student,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error assigning counselor",
        details: error.message,
      });
    }
  });
  
  
  
  app.get("/students", async (req, res) => {
    const { year, counselorId } = req.query;
  
    try {
      const students = await prisma.student.findMany({
        where: {
          ...(year && { year: parseInt(year) }),
          ...(counselorId && { counselorId: parseInt(counselorId) }),
        },
        include: { counselor: true },
      });
  
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ error: "Error fetching students", details: error.message });
    }
  });
  app.post("/users", async (req, res) => {
    const { name, email, password, role } = req.body;
  
    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password, // For simplicity, store raw passwords. In production, hash the password!
          role,
        },
      });
  
      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      res.status(500).json({ error: "Error creating user", details: error.message });
    }
  });
  app.get("/users", async (req, res) => {
    const { role } = req.query;
  
    try {
      const users = await prisma.user.findMany({
        where: role ? { role } : undefined, // Filter by role if provided
      });
  
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Error fetching users", details: error.message });
    }
  });
  
  app.post("/students/:rollNumber/leave-requests", async (req, res) => {
    const { rollNumber } = req.params;
    const { reason, startDate, endDate } = req.body;
  
    try {
      // Find the student by rollNumber
      const student = await prisma.student.findUnique({
        where: { rollNumber },
      });
  
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
  
      // Create the leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          reason,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "pending", // Default status is 'pending'
          studentId: student.id,
        },
      });
  
      res.status(201).json({
        message: "Leave request created successfully",
        leaveRequest,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error creating leave request",
        details: error.message,
      });
    }
  });
  

  app.get("/students/:rollNumber/leave-requests", async (req, res) => {
    const { rollNumber } = req.params;
  
    try {
      // Find the student by rollNumber
      const student = await prisma.student.findUnique({
        where: { rollNumber },
      });
  
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
  
      // Fetch all leave requests for the student
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" }, // Order by most recent requests first
      });
  
      res.status(200).json(leaveRequests);
    } catch (error) {
      res.status(500).json({
        error: "Error fetching leave requests",
        details: error.message,
      });
    }
  });
  app.get("/leave-requests", async (req, res) => {
    const { counselorId } = req.query; // Counselor's ID will be passed as a query parameter
  
    try {
      // Validate that the counselor exists
      const counselor = await prisma.user.findUnique({
        where: { id: parseInt(counselorId) },
      });
  
      if (!counselor || counselor.role !== "counselor") {
        return res.status(404).json({
          error: "Counselor not found or not authorized",
        });
      }
  
      // Fetch leave requests for students assigned to this counselor
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          student: {
            counselorId: parseInt(counselorId), // Only students assigned to this counselor
          },
        },
        include: {
          student: true, // Include student details if needed
        },
        orderBy: { createdAt: "desc" }, // Order by most recent first
      });
  
      res.status(200).json(leaveRequests);
    } catch (error) {
      res.status(500).json({
        error: "Error fetching leave requests",
        details: error.message,
      });
    }
  });
  