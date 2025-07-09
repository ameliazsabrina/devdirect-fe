# Detailed API Examples - Peer Review Workflow & NFT Integration

## Base URL: `http://localhost:5001`

This document provides detailed request/response examples for the **peer review workflow** and **NFT integration** API endpoints.

## 🎯 Complete Workflow Overview

**FULL FLOW:** CV Registration → Submit → Review Queue → 3+ Reviewers → Publication Decision → Published → NFT Creation → Blockchain Verification

**NFT INTEGRATION:** Published manuscripts are automatically converted to academic NFTs on Solana blockchain, providing:

- Immutable proof of publication
- Royalty distribution to authors, reviewers, and platform
- Academic credential verification
- Decentralized storage on IPFS

## ⚠️ Important: Workflow Changes

**NEW FLOW:** CV Registration → Submit → Review Queue → 3+ Reviewers → Publication Decision → Published → NFT Creation

**OLD FLOW:** ~~Submit → Immediately Published~~ (No longer supported)

## 🆕 New Requirement: CV Registration

**MANDATORY:** All authors must upload and register their CV before submitting manuscripts. This ensures:

- Academic qualification verification
- Peer reviewer pool expansion
- Author credibility and institutional affiliation
- Better manuscript-reviewer matching

**Prerequisites for manuscript submission:**

1. ✅ Upload CV (PDF/Image)
2. ✅ Complete CV parsing and verification
3. ✅ CV saved to your wallet address
4. ✅ Then submit manuscripts

## 0. CV Registration Check (Required Before Submission)

### Check CV Registration Status

**GET** `/api/manuscripts/check-cv-status/:walletAddress`

Check if a user has registered their CV and can submit manuscripts.

**Request:**

```bash
curl "http://localhost:5001/api/manuscripts/check-cv-status/0x1234567890abcdef1234567890abcdef12345678"
```

**Response (CV Registered):**

```json
{
  "success": true,
  "hasCV": true,
  "canSubmitManuscripts": true,
  "hasCompleteProfile": true,
  "userInfo": {
    "fullName": "Dr. John Doe",
    "institution": "MIT",
    "profession": "Computer Scientist",
    "registeredAt": "2024-01-01T10:00:00.000Z"
  },
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "message": "CV verified. You can submit manuscripts."
}
```

**Response (No CV Found):**

```json
{
  "success": false,
  "hasCV": false,
  "canSubmitManuscripts": false,
  "message": "No CV found for this wallet address. Please upload your CV first.",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "requiresAction": "cv_upload"
}
```

### Error Response When Attempting Manuscript Submission Without CV

If you try to submit a manuscript without registering your CV first:

```json
{
  "error": "CV registration required",
  "code": "CV_REQUIRED",
  "message": "You must upload and register your CV before submitting manuscripts. Please visit the CV upload page first.",
  "requiresCV": true,
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

## 1. Manuscript Submission for Review

### Submit Manuscript for Peer Review (Recommended)

**POST** `/api/manuscripts/submit`

Manuscripts are now submitted to the review queue, **not immediately published**.

⚠️ **REQUIREMENT:** `authorWallet` is now **mandatory** and must have a registered CV.

**Request Example:**

```bash
curl -X POST http://localhost:5001/api/manuscripts/submit \
  -F "manuscript=@research_paper.pdf" \
  -F "title=AI Applications in Healthcare" \
  -F "author=Dr. John Doe" \
  -F "category=Artificial Intelligence,Healthcare" \
  -F "abstract=This paper explores the applications of artificial intelligence in modern healthcare systems..." \
  -F "keywords=AI,Healthcare,Machine Learning,Medical Diagnosis" \
  -F "authorWallet=0x1234567890abcdef1234567890abcdef12345678"
```

**⚠️ Required Fields:**

- `manuscript` - PDF file
- `title` - Manuscript title
- `author` - Author name
- `category` - Research category
- **`authorWallet`** - ✅ **MANDATORY** - Wallet address with registered CV

**Response Example (NEW STATUS):**

```json
{
  "success": true,
  "manuscript": {
    "id": 123,
    "cid": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "title": "AI Applications in Healthcare",
    "author": "Dr. John Doe",
    "category": "Artificial Intelligence,Healthcare",
    "filename": "research_paper.pdf",
    "size": 1048576,
    "type": "application/pdf",
    "submittedAt": "2024-01-01T12:00:00.000Z",
    "status": "under_review" // ← NEW: Starts in review, not published
  },
  "metadata": {
    "cid": "QmMetadataHashExample123456789"
  },
  "ipfsUrls": {
    "manuscript": "https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "metadata": "https://ipfs.io/ipfs/QmMetadataHashExample123456789"
  },
  "review": {
    "id": 456,
    "status": "submitted" // ← NEW: Review record created automatically
  }
}
```

### Alternative: Save Manuscript Metadata Only

**POST** `/api/manuscripts/all`

If you already have an IPFS hash, you can save manuscript metadata directly.

⚠️ **REQUIREMENT:** `author_wallet` is now **mandatory** and must have a registered CV.

**Request:**

```bash
curl -X POST http://localhost:5001/api/manuscripts/all \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Applications in Healthcare",
    "author": "Dr. John Doe",
    "category": "Artificial Intelligence,Healthcare",
    "ipfs_hash": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "abstract": "This paper explores the applications of AI in healthcare...",
    "keywords": ["AI", "Healthcare", "Machine Learning"],
    "author_wallet": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

**⚠️ Required Fields:**

- `title` - Manuscript title
- `author` - Author name
- `category` - Research category or array
- `ipfs_hash` - IPFS hash of the manuscript file
- **`author_wallet`** - ✅ **MANDATORY** - Wallet address with registered CV

**Response:**

```json
{
  "success": true,
  "manuscript": {
    "id": 123,
    "title": "AI Applications in Healthcare",
    "author": "Dr. John Doe",
    "status": "under_review", // ← Starts in review queue
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "review": {
    "id": 456,
    "status": "submitted"
  }
}
```

## 2. Review Dashboard Endpoints

### Get Manuscripts Pending Review

**GET** `/api/manuscripts/pending-review`

For editors/administrators to see manuscripts awaiting review.

**Request:**

```bash
curl "http://localhost:5001/api/manuscripts/pending-review?limit=20&category=Artificial Intelligence"
```

**Response:**

```json
{
  "success": true,
  "status": "under_review",
  "count": 2,
  "manuscripts": [
    {
      "id": 123,
      "title": "AI Applications in Healthcare",
      "author": "Dr. John Doe",
      "category": ["Artificial Intelligence", "Healthcare"],
      "abstract": "This paper explores...",
      "status": "under_review",
      "submissionDate": "2024-01-01T12:00:00.000Z",
      "cid": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
      "reviewInfo": {
        "reviewsCompleted": 1,
        "reviewsRequired": 3,
        "canPublish": false
      },
      "ipfsUrls": {
        "manuscript": "https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o"
      }
    }
  ]
}
```

### Get Published Manuscripts (Public)

**GET** `/api/manuscripts/published/:category`

Public endpoint showing only peer-reviewed, published manuscripts.

**Request:**

```bash
curl "http://localhost:5001/api/manuscripts/published/Artificial Intelligence?limit=10"
```

**Response:**

```json
{
  "success": true,
  "category": ["Artificial Intelligence"],
  "count": 1,
  "manuscripts": [
    {
      "id": 789,
      "title": "Machine Learning in Medical Diagnosis",
      "author": "Dr. Jane Smith",
      "category": ["Artificial Intelligence", "Healthcare"],
      "status": "published", // ← Only published manuscripts shown
      "submissionDate": "2024-01-01T12:00:00.000Z",
      "publishedDate": "2024-01-15T14:30:00.000Z", // ← Publication date
      "cid": "QmPublishedManuscriptHash...",
      "ipfsUrls": {
        "manuscript": "https://ipfs.io/ipfs/QmPublishedManuscriptHash..."
      }
    }
  ]
}
```

### Get Manuscripts by Status

**GET** `/api/manuscripts/status/:status`

Filter manuscripts by their current status.

**Request:**

```bash
# Get all manuscripts under review
curl "http://localhost:5001/api/manuscripts/status/under_review?limit=20"

# Get all published manuscripts
curl "http://localhost:5001/api/manuscripts/status/published?limit=10"
```

**Response:**

```json
{
  "success": true,
  "status": "under_review",
  "count": 5,
  "manuscripts": [
    {
      "id": 123,
      "title": "AI Applications in Healthcare",
      "status": "under_review",
      "submissionDate": "2024-01-01T12:00:00.000Z",
      "author": "Dr. John Doe"
    }
  ]
}
```

## 3. Reviewer Assignment and Review Process

### Assign Multiple Reviewers (Min. 3 Required)

**POST** `/api/reviews/manuscript/:manuscriptId/assign-reviewers`

Assign minimum 3 reviewers to ensure thorough peer review.

**Request:**

```bash
curl -X POST http://localhost:5001/api/reviews/manuscript/123/assign-reviewers \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": [
      "0xReviewer1Address123...",
      "0xReviewer2Address456...",
      "0xReviewer3Address789..."
    ],
    "assignedBy": "editor@journal.com"
  }'
```

**Response:**

```json
{
  "success": true,
  "manuscriptId": 123,
  "reviewersAssigned": 3,
  "reviewRecords": [
    {
      "id": 501,
      "reviewer": "0xReviewer1Address123...",
      "deadline": "2024-02-01T00:00:00.000Z"
    },
    {
      "id": 502,
      "reviewer": "0xReviewer2Address456...",
      "deadline": "2024-02-01T00:00:00.000Z"
    },
    {
      "id": 503,
      "reviewer": "0xReviewer3Address789...",
      "deadline": "2024-02-01T00:00:00.000Z"
    }
  ],
  "message": "3 reviewers assigned successfully"
}
```

### Submit Review Decision

**POST** `/api/reviews/:reviewId/submit-review`

Reviewers submit their decisions and comments.

**Request:**

```bash
curl -X POST http://localhost:5001/api/reviews/501/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Excellent methodology and clear presentation. The experimental results strongly support the conclusions. Minor typos on pages 5 and 12.",
    "confidentialComments": "This is a strong contribution to the field. The author has addressed previous concerns well.",
    "reviewerWallet": "0xReviewer1Address123..."
  }'
```

**Valid Decisions:**

- `accept` - Manuscript ready for publication
- `reject` - Manuscript not suitable for publication
- `minor_revision` - Accept after minor changes
- `major_revision` - Significant changes needed

**Response:**

```json
{
  "success": true,
  "review": {
    "id": 501,
    "status": "completed",
    "decision": "accept",
    "completedAt": "2024-01-20T14:30:00.000Z"
  },
  "manuscriptId": 123,
  "reviewProgress": {
    "completed": 1,
    "required": 3,
    "canPublish": false,
    "publishRecommendation": null
  },
  "message": "Review submitted successfully"
}
```

### Check Review Status & Publication Readiness

**GET** `/api/reviews/manuscript/:manuscriptId/review-status`

Monitor review progress and publication eligibility.

**Request:**

```bash
curl "http://localhost:5001/api/reviews/manuscript/123/review-status"
```

**Response (All Reviews Completed):**

```json
{
  "success": true,
  "manuscriptId": 123,
  "manuscriptTitle": "AI Applications in Healthcare",
  "currentStatus": "under_review",
  "totalReviewers": 3,
  "reviewsCompleted": 3,
  "reviewsInProgress": 0,
  "reviewsPending": 0,
  "requiredReviews": 3,
  "canPublish": true, // ← Ready for publication!
  "nextAction": "ready_to_publish",
  "reviews": [
    {
      "id": 501,
      "reviewer": "0xReviewer1Address123...",
      "status": "completed",
      "deadline": "2024-02-01T00:00:00.000Z",
      "completed": "2024-01-20T14:30:00.000Z",
      "overdue": false
    },
    {
      "id": 502,
      "reviewer": "0xReviewer2Address456...",
      "status": "completed",
      "completed": "2024-01-21T09:15:00.000Z",
      "overdue": false
    },
    {
      "id": 503,
      "reviewer": "0xReviewer3Address789...",
      "status": "completed",
      "completed": "2024-01-22T11:45:00.000Z",
      "overdue": false
    }
  ]
}
```

## 4. Publication Process

### Publish Approved Manuscript

**POST** `/api/manuscripts/:id/publish`

Publish manuscript after successful peer review (requires 2+ accepts from 3+ reviews).

**Request:**

```bash
curl -X POST http://localhost:5001/api/manuscripts/123/publish \
  -H "Content-Type: application/json" \
  -d '{
    "publishedBy": "editor@journal.com"
  }'
```

**Response:**

```json
{
  "success": true,
  "manuscript": {
    "id": 123,
    "title": "AI Applications in Healthcare",
    "author": "Dr. John Doe",
    "status": "published",
    "publishedDate": "2024-01-22T16:00:00.000Z",
    "publishedBy": "editor@journal.com"
  },
  "message": "Manuscript published successfully"
}
```

## 5. CV Registration Process (MANDATORY)

### Step 1: Upload and Parse CV

**POST** `/api/parse-cv/parse-cv`

Upload your CV (PDF or image) and parse it with AI to extract structured data.

**Request:**

```bash
curl -X POST http://localhost:5001/api/parse-cv/parse-cv \
  -F "cv=@john_doe_cv.pdf" \
  -F "walletAddress=0x1234567890abcdef1234567890abcdef12345678"
```

**⚠️ Required Fields:**

- `cv` - CV file (PDF, JPG, PNG)
- `walletAddress` - Your wallet address (links CV to your account)

**🤖 Enhanced AI Extraction:**

- **Field**: General academic domain (e.g., "Computer Science", "Biology")
- **Specialization**: Specific expertise area (e.g., "Machine Learning", "Quantum Computing")
- **Smart Detection**: AI analyzes research interests, dissertation topics, publications, and technical skills to identify your specialization

**Response:**

```json
{
  "success": true,
  "data": {
    "selfIdentity": {
      "fullName": "Dr. John Doe",
      "title": "Associate Professor",
      "profession": "Computer Scientist",
      "institution": "MIT",
      "location": "Cambridge, MA",
      "field": "Computer Science",
      "specialization": "Machine Learning and Artificial Intelligence"
    },
    "contact": {
      "email": "john.doe@mit.edu",
      "phone": "+1-555-0123",
      "linkedIn": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe",
      "website": "https://johndoe.mit.edu"
    },
    "overview": "Experienced researcher in artificial intelligence and machine learning with 15+ years of experience...",
    "education": [
      {
        "degree": "PhD",
        "field": "Computer Science",
        "institution": "Stanford University",
        "year": "2010",
        "details": "Dissertation: Deep Learning Applications in Natural Language Processing"
      }
    ],
    "experience": [
      {
        "position": "Associate Professor",
        "institution": "MIT",
        "startDate": "2015",
        "endDate": "Present",
        "description": "Leading research in AI and machine learning..."
      }
    ],
    "publications": [
      {
        "title": "Deep Learning for Medical Diagnosis",
        "journal": "Nature Medicine",
        "year": "2023",
        "type": "first-author",
        "citations": 150
      }
    ],
    "skills": ["Machine Learning", "Deep Learning", "Python", "TensorFlow"],
    "awards": [
      {
        "name": "Best Paper Award",
        "organization": "ICML",
        "year": "2022"
      }
    ]
  },
  "extractedText": "Dr. John Doe Associate Professor MIT...",
  "message": "CV parsed successfully"
}
```

### Step 2: Save CV Data (Automatic)

The CV parsing endpoint automatically saves the parsed data to your wallet address, so no additional step is required. The CV is immediately available for manuscript submission.

### Step 3: Verify CV Registration

**GET** `/api/parse-cv/user/profile/:walletAddress`

Check that your CV was saved correctly and view your parsed profile.

**Request:**

```bash
curl "http://localhost:5001/api/parse-cv/user/profile/0x1234567890abcdef1234567890abcdef12345678"
```

**Response:**

```json
{
  "success": true,
  "profile": {
    "id": 123,
    "filename": "john_doe_cv.pdf",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "personalInfo": {
      "fullName": "Dr. John Doe",
      "title": "Associate Professor",
      "profession": "Computer Scientist",
      "institution": "MIT",
      "location": "Cambridge, MA",
      "field": "Computer Science",
      "specialization": "Machine Learning and Artificial Intelligence"
    },
    "contact": {
      "email": "john.doe@mit.edu",
      "phone": "+1-555-0123",
      "linkedIn": "https://linkedin.com/in/johndoe"
    },
    "summary": {
      "education": 3,
      "experience": 5,
      "publications": 25,
      "awards": 4
    }
  },
  "message": "✅ CV verified - You can now submit manuscripts"
}
```

### Step 4: Check Specialization Extraction (Optional)

**GET** `/api/parse-cv/user/specialization/:walletAddress`

Get detailed information about the user's extracted field and specialization.

**Request:**

```bash
curl "http://localhost:5001/api/parse-cv/user/specialization/0x1234567890abcdef1234567890abcdef12345678"
```

**Response:**

```json
{
  "success": true,
  "message": "Specialization data retrieved successfully",
  "data": {
    "fullName": "Dr. John Doe",
    "field": "Computer Science",
    "specialization": "Machine Learning and Artificial Intelligence",
    "profession": "Associate Professor",
    "institution": "MIT",
    "researchAreas": [
      "Nature Machine Intelligence",
      "IEEE Transactions on AI",
      "ICML",
      "NeurIPS",
      "AAAI"
    ],
    "extractedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

**What the AI Extracts for Specialization:**

- Research interests and focus areas
- PhD dissertation topics
- Specialized technical skills
- Niche expertise within broader field
- Teaching specializations
- Publication domains and research themes

### Step 5: Update Profile (Optional)

**PATCH** `/api/parse-cv/user/profile/:walletAddress`

Update user profile information after initial CV registration.

**Request:**

```bash
curl -X PATCH "http://localhost:5001/api/parse-cv/user/profile/0x1234567890abcdef1234567890abcdef12345678" \
  -H "Content-Type: application/json" \
  -d '{
    "personalInfo": {
      "fullName": "Dr. John Doe",
      "title": "Full Professor",
      "profession": "Senior Research Scientist",
      "institution": "Stanford University",
      "location": "Stanford, CA",
      "field": "Computer Science",
      "specialization": "Deep Learning and Neural Networks"
    },
    "contact": {
      "email": "john.doe@stanford.edu",
      "phone": "+1-650-555-0123",
      "linkedIn": "https://linkedin.com/in/johndoe-stanford",
      "github": "https://github.com/johndoe-ai",
      "website": "https://johndoe.stanford.edu"
    },
    "overview": "Leading researcher in deep learning with 20+ years of experience in neural network architectures and AI applications."
  }'
```

**Request Body Structure:**

```json
{
  "personalInfo": {
    "fullName": "string (optional)",
    "title": "string (optional)",
    "profession": "string (optional)",
    "institution": "string (optional)",
    "location": "string (optional)",
    "field": "string (optional)",
    "specialization": "string (optional)"
  },
  "contact": {
    "email": "string (optional)",
    "phone": "string (optional)",
    "linkedIn": "string (optional)",
    "github": "string (optional)",
    "website": "string (optional)"
  },
  "overview": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "id": 123,
    "filename": "john_doe_cv.pdf",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "personalInfo": {
      "fullName": "Dr. John Doe",
      "title": "Full Professor",
      "profession": "Senior Research Scientist",
      "institution": "Stanford University",
      "location": "Stanford, CA",
      "field": "Computer Science",
      "specialization": "Deep Learning and Neural Networks"
    },
    "contact": {
      "email": "john.doe@stanford.edu",
      "phone": "+1-650-555-0123",
      "linkedIn": "https://linkedin.com/in/johndoe-stanford"
    },
    "overview": "Leading researcher in deep learning with 20+ years of experience...",
    "summary": {
      "education": 3,
      "experience": 5,
      "publications": 25,
      "awards": 4
    }
  },
  "updatedFields": ["fullName", "title", "profession", "institution", "email"]
}
```

**🔒 Security Notes:**

- Only the wallet owner can update their profile
- All fields are optional - update only what you need
- Changes are immediately reflected in manuscript submissions
- Updated timestamp is automatically tracked

## 6. Complete Workflow Example

### End-to-End Manuscript Publication

```bash
# 0. MANDATORY FIRST STEP: Register CV
curl -X POST http://localhost:5001/api/parse-cv/parse-cv \
  -F "cv=@alice_johnson_cv.pdf" \
  -F "walletAddress=0xAliceWallet123..."
# Response: CV parsed and saved successfully

# 0.1. Verify CV registration
curl "http://localhost:5001/api/manuscripts/check-cv-status/0xAliceWallet123..."
# Response: { "success": true, "canSubmitManuscripts": true }

# 1. Submit manuscript for peer review (CV required)
curl -X POST http://localhost:5001/api/manuscripts/submit \
  -F "manuscript=@quantum_research.pdf" \
  -F "title=Quantum Error Correction Methods" \
  -F "author=Dr. Alice Johnson" \
  -F "category=Quantum Computing" \
  -F "abstract=Novel approaches to quantum error correction..." \
  -F "authorWallet=0xAliceWallet123..."
# Response: Manuscript ID 456, Status: "under_review"

# 2. Editor checks pending manuscripts
curl "http://localhost:5001/api/manuscripts/pending-review?limit=10"
# Response: Shows manuscript 456 awaiting review

# 3. Editor assigns 3 reviewers
curl -X POST http://localhost:5001/api/reviews/manuscript/456/assign-reviewers \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": ["0xExpert1", "0xExpert2", "0xExpert3"],
    "assignedBy": "editor@quantumjournal.com"
  }'
# Response: 3 review records created (IDs: 601, 602, 603)

# 4. Reviewer 1 accepts
curl -X POST http://localhost:5001/api/reviews/601/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Innovative approach with solid theoretical foundation.",
    "reviewerWallet": "0xExpert1"
  }'

# 5. Reviewer 2 accepts
curl -X POST http://localhost:5001/api/reviews/602/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Excellent experimental validation of the proposed methods.",
    "reviewerWallet": "0xExpert2"
  }'

# 6. Reviewer 3 requests minor revision
curl -X POST http://localhost:5001/api/reviews/603/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "minor_revision",
    "comments": "Please clarify the complexity analysis in section 4.2.",
    "reviewerWallet": "0xExpert3"
  }'
# Result: 2 accepts + 1 minor revision = Publication eligible

# 7. Check if ready to publish
curl "http://localhost:5001/api/reviews/manuscript/456/review-status"
# Response: canPublish: true, nextAction: "ready_to_publish"

# 8. Publish the manuscript
curl -X POST http://localhost:5001/api/manuscripts/456/publish \
  -H "Content-Type: application/json" \
  -d '{"publishedBy": "editor@quantumjournal.com"}'
# Response: Status changed to "published"

# 9. Manuscript now appears in public listings
curl "http://localhost:5001/api/manuscripts/published/Quantum Computing"
# Response: Shows published manuscript in public feed
```

## 7. Legacy Endpoints (Modified Behavior)

### Recent Manuscripts (Now Shows Only Published)

**GET** `/api/manuscripts/recent/:category`

⚠️ **Legacy endpoint** - now only returns published manuscripts for backward compatibility.

**Request:**

```bash
curl "http://localhost:5001/api/manuscripts/recent/Artificial Intelligence?limit=5"
```

**Response:**

```json
{
  "success": true,
  "category": ["Artificial Intelligence"],
  "count": 1,
  "manuscripts": [
    {
      "id": 789,
      "title": "Machine Learning in Medical Diagnosis",
      "status": "published", // ← Only published manuscripts
      "publishedDate": "2024-01-15T14:30:00.000Z",
      "submissionDate": "2024-01-01T12:00:00.000Z"
    }
  ],
  "message": "Published manuscripts retrieved successfully (legacy endpoint)"
}
```

## 8. Frontend Integration Examples

For detailed frontend integration examples and React/TypeScript components, please refer to [NFT_FRONTEND_INTEGRATION.md](./NFT_FRONTEND_INTEGRATION.md).

### Profile Update Interface

```javascript
// Update user profile with edited data
const updateUserProfile = async (walletAddress, editData) => {
  try {
    const response = await fetch(
      `/api/parse-cv/user/profile/${walletAddress}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log("✅ Profile updated successfully");
      console.log(`📝 Updated fields: ${result.updatedFields.join(", ")}`);

      // Update local state with new profile data
      return {
        success: true,
        profile: result.profile,
        updatedFields: result.updatedFields,
      };
    } else {
      console.error("❌ Profile update failed:", result.message);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: error.message };
  }
};

// Example usage in a React component
const handleSave = async () => {
  const result = await updateUserProfile(walletAddress, {
    personalInfo: {
      fullName: editData.personalInfo.fullName,
      title: editData.personalInfo.title,
      profession: editData.personalInfo.profession,
      institution: editData.personalInfo.institution,
      specialization: editData.personalInfo.specialization,
    },
    contact: {
      email: editData.contact.email,
      phone: editData.contact.phone,
      linkedIn: editData.contact.linkedIn,
    },
    overview: editData.overview,
  });

  if (result.success) {
    setProfileData(result.profile);
    setIsEditing(false);
    alert("Profile updated successfully!");
  } else {
    alert(`Failed to update profile: ${result.error}`);
  }
};

// Validate profile completeness
const checkProfileCompleteness = (profile) => {
  const required = ["fullName", "institution", "field"];
  const missing = required.filter(
    (field) =>
      !profile.personalInfo[field] || profile.personalInfo[field].trim() === ""
  );

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
    completionScore:
      ((required.length - missing.length) / required.length) * 100,
  };
};
```

### CV Registration Check (Required Before Manuscript Submission)

```javascript
// Check if user has registered CV before allowing manuscript submission
const checkCVRegistration = async (walletAddress) => {
  try {
    const response = await fetch(
      `/api/manuscripts/check-cv-status/${walletAddress}`
    );
    const result = await response.json();

    if (result.success && result.canSubmitManuscripts) {
      console.log(`✅ CV verified for ${result.userInfo.fullName}`);
      console.log(`🏫 Institution: ${result.userInfo.institution}`);
      console.log(`📅 Registered: ${result.userInfo.registeredAt}`);
      return true; // Allow manuscript submission
    } else {
      console.log(`❌ ${result.message}`);
      alert("Please upload your CV before submitting manuscripts.");
      return false; // Block manuscript submission
    }
  } catch (error) {
    console.error("Failed to check CV status:", error);
    return false;
  }
};

// Submit manuscript with CV validation
const submitManuscript = async (manuscriptData, walletAddress) => {
  // First check CV registration
  const hasCV = await checkCVRegistration(walletAddress);
  if (!hasCV) {
    return { success: false, error: "CV registration required" };
  }

  // Proceed with manuscript submission
  const formData = new FormData();
  formData.append("manuscript", manuscriptData.file);
  formData.append("title", manuscriptData.title);
  formData.append("author", manuscriptData.author);
  formData.append("category", manuscriptData.category);
  formData.append("authorWallet", walletAddress); // Required!

  try {
    const response = await fetch("/api/manuscripts/submit", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Manuscript submitted: ${result.manuscript.title}`);
      console.log(`🆔 Manuscript ID: ${result.manuscript.id}`);
      return result;
    } else {
      if (result.code === "CV_REQUIRED") {
        alert("CV registration required. Please upload your CV first.");
      }
      return result;
    }
  } catch (error) {
    console.error("Failed to submit manuscript:", error);
    return { success: false, error: error.message };
  }
};
```

### Review Dashboard Component

```javascript
// Get manuscripts pending review for admin dashboard
const getPendingManuscripts = async () => {
  try {
    const response = await fetch("/api/manuscripts/pending-review?limit=20");
    const result = await response.json();

    if (result.success) {
      result.manuscripts.forEach((manuscript) => {
        const progress = manuscript.reviewInfo;
        console.log(
          `${manuscript.title}: ${progress.reviewsCompleted}/${progress.reviewsRequired} reviews completed`
        );

        if (progress.canPublish) {
          console.log(`✅ Ready to publish: ${manuscript.title}`);
        }
      });
    }

    return result.manuscripts;
  } catch (error) {
    console.error("Failed to get pending manuscripts:", error);
  }
};
```

### Public Publication Feed

```javascript
// Get published manuscripts for public viewing
const getPublishedManuscripts = async (category) => {
  try {
    const response = await fetch(
      `/api/manuscripts/published/${encodeURIComponent(category)}?limit=10`
    );
    const result = await response.json();

    if (result.success) {
      // Only shows peer-reviewed, published content
      result.manuscripts.forEach((manuscript) => {
        console.log(`📚 Published: ${manuscript.title}`);
        console.log(`📅 Publication Date: ${manuscript.publishedDate}`);
        console.log(`🔗 IPFS: ${manuscript.ipfsUrls.manuscript}`);
      });
    }

    return result.manuscripts;
  } catch (error) {
    console.error("Failed to get published manuscripts:", error);
  }
};
```

### Reviewer Interface

```javascript
// Submit review decision
const submitReview = async (reviewId, decision, comments) => {
  try {
    const reviewData = {
      decision: decision, // 'accept', 'reject', 'minor_revision', 'major_revision'
      comments: comments,
      confidentialComments: "Confidential notes for editors...",
      reviewerWallet: getCurrentUserWallet(),
    };

    const response = await fetch(`/api/reviews/${reviewId}/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Review submitted successfully");

      if (result.reviewProgress.canPublish) {
        alert("🎉 This manuscript is now ready for publication!");
      } else {
        const remaining =
          result.reviewProgress.required - result.reviewProgress.completed;
        console.log(`📊 ${remaining} more reviews needed for publication`);
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to submit review:", error);
  }
};
```

### Editor Publication Interface

```javascript
// Check if manuscript is ready and publish it
const publishManuscript = async (manuscriptId) => {
  try {
    // First check review status
    const statusResponse = await fetch(
      `/api/reviews/manuscript/${manuscriptId}/review-status`
    );
    const statusResult = await statusResponse.json();

    if (!statusResult.canPublish) {
      alert(`❌ Cannot publish: ${statusResult.nextAction}`);
      return false;
    }

    // Publish the manuscript
    const publishResponse = await fetch(
      `/api/manuscripts/${manuscriptId}/publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishedBy: getCurrentEditorEmail(),
        }),
      }
    );

    const publishResult = await publishResponse.json();

    if (publishResult.success) {
      console.log(`✅ Published: ${publishResult.manuscript.title}`);
      console.log(
        `📅 Publication Date: ${publishResult.manuscript.publishedDate}`
      );
      return true;
    }
  } catch (error) {
    console.error("Failed to publish manuscript:", error);
  }

  return false;
};
```

## 9. Error Handling

### CV Registration Errors

**Missing CV Registration:**

```json
{
  "error": "CV registration required",
  "code": "CV_REQUIRED",
  "message": "You must upload and register your CV before submitting manuscripts. Please visit the CV upload page first.",
  "requiresCV": true,
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Missing Wallet Address:**

```json
{
  "error": "Author wallet address is required for manuscript submission",
  "code": "MISSING_WALLET",
  "message": "Please provide your wallet address to submit manuscripts"
}
```

### Profile Update Errors

**User Not Found:**

```json
{
  "error": "User not found",
  "message": "No CV data found for this wallet address"
}
```

**No Valid Updates:**

```json
{
  "error": "No valid updates provided",
  "message": "Please provide at least one field to update"
}
```

**Update Failed:**

```json
{
  "error": "Failed to update profile",
  "message": "Database connection failed",
  "code": "UPDATE_ERROR"
}
```

### Workflow-Specific Errors

**Insufficient Reviewers:**

```json
{
  "error": "Minimum 3 reviewers required",
  "code": "INSUFFICIENT_REVIEWERS"
}
```

**Invalid Review Decision:**

```json
{
  "error": "Valid decision required: accept, reject, minor_revision, major_revision",
  "code": "INVALID_DECISION"
}
```

**Manuscript Not Ready for Publication:**

```json
{
  "error": "Manuscript not ready for publication - insufficient approved reviews",
  "code": "PUBLICATION_NOT_READY",
  "details": {
    "reviewsCompleted": 2,
    "reviewsRequired": 3,
    "approvedReviews": 1,
    "requiredApprovals": 2
  }
}
```

## 10. NFT Integration (Academic NFTs)

### Overview: Academic NFT Creation

After a manuscript is published through peer review, it's automatically converted to an **Academic NFT** on the Solana blockchain. This provides:

- **Immutable Publication Record**: Permanent blockchain verification
- **Royalty Distribution**: Automated revenue sharing between authors, reviewers, and platform
- **Academic Credentials**: Verifiable proof of peer-reviewed publication
- **IPFS Storage**: Decentralized, permanent storage of manuscript and metadata

### NFT Creation Flow

1. **Manuscript Published** → Peer review completed, manuscript approved
2. **NFT Metadata Generated** → Creates structured metadata with publication details
3. **NFT Image Generated** → Creates visual representation of the academic work
4. **IPFS Upload** → Stores image and metadata on decentralized storage
5. **Solana Metadata Creation** → Links NFT to Solana blockchain using Metaboss
6. **Verification** → Confirms NFT creation and provides explorer links

### NFT Health Check

**GET** `/api/nft-metadata/health`

Check the status of NFT-related services (IPFS, Metaboss, Image Generation).

**Request:**

```bash
curl "http://localhost:5001/api/nft-metadata/health"
```

**Response:**

```json
{
  "status": "healthy",
  "service": "nft-metadata",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "ipfs": true,
    "metaboss": true,
    "imageGenerator": true
  },
  "dependencies": {
    "pinata": true,
    "metaboss": true,
    "imageGeneration": true
  }
}
```

**Response (Degraded Service):**

```json
{
  "status": "degraded",
  "service": "nft-metadata",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "ipfs": true,
    "metaboss": false,
    "imageGenerator": true
  },
  "dependencies": {
    "pinata": true,
    "metaboss": false,
    "imageGeneration": true
  }
}
```

### Create Academic NFT

**POST** `/api/nft-metadata/create`

Create NFT metadata and image for a published manuscript.

**⚠️ Required Fields:**

- `mint` - Solana mint address for the NFT
- `doci` - Digital Object Citation Identifier (unique academic identifier)
- `title` - Manuscript title
- `description` - Manuscript description/abstract
- `ipfs_hash` - IPFS hash of the published manuscript
- `author` - Author name

**Optional Fields:**

- `reviewers` - Array of reviewer wallet addresses
- `publication_date` - Unix timestamp (defaults to current time)
- `authors_share` - Author royalty percentage (default: 5000 = 50%)
- `platform_share` - Platform royalty percentage (default: 2000 = 20%)
- `reviewers_share` - Reviewer royalty percentage (default: 3000 = 30%)

**Request Example:**

```bash
curl -X POST http://localhost:5001/api/nft-metadata/create \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "doci": "10.5281/zenodo.1234567",
    "title": "Quantum Error Correction Methods in Modern Computing",
    "description": "This paper presents novel approaches to quantum error correction, demonstrating significant improvements in qubit stability and error rates through innovative algorithmic techniques.",
    "ipfs_hash": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "author": "Dr. Alice Johnson",
    "reviewers": [
      "0xReviewer1Address123...",
      "0xReviewer2Address456...",
      "0xReviewer3Address789..."
    ],
    "authors_share": 5000,
    "platform_share": 2000,
    "reviewers_share": 3000
  }'
```

**Response Example:**

```json
{
  "success": true,
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "doci": "10.5281/zenodo.1234567",
  "imageIpfsHash": "QmNFTImageHash123456789",
  "metadataIpfsHash": "QmNFTMetadataHash987654321",
  "explorerUrl": "https://explorer.solana.com/address/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?cluster=devnet"
}
```

**Error Response (Missing Fields):**

```json
{
  "error": "Missing required fields: mint, doci",
  "required": ["mint", "doci", "title", "description", "ipfs_hash", "author"]
}
```

### Get NFT Metadata

**GET** `/api/nft-metadata/:mint`

Retrieve NFT metadata for a specific mint address.

**Request:**

```bash
curl "http://localhost:5001/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

**Response:**

```json
{
  "success": true,
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "metadata": {
    "name": "Quantum Error Correction Methods in Modern Computing",
    "symbol": "ACADEMIC",
    "description": "This paper presents novel approaches to quantum error correction...",
    "image": "https://gateway.pinata.cloud/ipfs/QmNFTImageHash123456789",
    "external_url": "https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "properties": {
      "files": [
        {
          "uri": "https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
          "type": "application/pdf"
        }
      ],
      "category": "Quantum Computing"
    },
    "attributes": [
      {
        "trait_type": "Author",
        "value": "Dr. Alice Johnson"
      },
      {
        "trait_type": "DOI",
        "value": "10.5281/zenodo.1234567"
      },
      {
        "trait_type": "Publication Date",
        "value": "2024-01-15"
      },
      {
        "trait_type": "Peer Reviewed",
        "value": "Yes"
      },
      {
        "trait_type": "Reviewers",
        "value": 3
      },
      {
        "trait_type": "Authors Share",
        "value": "50%"
      },
      {
        "trait_type": "Platform Share",
        "value": "20%"
      },
      {
        "trait_type": "Reviewers Share",
        "value": "30%"
      }
    ],
    "collection": {
      "name": "Fronsciers Academic NFTs",
      "family": "Peer-Reviewed Publications"
    }
  },
  "explorerUrl": "https://explorer.solana.com/address/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?cluster=devnet"
}
```

**Error Response (Not Found):**

```json
{
  "error": "Metadata not found",
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

### Update NFT Metadata

**PUT** `/api/nft-metadata/:mint`

Update existing NFT metadata (useful for corrections or additional information).

**Request:**

```bash
curl -X PUT http://localhost:5001/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  -H "Content-Type: application/json" \
  -d '{
    "doci": "10.5281/zenodo.1234567",
    "title": "Quantum Error Correction Methods in Modern Computing (Updated)",
    "description": "Updated description with additional findings and corrections...",
    "ipfs_hash": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "author": "Dr. Alice Johnson",
    "reviewers": [
      "0xReviewer1Address123...",
      "0xReviewer2Address456...",
      "0xReviewer3Address789..."
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "imageIpfsHash": "QmUpdatedNFTImageHash123456789",
  "metadataIpfsHash": "QmUpdatedNFTMetadataHash987654321"
}
```

### Verify NFT Metadata

**GET** `/api/nft-metadata/:mint/verify`

Check if NFT metadata exists for a given mint address.

**Request:**

```bash
curl "http://localhost:5001/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/verify"
```

**Response (Exists):**

```json
{
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "exists": true,
  "explorerUrl": "https://explorer.solana.com/address/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?cluster=devnet"
}
```

**Response (Not Found):**

```json
{
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "exists": false,
  "explorerUrl": "https://explorer.solana.com/address/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?cluster=devnet"
}
```

### Generate Preview Image

**POST** `/api/nft-metadata/preview-image`

Generate a preview image for NFT without creating metadata (for frontend previews).

**Request:**

```bash
curl -X POST http://localhost:5001/api/nft-metadata/preview-image \
  -H "Content-Type: application/json" \
  -d '{
    "doci": "10.5281/zenodo.1234567",
    "ownerName": "Dr. Alice Johnson",
    "title": "Quantum Error Correction Methods in Modern Computing",
    "publicationDate": "2024-01-15"
  }'
```

**Response:**

```json
{
  "message": "Preview image generation not yet implemented",
  "data": {
    "doci": "10.5281/zenodo.1234567",
    "ownerName": "Dr. Alice Johnson",
    "title": "Quantum Error Correction Methods in Modern Computing",
    "publicationDate": "2024-01-15"
  }
}
```

## 11. Complete End-to-End Workflow Example

### Full Academic Publication & NFT Creation

```bash
# 0. MANDATORY FIRST STEP: Register CV
curl -X POST http://localhost:5001/api/parse-cv/parse-cv \
  -F "cv=@alice_johnson_cv.pdf" \
  -F "walletAddress=0xAliceWallet123..."
# Response: CV parsed and saved successfully

# 0.1. Verify CV registration
curl "http://localhost:5001/api/manuscripts/check-cv-status/0xAliceWallet123..."
# Response: { "success": true, "canSubmitManuscripts": true }

# 1. Submit manuscript for peer review (CV required)
curl -X POST http://localhost:5001/api/manuscripts/submit \
  -F "manuscript=@quantum_research.pdf" \
  -F "title=Quantum Error Correction Methods" \
  -F "author=Dr. Alice Johnson" \
  -F "category=Quantum Computing" \
  -F "abstract=Novel approaches to quantum error correction..." \
  -F "authorWallet=0xAliceWallet123..."
# Response: Manuscript ID 456, Status: "under_review"

# 2. Editor assigns 3 reviewers
curl -X POST http://localhost:5001/api/reviews/manuscript/456/assign-reviewers \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": ["0xExpert1", "0xExpert2", "0xExpert3"],
    "assignedBy": "editor@quantumjournal.com"
  }'
# Response: 3 review records created (IDs: 601, 602, 603)

# 3. All reviewers submit decisions
curl -X POST http://localhost:5001/api/reviews/601/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Innovative approach with solid theoretical foundation.",
    "reviewerWallet": "0xExpert1"
  }'

curl -X POST http://localhost:5001/api/reviews/602/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Excellent experimental validation of the proposed methods.",
    "reviewerWallet": "0xExpert2"
  }'

curl -X POST http://localhost:5001/api/reviews/603/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Innovative approach with solid foundation.",
    "reviewerWallet": "0xExpert3"
  }'

# 4. Check if ready to publish
curl "http://localhost:5001/api/reviews/manuscript/456/review-status"
# Response: canPublish: true, nextAction: "ready_to_publish"

# 5. Publish the manuscript
curl -X POST http://localhost:5001/api/manuscripts/456/publish \
  -H "Content-Type: application/json" \
  -d '{"publishedBy": "editor@quantumjournal.com"}'
# Response: Status changed to "published"

# 6. 🎯 NEW: Create Academic NFT
curl -X POST http://localhost:5001/api/nft-metadata/create \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "doci": "10.5281/zenodo.1234567",
    "title": "Quantum Error Correction Methods in Modern Computing",
    "description": "This paper presents novel approaches to quantum error correction...",
    "ipfs_hash": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "author": "Dr. Alice Johnson",
    "reviewers": ["0xExpert1", "0xExpert2", "0xExpert3"],
    "authors_share": 5000,
    "platform_share": 2000,
    "reviewers_share": 3000
  }'
# Response: NFT metadata and image created successfully

# 7. Verify NFT creation
curl "http://localhost:5001/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/verify"
# Response: exists: true

# 8. Get complete NFT metadata
curl "http://localhost:5001/api/nft-metadata/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
# Response: Complete NFT metadata with all attributes

# 9. Manuscript now appears in public listings with NFT info
curl "http://localhost:5001/api/manuscripts/published/Quantum Computing"
# Response: Shows published manuscript with NFT mint address
```

## 12. NFT Integration Examples

### Frontend NFT Creation Interface

```javascript
// Create NFT after manuscript publication
const createAcademicNFT = async (manuscriptData, mintAddress) => {
  try {
    const nftData = {
      mint: mintAddress,
      doci: manuscriptData.doi || `10.5281/zenodo.${Date.now()}`,
      title: manuscriptData.title,
      description: manuscriptData.abstract,
      ipfs_hash: manuscriptData.ipfs_hash,
      author: manuscriptData.author,
      reviewers: manuscriptData.reviewers || [],
      authors_share: 5000, // 50%
      platform_share: 2000, // 20%
      reviewers_share: 3000, // 30%
    };

    const response = await fetch("/api/nft-metadata/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nftData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Academic NFT created successfully");
      console.log(`🆔 Mint Address: ${result.mint}`);
      console.log(`🖼️ Image IPFS: ${result.imageIpfsHash}`);
      console.log(`📄 Metadata IPFS: ${result.metadataIpfsHash}`);
      console.log(`🔗 Explorer: ${result.explorerUrl}`);

      return {
        success: true,
        mint: result.mint,
        imageIpfsHash: result.imageIpfsHash,
        metadataIpfsHash: result.metadataIpfsHash,
        explorerUrl: result.explorerUrl,
      };
    } else {
      console.error("❌ NFT creation failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Failed to create NFT:", error);
    return { success: false, error: error.message };
  }
};

// Verify NFT exists
const verifyNFT = async (mintAddress) => {
  try {
    const response = await fetch(`/api/nft-metadata/${mintAddress}/verify`);
    const result = await response.json();

    if (result.exists) {
      console.log(`✅ NFT verified: ${mintAddress}`);
      console.log(`🔗 Explorer: ${result.explorerUrl}`);
      return true;
    } else {
      console.log(`❌ NFT not found: ${mintAddress}`);
      return false;
    }
  } catch (error) {
    console.error("Failed to verify NFT:", error);
    return false;
  }
};

// Get complete NFT metadata
const getNFTMetadata = async (mintAddress) => {
  try {
    const response = await fetch(`/api/nft-metadata/${mintAddress}`);
    const result = await response.json();

    if (result.success) {
      console.log("📖 NFT Metadata retrieved:");
      console.log(`📚 Title: ${result.metadata.name}`);
      console.log(
        `👤 Author: ${
          result.metadata.attributes.find((a) => a.trait_type === "Author")
            ?.value
        }`
      );
      console.log(
        `📅 Published: ${
          result.metadata.attributes.find(
            (a) => a.trait_type === "Publication Date"
          )?.value
        }`
      );
      console.log(
        `🔍 DOI: ${
          result.metadata.attributes.find((a) => a.trait_type === "DOI")?.value
        }`
      );
      console.log(
        `💰 Authors Share: ${
          result.metadata.attributes.find(
            (a) => a.trait_type === "Authors Share"
          )?.value
        }`
      );

      return result.metadata;
    } else {
      console.error("❌ Failed to get NFT metadata:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Failed to get NFT metadata:", error);
    return null;
  }
};

// Complete workflow integration
const publishManuscriptAndCreateNFT = async (manuscriptId, mintAddress) => {
  try {
    // 1. Publish manuscript
    const publishResult = await publishManuscript(manuscriptId);
    if (!publishResult) {
      throw new Error("Failed to publish manuscript");
    }

    // 2. Get published manuscript data
    const manuscriptData = await getManuscriptById(manuscriptId);

    // 3. Create NFT
    const nftResult = await createAcademicNFT(manuscriptData, mintAddress);
    if (!nftResult.success) {
      throw new Error(`Failed to create NFT: ${nftResult.error}`);
    }

    // 4. Verify NFT creation
    const verified = await verifyNFT(mintAddress);
    if (!verified) {
      throw new Error("NFT verification failed");
    }

    console.log(
      "🎉 Complete! Manuscript published and NFT created successfully"
    );
    return {
      success: true,
      manuscript: publishResult,
      nft: nftResult,
    };
  } catch (error) {
    console.error("❌ Workflow failed:", error);
    return { success: false, error: error.message };
  }
};
```

### NFT Display Component

```javascript
// Display NFT information in publication feed
const NFTBadge = ({ mintAddress }) => {
  const [nftData, setNftData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        const response = await fetch(`/api/nft-metadata/${mintAddress}`);
        const result = await response.json();

        if (result.success) {
          setNftData(result.metadata);
        }
      } catch (error) {
        console.error("Failed to fetch NFT data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (mintAddress) {
      fetchNFTData();
    }
  }, [mintAddress]);

  if (loading) {
    return <div className="nft-badge loading">Loading NFT...</div>;
  }

  if (!nftData) {
    return <div className="nft-badge error">NFT not found</div>;
  }

  return (
    <div className="nft-badge">
      <div className="nft-icon">🎯</div>
      <div className="nft-info">
        <div className="nft-title">Academic NFT</div>
        <div className="nft-details">
          <span>
            DOI: {nftData.attributes.find((a) => a.trait_type === "DOI")?.value}
          </span>
          <span>
            Author Share:{" "}
            {
              nftData.attributes.find((a) => a.trait_type === "Authors Share")
                ?.value
            }
          </span>
        </div>
      </div>
      <a
        href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="nft-explorer-link"
      >
        View on Solana Explorer
      </a>
    </div>
  );
};

// Enhanced publication card with NFT info
const PublicationCard = ({ manuscript }) => {
  return (
    <div className="publication-card">
      <h3>{manuscript.title}</h3>
      <p className="author">By {manuscript.author}</p>
      <p className="abstract">{manuscript.abstract}</p>

      <div className="publication-meta">
        <span className="status published">✅ Published</span>
        <span className="date">{manuscript.publishedDate}</span>
        <span className="reviewers">
          {manuscript.reviewers?.length || 0} reviewers
        </span>
      </div>

      {/* NFT Badge for published manuscripts */}
      {manuscript.nftMint && <NFTBadge mintAddress={manuscript.nftMint} />}

      <div className="actions">
        <a
          href={manuscript.ipfsUrls.manuscript}
          target="_blank"
          rel="noopener noreferrer"
        >
          📄 View Manuscript
        </a>
        {manuscript.nftMint && (
          <a
            href={`https://explorer.solana.com/address/${manuscript.nftMint}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🎯 View NFT
          </a>
        )}
      </div>
    </div>
  );
};
```

### NFT Health Monitoring

```javascript
// Monitor NFT service health
const checkNFTServices = async () => {
  try {
    const response = await fetch("/api/nft-metadata/health");
    const result = await response.json();

    const services = result.services;
    const issues = [];

    if (!services.ipfs) issues.push("IPFS service unavailable");
    if (!services.metaboss) issues.push("Metaboss CLI not available");
    if (!services.imageGenerator) issues.push("Image generation service down");

    if (issues.length > 0) {
      console.warn("⚠️ NFT services degraded:", issues);
      return {
        status: "degraded",
        issues: issues,
        services: services,
      };
    } else {
      console.log("✅ All NFT services healthy");
      return {
        status: "healthy",
        services: services,
      };
    }
  } catch (error) {
    console.error("❌ Failed to check NFT services:", error);
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
};

// Auto-retry NFT creation on service issues
const createNFTWithRetry = async (nftData, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 NFT creation attempt ${attempt}/${maxRetries}`);

      const result = await createAcademicNFT(nftData);

      if (result.success) {
        console.log(`✅ NFT created successfully on attempt ${attempt}`);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`NFT creation failed after ${maxRetries} attempts`);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
};
```

## 13. NFT Error Handling

### NFT Creation Errors

**Missing Required Fields:**

```json
{
  "error": "Missing required fields: mint, doci",
  "required": ["mint", "doci", "title", "description", "ipfs_hash", "author"]
}
```

**Invalid Mint Address:**

```json
{
  "error": "Invalid mint address",
  "mint": "invalid-address"
}
```

**Service Unavailable:**

```json
{
  "success": false,
  "error": "IPFS service unavailable - please try again later"
}
```

### NFT Verification Errors

**NFT Not Found:**

```json
{
  "error": "Metadata not found",
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

**Service Health Issues:**

```json
{
  "status": "degraded",
  "service": "nft-metadata",
  "services": {
    "ipfs": true,
    "metaboss": false,
    "imageGenerator": true
  }
}
```

This documentation now includes the complete **NFT integration workflow**, showing how published manuscripts are automatically converted to academic NFTs on the Solana blockchain, providing immutable proof of publication and automated royalty distribution.
