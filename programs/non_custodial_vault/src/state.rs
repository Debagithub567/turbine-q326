use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub authority: Pubkey,
    pub position_mint: Pubkey,
    pub share_mint: Pubkey,
    pub total_assets: u64,
    pub total_shares: u64,
    pub bump: u8,
}
