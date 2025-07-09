pub const ESCROW_SEED: &[u8] = b"escrow";
pub const SUBMISSION_FEE: u64 = 50_000_000; //50 usd, 6 decimals
pub const FRONS_REWARD: u64 = 10_000_000; // 1 frons = 0.1 usd, 6 decimals
pub const MIN_REVIEWS: u8 = 3;



pub const USER_SPACE: usize = 8 + // discriminator
    32 + // wallet pubkey
    4 + 32 + // education string (max 32 chars)
    1 + // published_papers u8
    1; // bump

pub const MANUSCRIPT_SPACE: usize = 8 + // discriminator
    32 + // author pubkey
    4 + 128 + // ipfs_hash string (max 128 chars)
    4 + 16 + // status string (max 16 chars)
    4 + (32 * 10) + // reviewers vec (max 10 reviewers)
    4 + (4 + 16) * 10 + // decisions vec (max 10 decisions, 16 chars each)
    8; // submission_time

pub const ESCROW_SPACE: usize = 8 + // discriminator
    32 + // authority
    1; // bump
