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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)

    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        let inst = await prisma.institution.findFirst({
          where: {
            OR: [
              { code: cleanCode },
              { id: code },
            ],
          },
        })
        if (!inst && cleanCode === DEFAULT_INSTITUTION.code.toUpperCase()) {
          inst = await prisma.institution.create({
            data: {
              name: DEFAULT_INSTITUTION.name,
              code: DEFAULT_INSTITUTION.code,
            },
          })
        }
        return inst || null
      } catch (e) {
        console.error('[AUTH-STORE] Prisma findInstitutionByCode error:', e instanceof Error ? e.message : String(e))
        throw e
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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)

    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })
        return (user as any) || null
      } catch (e) {
        console.error('[AUTH-STORE] Prisma findUserByEmail error:', e instanceof Error ? e.message : String(e))
        throw e
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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)

    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }

      try {
        // Resolve real database institution record to guarantee foreign-key integrity
        let inst = await prisma.institution.findFirst({
          where: {
            OR: [
              { id: params.institutionId },
              { code: 'MKCE2026' },
            ],
          },
        })

        if (!inst) {
          inst = await prisma.institution.create({
            data: {
              name: DEFAULT_INSTITUTION.name,
              code: DEFAULT_INSTITUTION.code,
            },
          })
        }

        const validInstitutionId = inst.id

        const createdUser = await prisma.user.create({
          data: {
            name: params.name.trim(),
            email: cleanEmail,
            passwordHash: params.passwordHash,
            role: params.role as any,
            institutionId: validInstitutionId,
            ...(params.role === 'TEACHER'
              ? {
                  teacherProfile: {
                    create: {
                      institutionId: validInstitutionId,
                      subject: params.subject?.trim() || 'Database Management Systems',
                      className: params.className?.trim() || 'DBMS - III CSE A',
                    },
                  },
                }
              : {
                  studentProfile: {
                    create: {
                      institutionId: validInstitutionId,
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

        console.log(`[AUTH-STORE] Created ${createdUser.role} in PostgreSQL: ${createdUser.name} (${createdUser.email}) [ID: ${createdUser.id}]`)

        return {
          user: createdUser as any,
          teacher: createdUser.teacherProfile as any,
          student: createdUser.studentProfile as any,
        }
      } catch (e) {
        console.error('[AUTH-STORE] Prisma createUser failed in PostgreSQL:', e instanceof Error ? e.message : String(e))
        throw e
      }
    }

    // In-memory creation (only when no database configured)
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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        const teacher = await prisma.teacher.findUnique({
          where: { userId },
        })
        return (teacher as any) || null
      } catch (e) {
        console.error('[AUTH-STORE] Prisma findTeacherByUserId error:', e instanceof Error ? e.message : String(e))
        throw e
      }
    }
    for (const t of this.teachers.values()) {
      if (t.userId === userId) return t
    }
    return null
  }

  async findStudentByUserId(userId: string): Promise<StudentRecord | null> {
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        const student = await prisma.student.findUnique({
          where: { userId },
        })
        return (student as any) || null
      } catch (e) {
        console.error('[AUTH-STORE] Prisma findStudentByUserId error:', e instanceof Error ? e.message : String(e))
        throw e
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

    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
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
        console.error('[AUTH-STORE] Prisma createClass error:', e instanceof Error ? e.message : String(e))
        throw e
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

  async findClassByCode(classCode: string): Promise<(ClassRecord & { teacherName?: string }) | null> {
    const cleanCode = classCode.trim().toUpperCase()
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)

    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        const cls = await prisma.class.findUnique({
          where: { classCode: cleanCode },
          include: {
            teacher: {
              include: { user: true },
            },
          },
        })
        if (!cls) return null
        return {
          id: cls.id,
          name: cls.name,
          classCode: cls.classCode,
          teacherId: cls.teacherId,
          institutionId: cls.institutionId,
          subject: cls.subject || undefined,
          description: cls.description || undefined,
          createdAt: cls.createdAt,
          teacherName: cls.teacher?.user?.name || 'Teacher unavailable',
        }
      } catch (e) {
        console.error('[AUTH-STORE] Prisma findClassByCode error:', e instanceof Error ? e.message : String(e))
        throw e
      }
    }

    for (const c of this.classes.values()) {
      if (c.classCode.toUpperCase() === cleanCode) {
        const teacher = this.teachers.get(c.teacherId)
        const user = teacher ? Array.from(this.users.values()).find((u) => u.id === teacher.userId) : null
        return {
          ...c,
          teacherName: user?.name || 'Dr. Priya Menon',
        }
      }
    }
    return null
  }

  async listClassesByTeacherId(
    teacherId: string,
  ): Promise<Array<ClassRecord & { studentCount: number }>> {
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
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
        return classes.map((c: any) => ({
          ...c,
          studentCount: c._count?.enrollments ?? 0,
        }))
      } catch (e) {
        console.error('[AUTH-STORE] Prisma listClassesByTeacherId error:', e instanceof Error ? e.message : String(e))
        throw e
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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
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
          orderBy: { joinedAt: 'desc' },
        })
        return enrollments.map((enr: any) => ({
          id: enr.class.id,
          name: enr.class.name,
          classCode: enr.class.classCode,
          teacherId: enr.class.teacherId,
          institutionId: enr.class.institutionId,
          subject: enr.class.subject || undefined,
          description: enr.class.description || undefined,
          createdAt: enr.class.createdAt,
          joinedAt: enr.joinedAt,
          teacherName: enr.class.teacher?.user?.name || 'Teacher unavailable',
        }))
      } catch (e) {
        console.error('[AUTH-STORE] Prisma listEnrolledClassesByStudentId error:', e instanceof Error ? e.message : String(e))
        throw e
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
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
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
        console.error('[AUTH-STORE] Prisma isStudentEnrolled error:', e instanceof Error ? e.message : String(e))
        throw e
      }
    }
    return this.enrollments.has(`${studentId}_${classId}`)
  }

  async enrollStudent(
    studentId: string,
    classId: string,
  ): Promise<EnrollmentRecord> {
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.DIRECT_URL)
    if (isDbConfigured) {
      const prisma = getPrisma()
      if (!prisma) {
        throw new Error('Database is configured but Prisma client could not be initialized.')
      }
      try {
        const enr = await prisma.enrollment.create({
          data: {
            studentId,
            classId,
          },
        })
        return enr as any
      } catch (e) {
        console.error('[AUTH-STORE] Prisma enrollStudent error:', e instanceof Error ? e.message : String(e))
        throw e
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
