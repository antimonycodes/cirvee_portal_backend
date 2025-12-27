import prisma from "@config/database";

export class IdGenerator {

  // i will comeback to this should e uto generated when course is selected then that means i must include something like slug during coure creation.
  // Generate Student ID: CIRV/WD/001
  // WD = Course code 

  static async generateStudentId(courseCode: string): Promise<string> {
    const prefix = `CIRV/${courseCode.toUpperCase()}`;

    const lastStudent = await prisma.student.findFirst({
      where: {
        studentId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const lastId = lastStudent.studentId;
      const lastNumber = parseInt(lastId.split("/").pop() || "0");
      nextNumber = lastNumber + 1;
    }

    return `${prefix}/${String(nextNumber).padStart(3, "0")}`;
  }

  // Generate Admin Staff ID: CIRV-ADM-001, CIRV-ADM-002
   
  static async generateAdminStaffId(): Promise<string> {
    const prefix = "CIRV-ADM";

    const lastAdmin = await prisma.admin.findFirst({
      where: {
        staffId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextNumber = 1;
    if (lastAdmin) {
      const lastId = lastAdmin.staffId;
      const lastNumber = parseInt(lastId.split("-").pop() || "0");
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  }

  //  Generate Tutor Staff ID: CIRV-TUT-WD-001
  // WD = Course code they specialize in
   
  static async generateTutorStaffId(courseCode: string): Promise<string> {
    const prefix = `CIRV-TUT-${courseCode.toUpperCase()}`;

    const lastTutor = await prisma.tutor.findFirst({
      where: {
        staffId: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextNumber = 1;
    if (lastTutor) {
      const lastId = lastTutor.staffId;
      const lastNumber = parseInt(lastId.split("-").pop() || "0");
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  }

  // Generate Certificate Number: CIRV-CERT-2025-001 -> I will ask for required format
   
  static async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CIRV-CERT-${year}`;

    const lastCertificate = await prisma.certificate.findFirst({
      where: {
        certificateNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    let nextNumber = 1;
    if (lastCertificate) {
      const lastNumber = parseInt(
        lastCertificate.certificateNumber.split("-").pop() || "0"
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
  }
}
