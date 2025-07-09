#!/bin/bash

# Fronsciers NFT Metadata Management with Metaboss
# Usage: ./metaboss-nft.sh <command> [args]

set -e

# Configuration
METADATA_DIR="./metadata"
KEYPAIR_PATH="${SOLANA_KEYPAIR_PATH:-$HOME/.config/solana/new-wallet.json}"
RPC_URL="${SOLANA_RPC_URL:-https://api.devnet.solana.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v metaboss &> /dev/null; then
        log_error "metaboss is not installed. Install with: cargo install metaboss"
        exit 1
    fi
    
    if ! command -v solana &> /dev/null; then
        log_error "Solana CLI is not installed. Install from: https://docs.solana.com/cli/install-solana-cli-tools"
        exit 1
    fi
    
    if [[ ! -f "$KEYPAIR_PATH" ]]; then
        log_error "Keypair not found at: $KEYPAIR_PATH"
        log_info "Set SOLANA_KEYPAIR_PATH environment variable or ensure wallet exists"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Create metadata directory
setup_metadata_dir() {
    mkdir -p "$METADATA_DIR"
    log_info "Metadata directory ready: $METADATA_DIR"
}

# Generate metadata JSON for a DOCI manuscript
generate_metadata() {
    local mint_address="$1"
    local doci="$2"
    local title="$3"
    local description="$4"
    local ipfs_hash="$5"
    local author="$6"
    
    local metadata_file="$METADATA_DIR/${mint_address}.json"
    
    cat > "$metadata_file" << EOF
{
  "name": "DOCI: $title",
  "symbol": "DOCI",
  "description": "$description",
  "image": "https://fronsciers.com/api/manuscript/$doci/thumbnail.png",
  "external_url": "https://fronsciers.com/manuscript/$doci",
  "animation_url": "",
  "uri": "https://fronsciers.com/api/manuscript/$doci/metadata.json",
  "properties": {
    "files": [
      {
        "uri": "https://ipfs.io/ipfs/$ipfs_hash",
        "type": "application/pdf"
      }
    ],
    "category": "document"
  },
  "attributes": [
    {
      "trait_type": "DOCI",
      "value": "$doci"
    },
    {
      "trait_type": "Author",
      "value": "$author"
    },
    {
      "trait_type": "Publication Date",
      "value": "$(date -u +%Y-%m-%d)"
    },
    {
      "trait_type": "Category",
      "value": "Academic Manuscript"
    },
    {
      "trait_type": "Platform",
      "value": "Fronsciers"
    }
  ],
  "collection": {
    "name": "Fronsciers Published Manuscripts",
    "family": "DOCI"
  }
}
EOF
    
    log_success "Metadata generated: $metadata_file"
    echo "$metadata_file"
}

# Create NFT metadata using metaboss
create_metadata() {
    local mint_address="$1"
    local metadata_file="$2"
    
    log_info "Creating NFT metadata for mint: $mint_address"
    
    metaboss create metadata \
        --keypair "$KEYPAIR_PATH" \
        --rpc "$RPC_URL" \
        --mint "$mint_address" \
        --metadata "$metadata_file"
    
    if [[ $? -eq 0 ]]; then
        log_success "NFT metadata created successfully!"
        log_info "View on Solana Explorer: https://explorer.solana.com/address/$mint_address"
    else
        log_error "Failed to create NFT metadata"
        exit 1
    fi
}

# Update existing NFT metadata
update_metadata() {
    local mint_address="$1"
    local metadata_file="$2"
    
    log_info "Updating NFT metadata for mint: $mint_address"
    
    metaboss update metadata \
        --keypair "$KEYPAIR_PATH" \
        --rpc "$RPC_URL" \
        --mint "$mint_address" \
        --metadata "$metadata_file"
    
    if [[ $? -eq 0 ]]; then
        log_success "NFT metadata updated successfully!"
    else
        log_error "Failed to update NFT metadata"
        exit 1
    fi
}

# Show NFT metadata
show_metadata() {
    local mint_address="$1"
    
    log_info "Fetching NFT metadata for: $mint_address"
    
    metaboss decode mint \
        --rpc "$RPC_URL" \
        --mint "$mint_address"
}

# Batch create metadata for multiple mints
batch_create() {
    local csv_file="$1"
    
    if [[ ! -f "$csv_file" ]]; then
        log_error "CSV file not found: $csv_file"
        exit 1
    fi
    
    log_info "Processing batch metadata creation from: $csv_file"
    
    # Skip header line and process each row
    tail -n +2 "$csv_file" | while IFS=, read -r mint doci title description ipfs_hash author; do
        log_info "Processing: $mint"
        
        metadata_file=$(generate_metadata "$mint" "$doci" "$title" "$description" "$ipfs_hash" "$author")
        create_metadata "$mint" "$metadata_file"
        
        # Small delay to avoid rate limiting
        sleep 1
    done
    
    log_success "Batch processing completed!"
}

# Main command dispatcher
main() {
    case "$1" in
        "setup")
            check_dependencies
            setup_metadata_dir
            log_success "Setup completed!"
            ;;
        "create")
            if [[ $# -lt 7 ]]; then
                log_error "Usage: $0 create <mint> <doci> <title> <description> <ipfs_hash> <author>"
                exit 1
            fi
            check_dependencies
            setup_metadata_dir
            metadata_file=$(generate_metadata "$2" "$3" "$4" "$5" "$6" "$7")
            create_metadata "$2" "$metadata_file"
            ;;
        "update")
            if [[ $# -lt 3 ]]; then
                log_error "Usage: $0 update <mint> <metadata_file>"
                exit 1
            fi
            check_dependencies
            update_metadata "$2" "$3"
            ;;
        "show")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 show <mint>"
                exit 1
            fi
            check_dependencies
            show_metadata "$2"
            ;;
        "batch")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 batch <csv_file>"
                log_info "CSV format: mint,doci,title,description,ipfs_hash,author"
                exit 1
            fi
            check_dependencies
            setup_metadata_dir
            batch_create "$2"
            ;;
        *)
            echo "📚 Fronsciers NFT Metadata Manager (Metaboss)"
            echo ""
            echo "Usage: $0 <command> [args]"
            echo ""
            echo "Commands:"
            echo "  setup                                    - Check dependencies and setup"
            echo "  create <mint> <doci> <title> <desc> <ipfs> <author> - Create NFT metadata"
            echo "  update <mint> <metadata_file>            - Update existing NFT metadata"  
            echo "  show <mint>                              - Show current NFT metadata"
            echo "  batch <csv_file>                         - Batch create from CSV"
            echo ""
            echo "Examples:"
            echo "  $0 setup"
            echo "  $0 create 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \\"
            echo "           '10.fronsciers/manuscript.2024.0001' \\"
            echo "           'Revolutionary Research' \\"
            echo "           'A breakthrough study' \\"
            echo "           'QmExampleHash123' \\"
            echo "           '7igCaycjNjoRSSM5bCvXdEvA7LeMu6u9Db3KyvGrLuF7'"
            echo ""
            echo "  $0 show 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            echo ""
            echo "Environment Variables:"
            echo "  SOLANA_KEYPAIR_PATH - Path to Solana keypair (default: ~/.config/solana/new-wallet.json)"
            echo "  SOLANA_RPC_URL      - Solana RPC URL (default: https://api.devnet.solana.com)"
            echo ""
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 