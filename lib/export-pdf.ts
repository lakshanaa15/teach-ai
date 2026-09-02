/**
 * PDF Export Utility for TeachAI
 * Generates beautifully formatted, printable/downloadable PDF documents for Lesson Plans and Quizzes.
 */

import type { GeneratedLessonPlanContent, GeneratedQuizQuestion } from './gemini'

export function exportLessonPlanPDF(plan: {
  title: string
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration: string
  curriculum: string
  source?: string | null
  status: string
  teacherName?: string
  content: GeneratedLessonPlanContent
}) {
  const c = plan.content
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${plan.title} - TeachAI Lesson Plan</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm; }
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 12px;
      font-weight: 700;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h1 {
      margin: 5px 0 10px 0;
      font-size: 24px;
      color: #0f172a;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .meta-item strong { color: #64748b; }
    .section {
      margin-bottom: 20px;
    }
    h2 {
      font-size: 15px;
      border-left: 4px solid #3b82f6;
      padding-left: 8px;
      margin: 15px 0 8px 0;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    ul, ol {
      margin: 5px 0 10px 20px;
      padding: 0;
      font-size: 13px;
    }
    li { margin-bottom: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      background: #dbeafe;
      color: #1e40af;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TeachAI · Pedagogical Lesson Plan</div>
    <h1>${plan.title}</h1>
    <span class="badge">${plan.status.toUpperCase()}</span>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Subject:</strong> ${plan.subject}</div>
    <div class="meta-item"><strong>Grade:</strong> ${plan.grade}</div>
    <div class="meta-item"><strong>Duration:</strong> ${plan.duration}</div>
    <div class="meta-item"><strong>Topic:</strong> ${plan.topic}</div>
    <div class="meta-item"><strong>Curriculum:</strong> ${plan.curriculum}</div>
    <div class="meta-item"><strong>Teacher:</strong> ${plan.teacherName || 'Authorized Teacher'}</div>
  </div>

  <div class="section">
    <h2>Learning Objectives</h2>
    <ul>
      ${(c.learningObjectives || [plan.learningObjective]).map((o) => `<li>${o}</li>`).join('')}
    </ul>
  </div>

  ${c.prerequisites && c.prerequisites.length > 0 ? `
  <div class="section">
    <h2>Prerequisites & Prior Knowledge</h2>
    <ul>
      ${c.prerequisites.map((p) => `<li>${p}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${c.introduction ? `
  <div class="section">
    <h2>Introduction / Warm-up (${c.introduction.durationMinutes || 5} mins)</h2>
    <div class="card">
      <p><strong>Hook:</strong> ${c.introduction.hook}</p>
      <p><strong>Prior Knowledge Check:</strong> ${c.introduction.priorKnowledgeCheck}</p>
    </div>
  </div>
  ` : ''}

  ${c.mainConcepts && c.mainConcepts.length > 0 ? `
  <div class="section">
    <h2>Main Concepts & Core Instruction</h2>
    ${c.mainConcepts.map((m) => `
      <div class="card">
        <strong>${m.name}:</strong> ${m.explanation}
        ${m.keyVocabulary ? `<br><small style="color:#64748b;">Key Vocabulary: ${m.keyVocabulary.join(', ')}</small>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${c.teachingActivities && c.teachingActivities.length > 0 ? `
  <div class="section">
    <h2>Step-by-Step Teaching Activities & Pacing</h2>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Time</th>
          <th>Teacher Action</th>
          <th>Student Action</th>
        </tr>
      </thead>
      <tbody>
        ${c.teachingActivities.map((a) => `
          <tr>
            <td><strong>${a.phase}</strong></td>
            <td>${a.timeMinutes}m</td>
            <td>${a.teacherActivity}</td>
            <td>${a.studentActivity}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${c.studentActivities && c.studentActivities.length > 0 ? `
  <div class="section">
    <h2>Differentiated Student Activities</h2>
    ${c.studentActivities.map((sa) => `
      <div class="card">
        <strong>${sa.title} (${sa.type || 'Individual'}):</strong> ${sa.instructions}
        ${sa.differentiation ? `
          <ul style="margin-top:6px; font-size:12px;">
            <li><strong>Remedial:</strong> ${sa.differentiation.remedial}</li>
            <li><strong>Standard:</strong> ${sa.differentiation.standard}</li>
            <li><strong>Advanced:</strong> ${sa.differentiation.advanced}</li>
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${c.assessment ? `
  <div class="section">
    <h2>Assessment & Evaluation</h2>
    ${c.assessment.exitTicketQuestions ? `
      <ul>
        ${c.assessment.exitTicketQuestions.map((et) => `
          <li><strong>Exit Ticket:</strong> ${et.question} <br><small style="color:#16a34a;">Expected Answer: ${et.expectedAnswer}</small></li>
        `).join('')}
      </ul>
    ` : ''}
  </div>
  ` : ''}

  ${c.homework ? `
  <div class="section">
    <h2>Homework & Extension Activities</h2>
    <div class="card">
      <p><strong>Assignment:</strong> ${c.homework.task}</p>
      ${c.homework.extensionChallenge ? `<p><strong>Advanced Challenge:</strong> ${c.homework.extensionChallenge}</p>` : ''}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <span>Generated by TeachAI · AI Pedagogical Suite</span>
    <span>Date: ${new Date().toLocaleDateString()}</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
`

  win.document.write(html)
  win.document.close()
}

export function exportQuizPDF(quiz: {
  title: string
  subject?: string | null
  grade?: string | null
  topic: string
  duration?: string | null
  curriculum?: string | null
  questions: Array<{
    id: string
    question: string
    type: string
    options?: string[]
    answer?: string
    explanation?: string
    difficulty?: string | null
    marks?: number | null
  }>
}, mode: 'student' | 'answer_key' = 'student') {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return

  const isAnswerKey = mode === 'answer_key'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${quiz.title} - ${isAnswerKey ? 'Teacher Answer Key' : 'Student Assessment'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm; }
    }
    .header {
      border-bottom: 2px solid ${isAnswerKey ? '#e11d48' : '#3b82f6'};
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      background: ${isAnswerKey ? '#ffe4e6' : '#dbeafe'};
      color: ${isAnswerKey ? '#be123c' : '#1e40af'};
      text-transform: uppercase;
    }
    h1 {
      margin: 8px 0 4px 0;
      font-size: 22px;
      color: #0f172a;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 20px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .student-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 15px;
      border: 1px dashed #cbd5e1;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .q-box {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .q-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
    }
    .options {
      margin: 8px 0 8px 20px;
      font-size: 13px;
    }
    .opt-item {
      margin-bottom: 6px;
    }
    .answer-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 8px;
      font-size: 12px;
      color: #166534;
    }
    .explanation {
      margin-top: 4px;
      color: #15803d;
      font-style: italic;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">${isAnswerKey ? 'Teacher Master Key · Confidential' : 'Student Examination Paper'}</span>
    <h1>${quiz.title}</h1>
  </div>

  <div class="meta">
    <span><strong>Subject:</strong> ${quiz.subject || 'General'}</span>
    <span><strong>Topic:</strong> ${quiz.topic}</span>
    <span><strong>Grade:</strong> ${quiz.grade || 'Grade 10'}</span>
    <span><strong>Duration:</strong> ${quiz.duration || '15 mins'}</span>
    <span><strong>Total Questions:</strong> ${quiz.questions.length}</span>
  </div>

  ${!isAnswerKey ? `
  <div class="student-header">
    <div>Student Name: __________________________</div>
    <div>Roll No: ____________</div>
    <div>Date: ____________</div>
  </div>
  ` : ''}

  <div class="questions-list">
    ${quiz.questions.map((q, idx) => `
      <div class="q-box">
        <div class="q-title">
          <span>${idx + 1}. ${q.question}</span>
          <span style="font-size:12px; color:#64748b; font-weight:normal;">[${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
        </div>

        ${q.options && q.options.length > 0 ? `
          <div class="options">
            ${q.options.map((opt, oIdx) => `
              <div class="opt-item">(${String.fromCharCode(65 + oIdx)}) ${opt}</div>
            `).join('')}
          </div>
        ` : `
          <div style="height: 45px; border-bottom: 1px dotted #cbd5e1; margin-top: 15px;"></div>
        `}

        ${isAnswerKey ? `
          <div class="answer-box">
            <div><strong>Correct Answer:</strong> ${q.answer}</div>
            <div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <span>TeachAI Assessment System</span>
    <span>${isAnswerKey ? 'CONFIDENTIAL TEACHER COPY' : 'STUDENT COPY'}</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
`

  win.document.write(html)
  win.document.close()
}
