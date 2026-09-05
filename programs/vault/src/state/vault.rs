use anchor_lang::prelude::*;


#[account]

pub struct VaultState {
    owner: Pubkey,
    vault_asset: Pubkey,
}