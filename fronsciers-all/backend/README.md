# Fronsciers DApp Backend

Academic manuscript peer review and NFT minting platform built with Bun, featuring decentralized storage on IPFS and blockchain integration with Solana.

## 🚀 Features

- **📄 CV Registration System**: Mandatory AI-powered CV parsing and verification
- **📚 Peer Review Workflow**: Academic manuscript submission and review process
- **🎨 NFT Minting**: Mint NFTs for accepted manuscripts on Solana blockchain
- **🌐 IPFS Integration**: Decentralized file storage via Pinata
- **⚡ Real-time Processing**: Built with Bun for maximum performance
- **🔒 Wallet Integration**: Blockchain wallet authentication and authorization

## 📋 Prerequisites

Before using the system, ensure you have:

- **Bun runtime** installed
- **Pinata account** for IPFS storage
- **Supabase account** for database
- **Solana wallet** for blockchain interactions
- **Metaboss** installed for Solana NFT operations

## 🛠️ Installation

```bash
# Install dependencies
bun install

# Set up environment variables (see below)
cp .env.example .env

# Start development server
bun run dev
```

The server will start on `http://localhost:5001`

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```env
# Pinata IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# Supabase Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Solana Configuration (for NFT minting)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key

# Optional: OpenAI for CV parsing enhancement
OPENAI_API_KEY=your_openai_api_key
```

### Getting Pinata Credentials

1. Sign up at [Pinata.cloud](https://pinata.cloud)
2. Navigate to **API Keys** in your dashboard
3. Create a new API key with permissions:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin`
   - `userPinnedDataTotal`
   - `pinList`
4. Copy API Key and Secret to your `.env` file

### Supabase Setup

1. Create project at [Supabase.com](https://supabase.com)
2. Go to **Settings > API**
3. Copy your Project URL and Anon Key
4. Import the database schema from `/database/schema.sql`

## 🔄 New Workflow (2024)

The platform now uses a **peer review workflow** instead of immediate publication:

### Previous Flow ❌

~~Submit → Immediately Published~~

### Current Flow ✅

**CV Registration → Submit → Review Queue → 3+ Reviewers → Publication Decision → NFT Minting**

## 📖 API Documentation

### 🎯 Core Workflow

#### 1. CV Registration (MANDATORY)

All authors must register their CV before submitting manuscripts:

```bash
# Upload and parse CV
curl -X POST http://localhost:5001/api/parse-cv/parse-cv \
  -F "cv=@your_cv.pdf" \
  -F "walletAddress=YOUR_WALLET_ADDRESS"

# Check registration status
curl "http://localhost:5001/api/manuscripts/check-cv-status/YOUR_WALLET_ADDRESS"
```

#### 2. Manuscript Submission

Submit manuscripts for peer review (requires registered CV):

```bash
curl -X POST http://localhost:5001/api/manuscripts/submit \
  -F "manuscript=@research_paper.pdf" \
  -F "title=Your Research Title" \
  -F "author=Dr. Your Name" \
  -F "category=Computer Science" \
  -F "abstract=Your abstract..." \
  -F "keywords=keyword1,keyword2" \
  -F "authorWallet=YOUR_WALLET_ADDRESS"
```

#### 3. Review Process

Editors assign reviewers and collect decisions:

```bash
# Assign reviewers (minimum 3 required)
curl -X POST http://localhost:5001/api/reviews/manuscript/123/assign-reviewers \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": ["reviewer1_wallet", "reviewer2_wallet", "reviewer3_wallet"],
    "assignedBy": "editor@journal.com"
  }'

# Submit review decision
curl -X POST http://localhost:5001/api/reviews/456/submit-review \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accept",
    "comments": "Excellent research quality...",
    "reviewerWallet": "REVIEWER_WALLET"
  }'
```

#### 4. Publication & NFT Minting

Publish approved manuscripts and mint NFTs:

```bash
# Publish after successful review
curl -X POST http://localhost:5001/api/manuscripts/123/publish \
  -H "Content-Type: application/json" \
  -d '{"publishedBy": "editor@journal.com"}'

# Mint NFT for accepted manuscript
curl -X POST http://localhost:5001/api/nft-metadata/create \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "SOLANA_MINT_ADDRESS",
    "doci": "10.fronsciers/2024.0001",
    "title": "Your Research Title",
    "description": "Academic NFT for published manuscript",
    "ipfs_hash": "MANUSCRIPT_IPFS_HASH",
    "author": "Dr. Your Name",
    "reviewers": ["Dr. Reviewer 1", "Dr. Reviewer 2"],
    "authors_share": 5000,
    "platform_share": 2000,
    "reviewers_share": 3000,
    "publication_date": 1640995200
  }'
```

### 📚 Key Endpoints

| Endpoint                                       | Method | Description                               |
| ---------------------------------------------- | ------ | ----------------------------------------- |
| `/api/parse-cv/parse-cv`                       | POST   | Upload and parse CV (required first step) |
| `/api/manuscripts/check-cv-status/:wallet`     | GET    | Check CV registration status              |
| `/api/manuscripts/submit`                      | POST   | Submit manuscript for review              |
| `/api/manuscripts/pending-review`              | GET    | Get manuscripts awaiting review           |
| `/api/manuscripts/published/:category`         | GET    | Get published manuscripts                 |
| `/api/reviews/manuscript/:id/assign-reviewers` | POST   | Assign reviewers to manuscript            |
| `/api/reviews/:id/submit-review`               | POST   | Submit review decision                    |
| `/api/manuscripts/:id/publish`                 | POST   | Publish approved manuscript               |
| `/api/nft-metadata/create`                     | POST   | Mint NFT for published manuscript         |
| `/api/nft-metadata/health`                     | GET    | Check NFT service health                  |

## 🧪 Testing

The platform includes comprehensive testing for the review-to-mint workflow:

### Quick Deployment Test

```bash
# Test core functionality
./deployment-test.js
```

### Comprehensive Test Suite

```bash
# Full scenario testing
./run-pre-deployment-tests.js
```

### Bun Test Suite

```bash
# TypeScript test suite
bun test test-review-to-mint-scenarios.ts
```

### Test Scenarios Covered

- ✅ **Acceptance Workflow**: Submit → Review → Accept → Mint NFT
- ❌ **Rejection Workflow**: Submit → Review → Reject → No NFT
- 🔄 **Revision Workflow**: Submit → Review → Revise → Re-review → Accept → Mint NFT
- 🏥 **Health Checks**: Services, IPFS, Solana connectivity

## 🔒 Security & Authentication

### Wallet Authentication

All operations require valid Solana wallet addresses:

- CV registration links to wallet address
- Manuscript submission requires author wallet
- Review decisions require reviewer wallet
- NFT minting uses authenticated mint addresses

### CV Registration Requirement

- **Mandatory** for all manuscript submissions
- AI-powered parsing extracts academic credentials
- Validates institutional affiliation and expertise
- Creates reviewer pool for peer matching

## 🌐 IPFS Integration

Files are stored on IPFS for decentralized access:

- **Manuscripts**: Original PDF files uploaded to IPFS
- **NFT Images**: Generated images for NFT metadata
- **NFT Metadata**: JSON metadata for blockchain storage
- **CV Files**: Academic credentials stored securely

## ⚡ Solana NFT Integration

NFTs are minted on Solana blockchain for accepted manuscripts:

- **Metadata Standards**: Follows Metaplex standards
- **Revenue Sharing**: Configurable splits between authors, reviewers, platform
- **DOCI System**: Digital Object Citation Identifiers
- **Explorer Links**: Direct links to Solana explorer

## 📊 Review Process

### Requirements

- Minimum **3 reviewers** per manuscript
- **Qualified reviewers** matched by field/specialization
- **Transparent decisions**: Accept, reject, minor/major revision
- **Editor oversight**: Final publication decisions

### Decision Matrix

| Reviewer Decisions          | Publication Outcome    |
| --------------------------- | ---------------------- |
| 2+ Accepts                  | ✅ Ready to publish    |
| 1 Accept + 1 Minor Revision | ✅ Ready to publish    |
| Majority Reject             | ❌ Manuscript rejected |
| Major Revision Required     | 🔄 Return to author    |

## 🚨 Error Handling

### Common Errors

**CV Not Registered:**

```json
{
  "error": "CV registration required",
  "code": "CV_REQUIRED",
  "message": "You must upload and register your CV before submitting manuscripts."
}
```

**Insufficient Reviews:**

```json
{
  "error": "Minimum 3 reviewers required",
  "code": "INSUFFICIENT_REVIEWERS"
}
```

**NFT Minting Failed:**

```json
{
  "error": "NFT minting failed",
  "details": "Solana transaction failed - insufficient SOL"
}
```

## 📈 Monitoring & Health Checks

Monitor system health with built-in endpoints:

```bash
# API service health
curl http://localhost:5001/api/health

# NFT service health
curl http://localhost:5001/api/nft-metadata/health

# Response includes service status for IPFS, Solana, database
```

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] Run comprehensive tests (`./run-pre-deployment-tests.js`)
- [ ] Verify environment variables set
- [ ] Test IPFS connectivity (Pinata)
- [ ] Verify Solana RPC connection
- [ ] Check database schema and migrations
- [ ] Test NFT minting with small amounts

### Production Deployment

```bash
# Build for production
bun build src/index.ts --outdir dist

# Start production server
bun run dist/index.js
```

## 📚 Additional Documentation

- **[DETAILED_API_EXAMPLES.md](./DETAILED_API_EXAMPLES.md)** - Complete API reference with examples
- **[NFT_BACKEND_INTEGRATION.md](./NFT_BACKEND_INTEGRATION.md)** - NFT minting integration guide
- **[NFT_FRONTEND_INTEGRATION.md](./NFT_FRONTEND_INTEGRATION.md)** - Frontend integration examples

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`bun test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with Bun** 🥖 | **Powered by IPFS & Solana** ⛓️ | **Academic Publishing Revolution** 📚
