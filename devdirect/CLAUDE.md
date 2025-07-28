# DevDirect - AI-Powered IT Talent Recruitment Platform

## Project Overview

DevDirect is a comprehensive AI-powered platform that bridges the gap between IT Talents seeking career growth and companies looking for qualified talent. The platform uses intelligent CV parsing, skill analysis, and personalized career recommendations to create optimal matches between applicants and recruiters.

### Target Users

- **Applicants**: IT Talents seeking career development and job opportunities
- **Recruiters**: HR professionals and companies looking to hire qualified IT Talents

### Core Value Proposition

- AI-driven skill analysis and career path recommendations
- Automated CV parsing and profile generation
- Personalized learning roadmaps and daily tasks
- Intelligent matching between applicants and job requirements

## Technical Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Frontend**: React 19.1.0 + TypeScript 5
- **Styling**: Tailwind CSS 4 + Lucide React icons
- **Authentication**: OAuth Google integration
- **UI Components**: class-variance-authority, clsx, tailwind-merge
- **Development**: ESLint, PostCSS

## User Flows

### Applicant Journey (10 Steps)

1. **OAuth Registration**

   - Google OAuth authentication
   - Account creation and basic profile setup

2. **CV Upload & Parsing**

   - Drag & drop CV upload interface
   - AI-powered document parsing and data extraction

3. **Academic Record Upload**

   - KHS (university transcript) upload
   - Read-only academic qualification verification

4. **CV Preview & Editing**

   - Interactive preview of parsed CV data
   - User-friendly editing interface for corrections
   - Real-time preview updates

5. **AI Processing**

   - Background AI analysis of skills and experience
   - Loading states and progress indicators

6. **Skill Analysis Results**

   - Visual display of skill strengths
   - Identification of skill gaps
   - Interactive skill visualization components

7. **Career Role Recommendations**

   - AI-generated top 3 career paths with match percentages
   - Detailed role descriptions and requirements
   - Example: Data Engineering 90%, Backend Dev 80%, Data Analyst 60%

8. **Career Path Selection**

   - Interactive selection interface
   - Commitment to chosen career path

9. **Personalized Dashboard**

   - Daily tasks and challenges
   - Learning roadmap visualization
   - Top companies recommendations
   - Progress tracking

10. **Profile Management**
    - Comprehensive profile editing
    - Skill updates and certifications
    - Contact information management

### Recruiter Journey (5 Steps)

1. **Company Registration**

   - Company email domain validation
   - Business profile creation
   - Company verification process

2. **Job Position Creation**

   - Multiple job posting interface
   - Detailed requirement specification
   - Skill requirement definition
   - Salary and location settings

3. **Recruiter Dashboard**

   - Top 5 applicant matches per role
   - Match percentage and reasoning
   - Quick applicant overview cards
   - Filtering and sorting options

4. **Company Profile Management**

   - Company information editing
   - Job requirement updates
   - Team and culture information
   - Benefits and perks management

5. **Applicant Contact System**
   - Email integration for direct contact
   - Message templates and customization
   - Contact history tracking
   - Interview scheduling tools

## Component Architecture

### Shared Components

```
/components
├── ui/                     # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── LoadingSpinner.tsx
├── auth/                   # Authentication components
│   ├── GoogleOAuth.tsx
│   ├── ProtectedRoute.tsx
│   └── RoleBasedRoute.tsx
├── layout/                 # Layout components
│   ├── Header.tsx
│   ├── Navigation.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
└── common/                 # Common utility components
    ├── FileUpload.tsx
    ├── ProgressBar.tsx
    └── ErrorBoundary.tsx
```

### Applicant-Specific Components

```
/components/applicant
├── onboarding/
│   ├── CVUpload.tsx
│   ├── CVPreview.tsx
│   ├── KHSUpload.tsx
│   └── AIProcessing.tsx
├── analysis/
│   ├── SkillChart.tsx
│   ├── SkillGap.tsx
│   ├── CareerMatch.tsx
│   └── RoleSelector.tsx
├── dashboard/
│   ├── DailyTasks.tsx
│   ├── Roadmap.tsx
│   ├── TopCompanies.tsx
│   └── ProgressTracker.tsx
└── profile/
    ├── ProfileEditor.tsx
    ├── SkillManager.tsx
    └── ContactInfo.tsx
```

### Recruiter-Specific Components

```
/components/recruiter
├── onboarding/
│   ├── CompanyRegistration.tsx
│   └── EmailVerification.tsx
├── jobs/
│   ├── JobCreator.tsx
│   ├── RequirementEditor.tsx
│   └── SkillSelector.tsx
├── dashboard/
│   ├── ApplicantCard.tsx
│   ├── MatchingResults.tsx
│   └── RoleFilter.tsx
├── profile/
│   ├── CompanyEditor.tsx
│   └── JobManager.tsx
└── contact/
    ├── EmailComposer.tsx
    ├── MessageTemplates.tsx
    └── ContactHistory.tsx
```

## Page Structure

### App Router Structure

```
/app
├── (auth)/
│   ├── login/
│   └── register/
├── (applicant)/
│   ├── onboarding/
│   │   ├── cv-upload/
│   │   ├── khs-upload/
│   │   ├── preview/
│   │   ├── analysis/
│   │   └── career-selection/
│   ├── dashboard/
│   └── profile/
├── (recruiter)/
│   ├── onboarding/
│   │   ├── company-setup/
│   │   └── job-creation/
│   ├── dashboard/
│   ├── company/
│   └── contact/
└── api/
    ├── auth/
    ├── upload/
    ├── ai/
    └── matching/
```

## State Management

### Global State

- User authentication status
- User role (applicant/recruiter)
- Theme preferences
- Loading states

### Applicant State

- Onboarding progress
- CV parsing results
- Skill analysis data
- Career selection
- Dashboard personalization

### Recruiter State

- Company information
- Job postings
- Applicant matches
- Contact history

## API Integration Patterns

### Authentication

```typescript
// OAuth Google integration
const signInWithGoogle = async () => {
  // Google OAuth implementation
};

// Role-based route protection
const useRoleAuth = (requiredRole: "applicant" | "recruiter") => {
  // Route protection logic
};
```

### File Upload

```typescript
// CV and KHS upload handling
const uploadDocument = async (file: File, type: "cv" | "khs") => {
  // File upload and processing
};
```

### AI Integration

```typescript
// AI processing endpoints
const analyzeCV = async (cvData: CVData) => {
  // AI analysis integration
};

const getCareerMatches = async (skills: Skill[]) => {
  // Career matching algorithm
};
```

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Type checking
npx tsc --noEmit     # TypeScript type checking
```

## Development Guidelines

### Code Organization

- Use feature-based folder structure
- Implement proper TypeScript interfaces
- Follow React best practices and hooks patterns
- Maintain consistent naming conventions

### Component Guidelines

- Create reusable UI components with proper props typing
- Implement proper error boundaries
- Use loading states for async operations
- Ensure responsive design with Tailwind CSS

### Performance Optimization

- Implement proper code splitting
- Use Next.js Image optimization
- Minimize bundle size with tree shaking
- Implement proper caching strategies

### Accessibility

- Follow WCAG 2.1 guidelines
- Implement proper ARIA labels
- Ensure keyboard navigation support
- Test with screen readers

### Testing Strategy

- Unit tests for utility functions
- Component testing with React Testing Library
- Integration tests for user flows
- E2E testing for critical paths

### Security Considerations

- Validate file uploads (type, size, content)
- Sanitize user inputs
- Implement proper CORS policies
- Secure API endpoints with authentication

## Environment Setup

### Required Environment Variables

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Development Tools

- VS Code with TypeScript and ESLint extensions
- Chrome DevTools for debugging
- Postman for API testing
- Git for version control

This documentation serves as a comprehensive guide for frontend development of the DevDirect platform, covering both applicant and recruiter user journeys with detailed technical implementation guidelines.
