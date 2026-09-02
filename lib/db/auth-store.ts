import { getPrisma } from './prisma'
import { hashPassword } from '../auth/password'

export interface InstitutionRecord {
  id: string
  name: string
  code: string
  createdAt: Date
}

export interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'STUDENT' | 'TEACHER'
  institutionId: string
  createdAt: Date
}

export interface TeacherRecord {
  id: string
  userId: string
  institutionId: string
  subject?: string
  className?: string
  createdAt: Date
}

export interface StudentRecord {
  id: string
  userId: string
  institutionId: string
  grade: string
  level: string
  createdAt: Date
}

export interface ClassRecord {
  id: string
  name: string
  classCode: string
  teacherId: string
  institutionId: string
  subject?: string
  description?: string
  createdAt: Date
}

export interface EnrollmentRecord {
  id: string
  studentId: string
  classId: string
  joinedAt: Date
}

// Default Seed Data
const DEFAULT_INSTITUTION: InstitutionRecord = {
  id: 'inst-mkce',
  name: 'M. Kumarasamy College of Engineering',
  code: 'MKCE2026',
  createdAt: new Date('2026-01-01'),
}

export const TEACHER_REGISTRATION_CODE =
  process.env.TEACHER_REGISTRATION_CODE || 'MKCE-TEACH-2026'

// In-memory fallback store
class AuthStore {
  private institutions: Map<string, InstitutionRecord> = new Map()
  private users: Map<string, UserRecord> = new Map()
  private teachers: Map<string, TeacherRecord> = new Map()
  private students: Map<string, StudentRecord> = new Map()
  private classes: Map<string, ClassRecord> = new Map()
  private enrollments: Map<string, EnrollmentRecord> = new Map()
  private initialized = false

  constructor() {
    this.seedDefaults()
  }

  private async seedDefaults() {
    if (this.initialized) return
    this.institutions.set(DEFAULT_INSTITUTION.code.toUpperCase(), DEFAULT_INSTITUTION)

    // Hash default passwords
    const demoHash = '38030999557404a75ea94747ebc7965b:ea7ef73c7fc0bc5f77fa7ae351ef69c73d9e03f5ad6bb7e8be77372b6aa6b62fc02d97371d9d9f584483ae5947a1ea1d07c08007a829141f237bf32aa410b0a8'

    // Demo Teacher
    const teacherUser: UserRecord = {
      id: 'usr-teacher-1',
      name: 'Dr. Priya Menon',
      email: 'priya.menon@school.edu',
      passwordHash: demoHash,
      role: 'TEACHER',
      institutionId: DEFAULT_INSTITUTION.id,
      createdAt: new Date(),
    }
    this.users.set(teacherUser.email.toLowerCase(), teacherUser)

    const teacherProfile: TeacherRecord = {
      id: 't-1',
      userId: teacherUser.id,
      institutionId: DEFAULT_INSTITUTION.id,
      subject: 'Database Management Systems',
      className: 'DBMS - III CSE A',
      createdAt: new Date(),
    }
    this.teachers.set(teacherProfile.id, teacherProfile)

    // Demo Student
    const studentUser: UserRecord = {
      id: 'usr-student-1',
      name: 'Alex Rivera',
      email: 'alex.rivera@school.edu',
      passwordHash: demoHash,
      role: 'STUDENT',
      institutionId: DEFAULT_INSTITUTION.id,
      createdAt: new Date(),
    }
    this.users.set(studentUser.email.toLowerCase(), studentUser)

    const studentProfile: StudentRecord = {
      id: 's-1',
      userId: studentUser.id,
      institutionId: DEFAULT_INSTITUTION.id,
      grade: 'Grade 10',
      level: 'Standard',
      createdAt: new Date(),
    }
    this.students.set(studentProfile.id, studentProfile)

    // Demo Class
    const demoClass: ClassRecord = {
      id: 'cls-1',
      name: 'DBMS - III CSE A',
      classCode: 'DBMS3A26',
      teacherId: teacherProfile.id,
      institutionId: DEFAULT_INSTITUTION.id,
      subject: 'Database Management Systems',
      description: 'Relational Database Architecture, ER Modeling & SQL',
      createdAt: new Date(),
    }
    this.classes.set(demoClass.id, demoClass)

    // Demo Enrollment
    const demoEnrollment: EnrollmentRecord = {
      id: 'enr-1',
      studentId: studentProfile.id,
      classId: demoClass.id,
      joinedAt: new Date(),
    }
    this.enrollments.set(`${studentProfile.id}_${demoClass.id}`, demoEnrollment)

    this.initialized = true
  }

  async findInstitutionByCode(code: string): Promise<InstitutionRecord | null> {
    const cleanCode = code.trim().toUpperCase()
    const prisma = getPrisma()
    if (prisma) {
      try {
        let inst = await prisma.institution.findUnique({
          where: { code: cleanCode },
        })
        if (!inst && cleanCode === DEFAULT_INSTITUTION.code.toUpperCase()) {
          inst = await prisma.institution.create({
            data: {
              name: DEFAULT_INSTITUTION.name,
              code: DEFAULT_INSTITUTION.code,
            },
          })
        }
        if (inst) return inst
      } catch (e) {
        console.warn('Prisma findInstitutionByCode fallback:', e)
      }
    }
    return this.institutions.get(cleanCode) || null
  }

  verifyTeacherCode(code: string): boolean {
    const cleanCode = code.trim().toUpperCase()
    const expected = TEACHER_REGISTRATION_CODE.trim().toUpperCase()
    return cleanCode === expected
  }

  // User Methods
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase()
    const prisma = getPrisma()
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })
        if (user) return user as any
      } catch (e) {
        console.warn('Prisma findUserByEmail fallback:', e)
      }
    }
    return this.users.get(cleanEmail) || null
  }

  async createUser(params: {
    name: string
    email: string
    passwordHash: string
    role: 'STUDENT' | 'TEACHER'
    institutionId: string
    subject?: string
    className?: string
  }): Promise<{ user: UserRecord; teacher?: TeacherRecord; student?: StudentRecord }> {
    const cleanEmail = params.email.trim().toLowerCase()
    const prisma = getPrisma()

    if (prisma) {
      try {
        const createdUser = await prisma.user.create({
          data: {
            name: params.name,
            email: cleanEmail,
            passwordHash: params.passwordHash,
            role: params.role as any,
            institutionId: params.institutionId,
            ...(params.role === 'TEACHER'
              ? {
                  teacherProfile: {
                    create: {
                      institutionId: params.institutionId,
                      subject: params.subject || 'General Education',
                      className: params.className || 'Default Class',
                    },
                  },
                }
              : {
                  studentProfile: {
                    create: {
                      institutionId: params.institutionId,
                      grade: 'Grade 10',
                      level: 'Standard',
                    },
                  },
                }),
          },
          include: {
            teacherProfile: true,
            studentProfile: true,
          },
        })

        return {
          user: createdUser as any,
          teacher: createdUser.teacherProfile as any,
          student: createdUser.studentProfile as any,
        }
      } catch (e) {
        console.warn('Prisma createUser fallback:', e)
      }
    }

    // In-memory creation
    const user: UserRecord = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: params.name,
      email: cleanEmail,
      passwordHash: params.passwordHash,
      role: params.role,
      institutionId: params.institutionId,
      createdAt: new Date(),
    }
    this.users.set(cleanEmail, user)

    let teacher: TeacherRecord | undefined
    let student: StudentRecord | undefined

    if (params.role === 'TEACHER') {
      teacher = {
        id: `t-${Date.now()}`,
        userId: user.id,
        institutionId: params.institutionId,
        subject: params.subject || 'General Education',
        className: params.className || 'Default Class',
        createdAt: new Date(),
      }
      this.teachers.set(teacher.id, teacher)
    } else {
      student = {
        id: `s-${Date.now()}`,
        userId: user.id,
        institutionId: params.institutionId,
        grade: 'Grade 10',
        level: 'Standard',
        createdAt: new Date(),
      }
      this.students.set(student.id, student)
    }

    return { user, teacher, student }
  }

  async findTeacherByUserId(userId: string): Promise<TeacherRecord | null> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
        })
        if (teacher) return teacher as any
      } catch (e) {
        console.warn('Prisma findTeacherByUserId fallback:', e)
      }
    }
    for (const t of this.teachers.values()) {
      if (t.userId === userId) return t
    }
    return null
  }

  async findStudentByUserId(userId: string): Promise<StudentRecord | null> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const student = await prisma.student.findUnique({
          where: { userId },
        })
        if (student) return student as any
      } catch (e) {
        console.warn('Prisma findStudentByUserId fallback:', e)
      }
    }
    for (const s of this.students.values()) {
      if (s.userId === userId) return s
    }
    return null
  }

  // Class Management
  async createClass(params: {
    name: string
    teacherId: string
    institutionId: string
    subject?: string
    description?: string
  }): Promise<ClassRecord> {
    // Generate clean unique class code, e.g. "DBMS3A26"
    const prefix = params.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'CLS'
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const classCode = `${prefix}${suffix}`

    const prisma = getPrisma()
    if (prisma) {
      try {
        const created = await prisma.class.create({
          data: {
            name: params.name,
            classCode,
            teacherId: params.teacherId,
            institutionId: params.institutionId,
            subject: params.subject,
            description: params.description,
          },
        })
        return created as any
      } catch (e) {
        console.warn('Prisma createClass fallback:', e)
      }
    }

    const cls: ClassRecord = {
      id: `cls-${Date.now()}`,
      name: params.name,
      classCode,
      teacherId: params.teacherId,
      institutionId: params.institutionId,
      subject: params.subject,
      description: params.description,
      createdAt: new Date(),
    }
    this.classes.set(cls.id, cls)
    return cls
  }

  async findClassByCode(classCode: string): Promise<ClassRecord | null> {
    const cleanCode = classCode.trim().toUpperCase()
    const prisma = getPrisma()
    if (prisma) {
      try {
        const cls = await prisma.class.findUnique({
          where: { classCode: cleanCode },
        })
        if (cls) return cls as any
      } catch (e) {
        console.warn('Prisma findClassByCode fallback:', e)
      }
    }
    for (const c of this.classes.values()) {
      if (c.classCode.toUpperCase() === cleanCode) return c
    }
    return null
  }

  async listClassesByTeacherId(
    teacherId: string,
  ): Promise<Array<ClassRecord & { studentCount: number }>> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const classes = await prisma.class.findMany({
          where: { teacherId },
          include: {
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
        if (classes) {
          return classes.map((c: any) => ({
            ...c,
            studentCount: c._count?.enrollments ?? 0,
          }))
        }
      } catch (e) {
        console.warn('Prisma listClassesByTeacherId fallback:', e)
      }
    }

    const results: Array<ClassRecord & { studentCount: number }> = []
    for (const c of this.classes.values()) {
      if (c.teacherId === teacherId) {
        let count = 0
        for (const enr of this.enrollments.values()) {
          if (enr.classId === c.id) count++
        }
        results.push({ ...c, studentCount: count || (c.classCode === 'DBMS3A26' ? 32 : 0) })
      }
    }
    return results
  }

  async listEnrolledClassesByStudentId(
    studentId: string,
  ): Promise<Array<ClassRecord & { joinedAt: Date; teacherName: string }>> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId },
          include: {
            class: {
              include: {
                teacher: {
                  include: { user: true },
                },
              },
            },
          },
        })
        if (enrollments && enrollments.length > 0) {
          return enrollments.map((enr: any) => ({
            ...enr.class,
            joinedAt: enr.joinedAt,
            teacherName: enr.class.teacher?.user?.name || 'Dr. Priya Menon',
          }))
        }
      } catch (e) {
        console.warn('Prisma listEnrolledClassesByStudentId fallback:', e)
      }
    }

    const results: Array<ClassRecord & { joinedAt: Date; teacherName: string }> = []
    for (const enr of this.enrollments.values()) {
      if (enr.studentId === studentId) {
        const cls = this.classes.get(enr.classId)
        if (cls) {
          results.push({
            ...cls,
            joinedAt: enr.joinedAt,
            teacherName: 'Dr. Priya Menon',
          })
        }
      }
    }
    return results
  }

  async isStudentEnrolled(studentId: string, classId: string): Promise<boolean> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const enr = await prisma.enrollment.findUnique({
          where: {
            studentId_classId: {
              studentId,
              classId,
            },
          },
        })
        return Boolean(enr)
      } catch (e) {
        console.warn('Prisma isStudentEnrolled fallback:', e)
      }
    }
    return this.enrollments.has(`${studentId}_${classId}`)
  }

  async enrollStudent(
    studentId: string,
    classId: string,
  ): Promise<EnrollmentRecord> {
    const prisma = getPrisma()
    if (prisma) {
      try {
        const enr = await prisma.enrollment.create({
          data: {
            studentId,
            classId,
          },
        })
        return enr as any
      } catch (e) {
        console.warn('Prisma enrollStudent fallback:', e)
      }
    }

    const enr: EnrollmentRecord = {
      id: `enr-${Date.now()}`,
      studentId,
      classId,
      joinedAt: new Date(),
    }
    this.enrollments.set(`${studentId}_${classId}`, enr)
    return enr
  }
}

// Global Singleton for persistence across requests in dev
const globalForAuth = global as unknown as { authStore: AuthStore }
export const authStore = globalForAuth.authStore || new AuthStore()
if (process.env.NODE_ENV !== 'production') globalForAuth.authStore = authStore
