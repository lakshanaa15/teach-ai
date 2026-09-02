import type {
  AdaptiveTrack,
  LearningLevel,
  LessonAnalysis,
  LessonPlanScore,
  MaterialAnalysis,
  QuizQuestion,
  QuizSubmission,
  Recommendation,
  SimulatedStudent,
} from './types'

/**
 * AI Service Layer for TeachAI.
 *
 * Provider-independent abstraction supporting Gemini, OpenAI, and high-fidelity
 * mock fallback execution.
 */

function delay<T>(value: T, ms = 800): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function getAIProviderConfig() {
  return {
    provider: process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'mock'),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  }
}

export async function extractConcepts(topic: string): Promise<string[]> {
  const analysis = await analyzeMaterial(topic, topic)
  return analysis.detectedConcepts
}

export async function classifyDifficulty(topic: string): Promise<LearningLevel> {
  const isAdv = topic.toLowerCase().includes('calculus') || topic.toLowerCase().includes('advanced')
  return isAdv ? 'Advanced' : 'Standard'
}

export async function analyzeMaterial(
  materialNameOrContent: string,
  topic: string,
): Promise<MaterialAnalysis> {
  const isDBMS =
    topic.toLowerCase().includes('dbms') ||
    topic.toLowerCase().includes('er model') ||
    topic.toLowerCase().includes('database') ||
    materialNameOrContent.toLowerCase().includes('entity')

  if (isDBMS) {
    return delay({
      materialId: 'm-dbms',
      topic: 'ER Model — Entity, Attribute, Relationship, Cardinality',
      subject: 'Database Management Systems',
      detectedConcepts: [
        'Entity & Entity Sets (Strong vs Weak)',
        'Attributes (Key, Composite, Multi-valued, Derived)',
        'Relationships & Degree (Unary, Binary, Ternary)',
        'Cardinality Ratios (1:1, 1:N, M:N) & Participation Constraints',
        'Primary, Candidate & Foreign Keys',
      ],
      difficulty: 'Standard',
      prerequisites: [
        'Relational Data Model Basics',
        'Set Theory & Basic Logic',
      ],
      commonMisconceptions: [
        'Confusing 1:N cardinality with table foreign key placement',
        'Treating multi-valued attributes as simple single columns',
        'Failing to identify that Weak Entities require a Partial Key (Discriminator) + Parent Primary Key',
        'Assuming a Relationship cannot hold attributes of its own in M:N mappings',
      ],
      learningOutcomes: [
        'Identify entity types, attributes, and key constraints in a business narrative',
        'Construct syntactically valid Crow’s Foot and Chen ER diagrams',
        'Accurately differentiate between 1:1, 1:N, and M:N cardinality constraints',
        'Convert an ER conceptual diagram into a normalized relational table schema',
      ],
      approvalStatus: 'Draft',
      analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
  }

  // Default Math / Trig topic analysis
  return delay({
    materialId: 'm1',
    topic: 'Trigonometric Identities',
    subject: 'Mathematics',
    detectedConcepts: [
      'Unit Circle Coordinate Mapping (cos θ, sin θ)',
      'Fundamental Pythagorean Identity (sin²θ + cos²θ = 1)',
      'Derived Identities (1 + tan²θ = sec²θ, 1 + cot²θ = csc²θ)',
      'Quotient & Reciprocal Identities',
      'Algebraic Manipulation & Proof Techniques',
    ],
    difficulty: 'Standard',
    prerequisites: ['Right-triangle trigonometry', 'Algebraic factoring and fractions'],
    commonMisconceptions: [
      'Reading sin²θ as sin(θ²)',
      'Confusing the trigonometric identity with the geometric equation of a circle',
      'Applying identities before simplifying fractions',
    ],
    learningOutcomes: [
      'Derive and state all three Pythagorean identities from first principles',
      'Simplify complex trigonometric fractions using quotient substitutions',
      'Construct formal 2-column algebraic proofs verifying identities',
    ],
    approvalStatus: 'Draft',
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  })
}

export function generateAdaptiveTracks(topic: string): Promise<AdaptiveTrack[]> {
  const isDBMS =
    topic.toLowerCase().includes('dbms') ||
    topic.toLowerCase().includes('er model') ||
    topic.toLowerCase().includes('database')

  if (isDBMS) {
    return delay([
      {
        level: 'Remedial',
        summary:
          'Concrete everyday analogies for ER modeling: comparing Entities to Nouns, Attributes to Adjectives, and Relationships to Verbs.',
        points: [
          'Entity = "A distinct object" (e.g. Student, Course, Instructor)',
          'Attribute = "Property of the object" (e.g. StudentName, RollNo, Email)',
          'Relationship = "How entities interact" (e.g. Student ENROLLS_IN Course)',
          'Step-by-step visual cardinality breakdown using simple 1-to-1, 1-to-Many school examples',
        ],
        example:
          'Modeling a University: Entity `Student` (ID, Name) relates to Entity `Department` (DeptID, DeptName). One student belongs to exactly ONE department (1:N from Department to Student).',
        practice:
          'Identify whether "Customer places Order" is 1:1, 1:N, or M:N, and list 3 attributes for each entity.',
      },
      {
        level: 'Standard',
        summary:
          'Curriculum-aligned formal ER modeling with Chen and Crow’s Foot notation, Cardinality (1:1, 1:N, M:N), and Key Constraints.',
        points: [
          'Formal definitions of Strong vs Weak Entities and Identifying Relationships',
          'Attribute classifications: Simple vs Composite, Single-valued vs Multi-valued, and Derived attributes',
          'Total vs Partial Participation constraints (Double line vs Single line notation)',
          'Converting ER diagrams to 3NF Relational Schemas',
        ],
        example:
          'Hospital Management: `Doctor` treats `Patient` (M:N with attribute `treatment_date`), and `Patient` has `EmergencyContact` as a Weak Entity identified by `PatientID` + `ContactName`.',
        practice:
          'Design an ER diagram for an E-commerce store supporting multi-item orders, customer reviews, and category hierarchies.',
      },
      {
        level: 'Advanced',
        summary:
          'Enterprise-grade conceptual database modeling: Enhanced ER (EER), Specialization/Generalization hierarchies, and High-throughput schema design.',
        points: [
          'Disjoint vs Overlapping Subclasses and Total vs Partial Specialization',
          'N-ary (Ternary) relationships vs Nested Binary relationships',
          'Denormalization trade-offs and indexing impacts of ER foreign key mappings',
          'Handling Temporal Data and Historical Auditing in ER Schemas',
        ],
        example:
          'Banking System: Generalization hierarchy where `Account` is superclass for `CheckingAccount` and `SavingsAccount` with ternary relationship `Customer-Branch-Loan`.',
        practice:
          'Formalize a ternary relationship schema and prove whether decomposing it into three binary relationships causes a lossless-join anomaly.',
      },
    ])
  }

  return delay([
    {
      level: 'Remedial',
      summary: `Plain-language visual walkthrough of ${topic} using the unit circle radius analogy.`,
      points: [
        'Connect right-triangle (Opposite/Hypotenuse) directly to (x, y) coordinates',
        'Derive sin²θ + cos²θ = 1 with a concrete 3-4-5 triangle visual',
        'Highlight common notation pitfalls: sin²θ = (sin θ)²',
        'Frequent low-stakes checks for understanding',
      ],
      example:
        'Worked example: If cos θ = 3/5, then sin²θ = 1 - (9/25) = 16/25, giving sin θ = 4/5.',
      practice: '4 scaffolded questions with step-by-step formula hints.',
    },
    {
      level: 'Standard',
      summary: `Curriculum-aligned treatment of ${topic} with algebraic proof techniques.`,
      points: [
        'Formal derivation of 1 + tan²θ = sec²θ and 1 + cot²θ = csc²θ',
        'Techniques for LHS = RHS identity verifications',
        'Mixed practice at grade-level examination difficulty',
      ],
      example: 'Prove (1 − cos²θ)/sin θ = sin θ by substituting 1 − cos²θ with sin²θ.',
      practice: '6 questions covering core quotient and reciprocal substitutions.',
    },
    {
      level: 'Advanced',
      summary: `Deeper analytical treatment of ${topic} with wave mechanics and calculus applications.`,
      points: [
        'Connections to Euler’s formula e^(iθ) = cos θ + i sin θ',
        'Fourier harmonic decomposition and AC power calculations',
        'Open-ended proof challenge problems',
      ],
      example: 'Harmonic wave interference: Expressing 3 sin θ + 4 cos θ in the form R sin(θ + α).',
      practice: '5 challenge problems including one multi-angle identity proof.',
    },
  ])
}

export function runStudentSimulation(topic = 'ER Model'): Promise<SimulatedStudent[]> {
  const isDBMS =
    topic.toLowerCase().includes('dbms') ||
    topic.toLowerCase().includes('er model') ||
    topic.toLowerCase().includes('database')

  if (isDBMS) {
    return delay(
      [
        {
          profile: 'Struggling Student',
          understanding: 42,
          response:
            '"I understand that an Entity is a table and Attributes are columns, but I get confused about where to put the foreign key when two entities have a Many-to-Many relationship."',
          confusionPoints: [
            'Foreign key placement in M:N relationships',
            'Difference between composite and multi-valued attributes',
          ],
          misconceptions: [
            'Thinks M:N relationship can be represented by placing a single foreign key in one table',
            'Confuses partial key of a weak entity with a surrogate primary key',
          ],
        },
        {
          profile: 'Average Student',
          understanding: 70,
          response:
            '"The 1:1 and 1:N cardinality rules make complete sense. I can draw the Crow’s foot diagram, but weak entity double-diamonds took extra time."',
          confusionPoints: [
            'Identifying relationships for weak entities',
            'Translating ternary relationships to tables',
          ],
          misconceptions: [
            'Attempts to normalize before finalizing the conceptual ER diagram',
          ],
        },
        {
          profile: 'Advanced Student',
          understanding: 94,
          response:
            '"The conceptual model is solid. I would like to explore Enhanced ER (EER) specialization hierarchies and recursive relationship constraints."',
          confusionPoints: ['Wants enterprise specialization hierarchy exercises'],
          misconceptions: [],
        },
      ],
      800,
    )
  }

  return delay(
    [
      {
        profile: 'Struggling Student',
        understanding: 38,
        response:
          '"I got that sin squared plus cos squared is 1, but I don\'t know when I\'m supposed to substitute it in a problem."',
        confusionPoints: ['When to apply the identity', 'Rearranging the equation'],
        misconceptions: ['Thinks sin^2 x means sin(x^2)', 'Confuses identity with circle equation'],
      },
      {
        profile: 'Average Student',
        understanding: 66,
        response:
          '"The derivation made sense. I can do the standard practice questions but the exit ticket proof was tricky."',
        confusionPoints: ['Multi-step proofs', 'Choosing which identity to substitute'],
        misconceptions: ['Applies the identity before simplifying'],
      },
      {
        profile: 'Advanced Student',
        understanding: 92,
        response:
          '"Clear. I\'d like to see how this connects to calculus derivatives and wave applications."',
        confusionPoints: ['Wants more challenge than provided'],
        misconceptions: [],
      },
    ],
    800,
  )
}

export function analyzeLesson(): Promise<LessonAnalysis> {
  return delay({
    effectiveness: 84,
    confusingSections: [
      'The jump from conceptual cardinality definitions to junction table schema mapping',
      'Weak entity partial key identification',
    ],
    misconceptions: [
      'Direct foreign key placement in Many-to-Many relationships',
      'Multi-valued attributes mapped to a single comma-separated column',
    ],
    engagement: 78,
    improvements: [
      'Add an interactive visual for M:N junction table decomposition',
      'Include a concrete school database example showing Student and Course enrollments',
      'Embed a formative 3-question check right after cardinality definitions',
    ],
  })
}

export function analyzeLessonPlan(): Promise<LessonPlanScore> {
  return delay({
    overall: 84,
    verdict: 'Good',
    breakdown: [
      { label: 'Learning Objectives', score: 92 },
      { label: 'Content Clarity', score: 88 },
      { label: 'Student Engagement', score: 78 },
      { label: 'Assessment Alignment', score: 90 },
      { label: 'Differentiation', score: 64 },
      { label: 'Time Management', score: 82 },
    ],
    strengths: [
      'Clear, measurable objective tied to ER cardinality and attribute classification',
      'Assessment aligns directly with relational schema conversion skills',
      'Sensible time allocation across lecture and guided modeling',
    ],
    issues: [
      'Differentiation is limited — only one track for both struggling and fast learners',
      'Needs explicit scaffolding for M:N junction table mapping',
      'Independent practice lacks immediate corrective feedback checks',
    ],
    improvements: [
      'Add a dedicated Remedial track with concrete physical analogies (Noun/Verb mapping).',
      'Include guided worked demonstrations before the independent diagramming task.',
      'Provide an Advanced EER extension for students who finish early.',
    ],
  })
}

export function generateQuiz(
  topic = 'ER Model',
  count = 4,
  type: QuizQuestion['type'] = 'MCQ',
): Promise<QuizQuestion[]> {
  const isDBMS =
    topic.toLowerCase().includes('dbms') ||
    topic.toLowerCase().includes('er model') ||
    topic.toLowerCase().includes('database')

  if (isDBMS) {
    const dbmsBank: QuizQuestion[] = [
      {
        id: 'dbms-q1',
        type: 'MCQ',
        question:
          'In an ER diagram, how is a Many-to-Many (M:N) relationship between Student and Course converted into relational tables?',
        options: [
          'By creating a separate Junction / Associative Table containing foreign keys from both tables',
          'By placing the CourseID directly inside the Student table as a foreign key',
          'By placing the StudentID directly inside the Course table as a foreign key',
          'By merging Student and Course into a single monolithic table',
        ],
        answer:
          'By creating a separate Junction / Associative Table containing foreign keys from both tables',
        explanation:
          'M:N relationships cannot be represented in 1NF without redundancy using a single table; an associative/junction table is required.',
        concept: 'Cardinality & Relational Mapping',
      },
      {
        id: 'dbms-q2',
        type: 'True/False',
        question:
          'A Weak Entity can be uniquely identified solely by its own partial key (discriminator) without referencing its owner entity.',
        options: ['True', 'False'],
        answer: 'False',
        explanation:
          'A Weak Entity does not have a primary key of its own; its identity is formed by combining the Primary Key of the identifying owner entity with its partial key.',
        concept: 'Weak Entities & Identifying Relationships',
      },
      {
        id: 'dbms-q3',
        type: 'MCQ',
        question:
          'Which type of attribute is `PhoneNumber` when a student can have multiple active contact numbers?',
        options: [
          'Multi-valued Attribute',
          'Composite Attribute',
          'Derived Attribute',
          'Key Attribute',
        ],
        answer: 'Multi-valued Attribute',
        explanation:
          'Multi-valued attributes hold multiple values for a single entity instance and are represented by double ovals in Chen notation.',
        concept: 'Attribute Classifications',
      },
      {
        id: 'dbms-q4',
        type: 'Short Answer',
        question:
          'What is the cardinality ratio of the relationship "A citizen HAS a Passport", assuming each citizen has at most one passport and each passport belongs to one citizen?',
        answer: '1:1',
        explanation:
          'Because each citizen maps to at most one passport and vice versa, the relationship cardinality is One-to-One (1:1).',
        concept: 'Cardinality Ratios',
      },
      {
        id: 'dbms-q5',
        type: 'MCQ',
        question:
          'In an ER diagram, what is represented by a double rectangle?',
        options: [
          'Weak Entity Set',
          'Derived Attribute',
          'Identifying Relationship',
          'Multi-valued Attribute',
        ],
        answer: 'Weak Entity Set',
        explanation:
          'In Chen notation, a double rectangle signifies a Weak Entity Set.',
        concept: 'ER Diagram Notation',
      },
    ]

    const filtered = dbmsBank.filter((q) => q.type === type)
    const pool = filtered.length > 0 ? filtered : dbmsBank
    const result: QuizQuestion[] = []
    for (let i = 0; i < count; i++) {
      const base = pool[i % pool.length]
      result.push({ ...base, id: `dbms-${i}-${base.id}` })
    }
    return delay(result, 800)
  }

  // Math quiz bank
  const mathBank: QuizQuestion[] = [
    {
      id: 'gq1',
      type: 'MCQ',
      question: 'Which expression equals 1 for all valid angles θ?',
      options: ['sin²θ − cos²θ', 'sin²θ + cos²θ', 'tan²θ + 1', '1 − cos²θ'],
      answer: 'sin²θ + cos²θ',
      explanation: 'The Pythagorean identity states sin²θ + cos²θ = 1.',
      concept: 'Pythagorean Identity',
    },
    {
      id: 'gq2',
      type: 'True/False',
      question: 'sin²θ means the same as sin(θ²).',
      options: ['True', 'False'],
      answer: 'False',
      explanation: 'sin²θ means (sin θ)², a common notation misconception.',
      concept: 'Squaring Notation',
    },
    {
      id: 'gq3',
      type: 'MCQ',
      question: '1 + tan²θ is algebraically equivalent to:',
      options: ['sec²θ', 'csc²θ', 'cot²θ', 'sin²θ'],
      answer: 'sec²θ',
      explanation: 'Dividing sin²θ + cos²θ = 1 by cos²θ gives 1 + tan²θ = sec²θ.',
      concept: 'Secondary Identities',
    },
    {
      id: 'gq4',
      type: 'MCQ',
      question: 'If sin θ = 3/5 and θ is acute, what is cos θ?',
      options: ['4/5', '5/4', '3/4', '5/3'],
      answer: '4/5',
      explanation: 'cos θ = √(1 − 9/25) = √(16/25) = 4/5.',
      concept: 'Unit Circle Calculation',
    },
  ]

  const filtered = mathBank.filter((q) => q.type === type)
  const pool = filtered.length > 0 ? filtered : mathBank
  const result: QuizQuestion[] = []
  for (let i = 0; i < count; i++) {
    const base = pool[i % pool.length]
    result.push({ ...base, id: `math-${i}-${base.id}` })
  }
  return delay(result, 800)
}

export async function evaluateQuizSubmission(
  topic: string,
  answers: Record<number, string>,
  questions: QuizQuestion[],
): Promise<QuizSubmission> {
  let correctCount = 0
  const conceptResults = questions.map((q, idx) => {
    const userAns = answers[idx]
    const isCorrect = userAns === q.answer || (userAns && userAns.trim().toLowerCase() === q.answer.trim().toLowerCase())
    if (isCorrect) correctCount++
    return {
      concept: q.concept || 'General Concept',
      correct: Boolean(isCorrect),
      feedback: isCorrect
        ? `Correct! Demonstrated mastery in ${q.concept || 'concept'}.`
        : `Needs review: ${q.explanation}`,
    }
  })

  const total = questions.length
  const percentage = Math.round((correctCount / total) * 100)

  // Extract weak concepts
  const identifiedGaps = conceptResults
    .filter((cr) => !cr.correct)
    .map((cr) => cr.concept)

  return delay({
    id: `sub-${Date.now()}`,
    quizTitle: `${topic} Check Assessment`,
    topic,
    score: correctCount,
    total,
    percentage,
    conceptResults,
    identifiedGaps: Array.from(new Set(identifiedGaps)),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  })
}

export async function detectLearningGaps(
  studentId: string,
  history: any[] = [],
): Promise<string[]> {
  return delay(['ER Model: Cardinality & Junction Tables', 'Trigonometric Identities'])
}

export function generateRecommendations(
  topic: string,
  weakConcepts: string[],
): Recommendation[] {
  const isDBMS =
    topic.toLowerCase().includes('dbms') ||
    topic.toLowerCase().includes('er model') ||
    topic.toLowerCase().includes('database')

  if (isDBMS) {
    return [
      {
        id: `rec-dbms-${Date.now()}-1`,
        title: 'Review Remedial Track: M:N Junction Tables & Foreign Keys',
        reason:
          weakConcepts.includes('Cardinality & Relational Mapping')
            ? 'Incorrect answer on Many-to-Many junction table creation'
            : 'Strengthen ER-to-Relational conversion fundamentals',
        difficulty: 'Remedial',
        estMinutes: 15,
        priority: 'High',
        actions: [
          'Review Remedial Track: Noun/Verb ER Analogy',
          'Watch 8-min Visual Junction Table Decomposition',
          'Complete 3-question Practice on M:N mappings',
        ],
        topic: 'ER Model',
        studentName: 'Alex Rivera',
      },
      {
        id: `rec-dbms-${Date.now()}-2`,
        title: 'Interactive Diagram Check: Weak Entities & Discriminators',
        reason: 'Targeted practice on identifying parent primary key propagation',
        difficulty: 'Standard',
        estMinutes: 10,
        priority: 'Medium',
        actions: [
          'Examine Hospital Patient-Dependent ER Schema',
          'Ask AI Tutor for 1-on-1 discriminator clarification',
        ],
        topic: 'ER Model',
        studentName: 'Alex Rivera',
      },
    ]
  }

  return [
    {
      id: `rec-math-${Date.now()}-1`,
      title: 'Review Remedial Track: Trigonometric Identities',
      reason: 'Low score on unit circle Pythagorean derivations',
      difficulty: 'Remedial',
      estMinutes: 15,
      priority: 'High',
      actions: [
        'Review Remedial Track: Unit Circle Visual',
        'Complete 5-question Practice Quiz',
      ],
      topic: 'Trigonometric Identities',
      studentName: 'Alex Rivera',
    },
  ]
}

export function askTutor(prompt: string, level: string): Promise<string> {
  const p = prompt.toLowerCase()

  if (p.includes('er model') || p.includes('entity') || p.includes('cardinality') || p.includes('junction') || p.includes('dbms')) {
    if (p.includes('example')) {
      return delay(
        `Here is a concrete DBMS ER Model example at your ${level} level:\n\n` +
        `**Scenario:** A Student can enroll in many Courses, and a Course has many Students.\n\n` +
        `1. **Entities:** \`Student\` (StudentID, Name) and \`Course\` (CourseID, Title)\n` +
        `2. **Relationship:** \`ENROLLS_IN\` (Cardinality: Many-to-Many / M:N)\n` +
        `3. **Relational Conversion:** Create 3 tables: \`Student\`, \`Course\`, and a junction table \`Enrollment\` (\`StudentID\` FK, \`CourseID\` FK, \`Grade\`).\n\n` +
        `Would you like to try converting a 1:N relationship next?`,
        600,
      )
    }
    if (p.includes('mistake') || p.includes('wrong') || p.includes('confused')) {
      return delay(
        `Let's diagnose the mistake! A very common misconception is putting a single foreign key into the Student or Course table for an M:N relationship.\n\n` +
        `Why that fails: A student takes 5 courses, so one column cannot hold 5 IDs without violating First Normal Form (1NF). That is why we create a separate **Junction Table** (Enrollment) where each row connects ONE student to ONE course!\n\n` +
        `Does this make the junction table concept clear?`,
        600,
      )
    }
    if (p.includes('practice') || p.includes('question')) {
      return delay(
        `Here is a quick practice question for you:\n\n` +
        `**Question:** In a Company database, each \`Employee\` works in exactly one \`Department\`, but a \`Department\` has many employees.\n` +
        `1. What is the cardinality ratio from Department to Employee?\n` +
        `2. In which table does the Foreign Key go?\n\n` +
        `Type your answer and I'll check it!`,
        600,
      )
    }
    if (p.includes('harder') || p.includes('advanced')) {
      return delay(
        `Stepping up to Advanced Database Modeling! 🚀\n\n` +
        `**Challenge:** Consider a Ternary Relationship between \`Supplier\`, \`Part\`, and \`Project\` with cardinality (M:N:P). Under what conditions can this relationship have attributes of its own (e.g. \`Quantity\`), and how is the primary key of the resulting table formed?\n\n` +
        `Take a shot at defining the schema!`,
        600,
      )
    }

    return delay(
      `Great question on **ER Modeling**! At a ${level} level, remember the core rule: **Entities** are the nouns (things you store data about), **Attributes** are their properties, and **Relationships** are the verbs connecting them. Cardinality defines whether the link is 1:1, 1:N, or M:N.\n\n` +
      `Would you like me to walk you through an example, test your understanding with a practice problem, or explain junction tables?`,
      600,
    )
  }

  // Math responses
  const responses: Record<string, string> = {
    default: `Great question. At a ${level} level, here's how I'd think about it: the Pythagorean identity sin²θ + cos²θ = 1 comes straight from the unit circle, where any point is (cos θ, sin θ) and the radius is 1. Want me to show a worked example or give you a practice question?`,
    example: `Here's an example at your ${level} level:\n\nSimplify (1 − cos²θ). Since sin²θ + cos²θ = 1, we know 1 − cos²θ = sin²θ. So the answer is sin²θ. Want to try one yourself?`,
    practice: `Try this practice question:\n\nIf cos θ = 12/13 and θ is acute, find sin θ.\n\nHint: use sin²θ + cos²θ = 1. Type your answer and I'll check it.`,
    mistake: `No problem — let's find the mistake. A very common one is reading sin²θ as sin(θ²). They are different! sin²θ means (sin θ)². Re-check your last step with that in mind.`,
    harder: `Stepping it up: prove that (1 + tan²θ)(1 − sin²θ) = 1. Hint: rewrite tan and use two identities. Give it a go and I'll guide you.`,
  }
  let key = 'default'
  if (p.includes('example')) key = 'example'
  else if (p.includes('practice') || p.includes('question')) key = 'practice'
  else if (p.includes('mistake') || p.includes('wrong')) key = 'mistake'
  else if (p.includes('harder') || p.includes('challenge')) key = 'harder'
  return delay(responses[key], 600)
}
